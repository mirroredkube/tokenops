import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../../adapters/index.js'
import { currencyToHex, isHexCurrency } from '../../utils/currency.js'
import { Asset, assets, issuances, validateAsset, generateIssuanceId, checkIdempotency, storeIdempotency } from './shared.js'
import prisma from '../../db/client.js'
import { issuanceWatcher } from '../../lib/issuanceWatcher.js'
import { policyKernel, PolicyFacts } from '../../lib/policyKernel.js'
import { ComplianceManifestBuilder } from '../../lib/complianceManifest.js'
import { RequirementSnapshotService } from '../../lib/requirementSnapshot.js'

// ---------- Validation Schemas ----------
const IssuanceSchema = z.object({
  holder: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/),
  amount: z.string().regex(/^[0-9]{1,16}$/),
  issuanceFacts: z.object({
    purpose: z.string().optional(),
    isin: z.string().optional(),
    legal_issuer: z.string().optional(),
    jurisdiction: z.string().optional(),
    mica_class: z.string().optional(),
    kyc_requirement: z.string().optional(),
    transfer_restrictions: z.string().optional(),
    max_transfer_amount: z.string().optional(),
    expiration_date: z.string().optional(),
    tranche_series: z.string().optional(),
    references: z.array(z.string()).optional()
  }).optional(),
  anchor: z.boolean().default(false)
})

export default async function issuanceRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // 0. GET /v1/issuances - List all issuances (for dashboard)
  app.get('/issuances', {
    schema: {
      summary: 'List all issuances across assets',
      description: 'Get all token issuances for dashboard and reporting',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', pattern: '^[0-9]{1,3}$', default: '50' },
          offset: { type: 'string', pattern: '^[0-9]+$', default: '0' },
          status: { type: 'string', enum: ['pending', 'submitted', 'validated', 'failed'] },
          assetId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  assetId: { type: 'string' },
                  assetRef: { type: 'string' },
                  to: { type: 'string' },
                  amount: { type: 'string' },
                  txId: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' }
                }
              }
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        }
      }
    }
  }, async (req, reply) => {
    const { limit = '50', offset = '0', status, assetId } = req.query as any
    
    const where: any = {}
    if (status) where.status = status
    if (assetId) where.assetId = assetId
    
    const [issuances, total] = await Promise.all([
      prisma.issuance.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          asset: {
            select: {
              assetRef: true,
              code: true
            }
          }
        }
      }),
      prisma.issuance.count({ where })
    ])
    
    return reply.send({
      items: issuances.map(issuance => ({
        id: issuance.id,
        assetId: issuance.assetId,
        assetRef: issuance.asset.assetRef,
        holder: issuance.holder,
        amount: issuance.amount,
        txId: issuance.txId,
        status: issuance.status,
        createdAt: issuance.createdAt.toISOString(),
        updatedAt: issuance.updatedAt.toISOString()
      })),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  })

  // 1. POST /v1/assets/{assetId}/issuances - Create issuance
  app.post('/assets/:assetId/issuances', {
    schema: {
      summary: 'Issue tokens to a holder',
      description: 'Issue tokens with optional compliance anchoring',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId'],
        properties: {
          assetId: { type: 'string', description: 'Asset ID' }
        }
      },
      body: {
        type: 'object',
        required: ['to', 'amount'],
        properties: {
          to: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$', description: 'Recipient address' },
          amount: { type: 'string', pattern: '^[0-9]{1,16}$', description: 'Amount to issue' },
          complianceRef: {
            type: 'object',
            properties: {
              recordId: { type: 'string' },
              sha256: { type: 'string' }
            },
            description: 'Compliance record reference'
          },
          anchor: { type: 'boolean', default: true, description: 'Anchor compliance data to blockchain' }
        }
      },
      response: {
        202: {
          type: 'object',
          properties: {
            issuanceId: { type: 'string' },
            assetId: { type: 'string' },
            assetRef: { type: 'string' },
            to: { type: 'string' },
            amount: { type: 'string' },
            complianceRef: {
              type: 'object',
              properties: {
                recordId: { type: 'string' },
                sha256: { type: 'string' }
              }
            },
            txId: { type: 'string' },
            explorer: { type: 'string' },
            status: { type: 'string' },
            compliance: {
              type: 'object',
              properties: {
                evaluated: { type: 'boolean' },
                status: { type: 'string' },
                requirementCount: { type: 'number' },
                requirements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      status: { type: 'string' },
                      template: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          regime: { type: 'string' }
                        }
                      }
                    }
                  }
                },
                enforcementPlan: { type: 'object' }
              }
            }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        422: { type: 'object', properties: { error: { type: 'string' } } },
        502: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId } = req.params as { assetId: string }
    const body = IssuanceSchema.safeParse(req.body)
    
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body' })
    }

    const { holder, amount, issuanceFacts, anchor } = body.data
    
    // Check idempotency
    const idempotencyKey = req.headers['idempotency-key'] as string
    const existingResponse = checkIdempotency(idempotencyKey)
    if (existingResponse) {
      return reply.status(202).send(existingResponse)
    }
    
    try {
      // Validate asset exists and is active
      const asset = await validateAsset(assetId)
      
      // Get asset with product and organization for compliance evaluation
      const assetWithContext = await prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          product: {
            include: {
              organization: true
            }
          }
        }
      })
      
      if (!assetWithContext) {
        return reply.status(404).send({ error: 'Asset not found' })
      }

      // Initialize services for unified compliance design
      const snapshotService = new RequirementSnapshotService(prisma)
      const manifestBuilder = new ComplianceManifestBuilder(prisma)
      
      // Validate that all required requirements are satisfied
      const validation = await snapshotService.validateIssuanceRequirements(assetId)
      if (!validation.valid) {
        return reply.status(422).send({ 
          error: 'Issuance blocked by compliance requirements',
          blockedRequirements: validation.blockedRequirements
        })
      }
      
      const adapter = getLedgerAdapter()
      
      // Pre-flight checks
      const lines = await adapter.getAccountLines({ 
        account: holder, 
        peer: asset.issuer, 
        ledger_index: 'validated' 
      })
      
      const line = lines.find((l: any) => {
        const lineCurrency = l.currency?.toUpperCase()
        
        if (isHexCurrency(asset.code)) {
          return lineCurrency === asset.code
        } else {
          return lineCurrency === asset.code || lineCurrency === currencyToHex(asset.code)
        }
      })
      
      if (!line) {
        return reply.status(422).send({ error: 'Trustline does not exist' })
      }
      
      if (Number(line.limit) < Number(amount)) {
        return reply.status(422).send({ error: 'Amount exceeds trustline limit' })
      }
      
      // Issue tokens
      const result = await adapter.issueToken({
        currencyCode: asset.code,
        amount,
        destination: holder
      })
      
      const issuanceId = generateIssuanceId()
      
      // Store issuance record in database
      const issuance = await prisma.issuance.create({
        data: {
          id: issuanceId,
          assetId: asset.id,
          holder,
          amount,
          anchor,
          txId: result.txHash,
          explorer: `https://testnet.xrpl.org/transactions/${result.txHash}`,
          status: 'SUBMITTED',
          complianceEvaluated: false,
          complianceStatus: 'PENDING'
        }
      })
      
      // Create snapshot of live requirements for this issuance
      await snapshotService.createIssuanceSnapshot(assetId, issuance.id)
      
      // Build compliance manifest and generate hash
      let manifest = null
      let manifestHash = null
      
      try {
        manifest = await manifestBuilder.buildManifest(issuance.id, issuanceFacts || {})
        manifestHash = manifestBuilder.generateManifestHash(manifest)
        
        // Update issuance with manifest and hash
        await prisma.issuance.update({
          where: { id: issuance.id },
          data: {
            complianceRef: manifest as any,
            manifestHash,
            complianceEvaluated: true,
            complianceStatus: 'READY'
          }
        })
        
        console.log(`✅ Created compliance manifest for issuance ${issuance.id}`)
      } catch (manifestError: any) {
        console.error('⚠️ Failed to create compliance manifest:', manifestError)
        // Don't fail issuance if manifest creation fails
      }
      
      // Get snapshot requirements for response
      const requirementInstances = await snapshotService.getIssuanceSnapshot(issuance.id)
      
      // Store for idempotency
      if (idempotencyKey) {
        storeIdempotency(idempotencyKey, {
          issuanceId: issuance.id,
          assetId: issuance.assetId,
          assetRef: asset.assetRef,
          holder: issuance.holder,
          amount: issuance.amount,
          manifestHash,
          txId: issuance.txId,
          explorer: issuance.explorer,
          status: issuance.status,
          createdAt: issuance.createdAt.toISOString()
        })
      }
      
      return reply.status(202).send({
        issuanceId: issuance.id,
        assetId: issuance.assetId,
        assetRef: asset.assetRef,
        holder: issuance.holder,
        amount: issuance.amount,
        manifestHash,
        txId: issuance.txId,
        explorer: issuance.explorer,
        status: issuance.status,
        createdAt: issuance.createdAt.toISOString(),
        compliance: {
          evaluated: issuance.complianceEvaluated,
          status: issuance.complianceStatus,
          requirementCount: requirementInstances.length,
          requirements: requirementInstances.map(instance => ({
            id: instance.id,
            status: instance.status,
            template: {
              id: instance.requirementTemplate.id,
              name: instance.requirementTemplate.name,
              regime: instance.requirementTemplate.regime.name
            }
          })),
          manifest: manifest
        }
      })
    } catch (error: any) {
      console.error('Error issuing tokens:', error)
      
      if (error.message === 'Asset not found') {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      if (error.message.includes('must be active')) {
        return reply.status(422).send({ error: error.message })
      }
      
      return reply.status(502).send({ error: 'Ledger connection error' })
    }
  })

  // 2. GET /v1/assets/{assetId}/issuances/{issuanceId} - Get issuance status
  app.get('/assets/:assetId/issuances/:issuanceId', {
    schema: {
      summary: 'Get issuance status',
      description: 'Fetch issuance details and transaction status with optional refresh',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId', 'issuanceId'],
        properties: {
          assetId: { type: 'string', description: 'Asset ID' },
          issuanceId: { type: 'string', description: 'Issuance ID' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          refresh: { type: 'boolean', description: 'Refresh status from ledger' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            issuanceId: { type: 'string' },
            assetId: { type: 'string' },
            assetRef: { type: 'string' },
            to: { type: 'string' },
            amount: { type: 'string' },
            complianceRef: {
              type: 'object',
              properties: {
                recordId: { type: 'string' },
                sha256: { type: 'string' }
              }
            },
            txId: { type: 'string' },
            explorer: { type: 'string' },
            status: { type: 'string' },
            validatedAt: { type: 'string' },
            validatedLedgerIndex: { type: 'number' },
            failureCode: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId, issuanceId } = req.params as { assetId: string; issuanceId: string }
    const { refresh } = req.query as { refresh?: boolean }
    
    try {
      // Validate asset exists
      const asset = await validateAsset(assetId)
      
      // Get issuance
      const issuance = await prisma.issuance.findUnique({
        where: { id: issuanceId }
      })
      if (!issuance || issuance.assetId !== assetId) {
        return reply.status(404).send({ error: 'Issuance not found' })
      }
      
      // If refresh is requested and status is submitted, check ledger
      if (refresh && issuance.status === 'submitted' && issuance.txId) {
        await issuanceWatcher.refreshIssuanceStatus(issuanceId)
        
        // Fetch updated issuance data
        const updatedIssuance = await prisma.issuance.findUnique({
          where: { id: issuanceId }
        })
        if (updatedIssuance) {
          issuance.status = updatedIssuance.status
          issuance.validatedAt = updatedIssuance.validatedAt
          issuance.validatedLedgerIndex = updatedIssuance.validatedLedgerIndex
          issuance.failureCode = updatedIssuance.failureCode
          issuance.updatedAt = updatedIssuance.updatedAt
        }
      }
      
      return reply.send({
        issuanceId: issuance.id,
        assetId: issuance.assetId,
        assetRef: asset.assetRef,
        to: issuance.to,
        amount: issuance.amount,
        complianceRef: issuance.complianceRef as any,
        txId: issuance.txId,
        explorer: issuance.explorer,
        status: issuance.status,
        validatedAt: issuance.validatedAt?.toISOString(),
        validatedLedgerIndex: issuance.validatedLedgerIndex ? Number(issuance.validatedLedgerIndex) : undefined,
        failureCode: issuance.failureCode,
        createdAt: issuance.createdAt.toISOString(),
        updatedAt: issuance.updatedAt.toISOString()
      })
    } catch (error: any) {
      console.error('Error getting issuance:', error)
      
      if (error.message === 'Asset not found') {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      if (error.message.includes('must be active')) {
        return reply.status(422).send({ error: error.message })
      }
      
      return reply.status(502).send({ error: 'Ledger connection error' })
    }
  })

  // 3. GET /v1/assets/{assetId}/issuances - List issuances
  app.get('/assets/:assetId/issuances', {
    schema: {
      summary: 'List issuances for an asset',
      description: 'Get all issuances for a specific asset',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId'],
        properties: {
          assetId: { type: 'string', description: 'Asset ID' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            issuances: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  issuanceId: { type: 'string' },
                  assetId: { type: 'string' },
                  to: { type: 'string' },
                  amount: { type: 'string' },
                  txId: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' }
                }
              }
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId } = req.params as { assetId: string }
    const { limit = 50, offset = 0 } = req.query as any
    
    try {
      // Validate asset exists
      const asset = await validateAsset(assetId)
      
      // Filter issuances by asset
      const assetIssuances = await prisma.issuance.findMany({
        where: { assetId: asset.id },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      })
      
      // Pagination
      const total = await prisma.issuance.count({ where: { assetId: asset.id } })
      
      return reply.send({
        issuances: assetIssuances.map(issuance => ({
          issuanceId: issuance.id,
          assetId: issuance.assetId,
          to: issuance.to,
          amount: issuance.amount,
          txId: issuance.txId,
          status: issuance.status,
          createdAt: issuance.createdAt.toISOString()
        })),
        total,
        limit,
        offset
      })
    } catch (error: any) {
      console.error('Error listing issuances:', error)
      
      if (error.message === 'Asset not found') {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      if (error.message.includes('must be active')) {
        return reply.status(422).send({ error: error.message })
      }
      
      return reply.status(502).send({ error: 'Ledger connection error' })
    }
  })

  // 4. GET /v1/issuances/by-compliance/:recordId - List issuances by compliance record
  app.get('/issuances/by-compliance/:recordId', {
    schema: {
      summary: 'List issuances that reference a compliance record',
      description: 'Get all issuances that reference a specific compliance record',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['recordId'],
        properties: {
          recordId: { type: 'string', description: 'Compliance record ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            issuances: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  assetId: { type: 'string' },
                  assetRef: { type: 'string' },
                  to: { type: 'string' },
                  amount: { type: 'string' },
                  txId: { type: 'string' },
                  explorer: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' }
                }
              }
            }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { recordId } = req.params as { recordId: string }
    
    try {
      // Find issuances that reference this compliance record
      const issuances = await prisma.issuance.findMany({
        where: {
          complianceRef: {
            path: ['recordId'],
            equals: recordId
          }
        },
        include: {
          asset: {
            select: {
              assetRef: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      return reply.send({
        issuances: issuances.map(issuance => ({
          id: issuance.id,
          assetId: issuance.assetId,
          assetRef: issuance.asset.assetRef,
          to: issuance.to,
          amount: issuance.amount,
          txId: issuance.txId,
          explorer: issuance.explorer,
          status: issuance.status,
          createdAt: issuance.createdAt.toISOString()
        }))
      })
    } catch (error: any) {
      console.error('Error fetching issuances by compliance record:', error)
      return reply.status(500).send({ error: 'Failed to fetch issuances' })
    }
  })
}
