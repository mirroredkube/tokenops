import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../../adapters/index.js'
import { currencyToHex, isHexCurrency } from '../../utils/currency.js'
import { Asset, assets, issuances, validateAsset, generateIssuanceId, checkIdempotency, storeIdempotency } from './shared.js'
import { computeAssetReadiness } from '../../lib/readiness.js'
import prisma from '../../db/client.js'
import { issuanceWatcher } from '../../lib/issuanceWatcher.js'
import { policyKernel, PolicyFacts } from '../../lib/policyKernel.js'
import { ComplianceManifestBuilder } from '../../lib/complianceManifest.js'
import { RequirementSnapshotService } from '../../lib/requirementSnapshot.js'
import { tenantMiddleware, TenantRequest, requireActiveTenant } from '../../middleware/tenantMiddleware.js'

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
  anchor: z.boolean().default(false),
  publicMetadata: z.record(z.any()).optional()
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
                  holder: { type: 'string' },
                  amount: { type: 'string' },
                  txId: { type: 'string' },
                  status: { type: 'string' },
                  complianceRef: { type: 'object' },
                  complianceStatus: { type: 'string' },
                  manifestHash: { type: 'string' },
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
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    const { limit = '50', offset = '0', status, assetId } = req.query as any
    
    const where: any = {
      asset: {
        product: {
          organizationId: req.tenant!.id // Scope to tenant's organization
        }
      }
    }
    if (status) {
      // Map old status values to new enum values
      const statusMap: Record<string, string> = {
        'pending': 'PENDING',
        'submitted': 'SUBMITTED', 
        'validated': 'VALIDATED',
        'failed': 'FAILED',
        'expired': 'EXPIRED'
      }
      where.status = statusMap[status] || status
    }
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
        to: (issuance as any).holder, // Backward compatibility
        holder: (issuance as any).holder,
        amount: issuance.amount,
        txId: issuance.txId,
        status: issuance.status,
        complianceRef: (issuance as any).complianceRef,
        complianceStatus: (issuance as any).complianceStatus,
        manifestHash: (issuance as any).manifestHash,
        createdAt: issuance.createdAt.toISOString(),
        updatedAt: issuance.updatedAt.toISOString()
      })),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  })

  
  // 1. GET /v1/issuances/{id} - Get individual issuance details
  app.get('/issuances/:id', {
    schema: {
      summary: 'Get individual issuance details',
      description: 'Get detailed information about a specific token issuance',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Issuance ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assetId: { type: 'string' },
            assetRef: { type: 'string' },
            holder: { type: 'string' },
            amount: { type: 'string' },
            txId: { type: 'string' },
            status: { type: 'string' },
            complianceRef: { type: 'object' },
            complianceStatus: { type: 'string' },
            manifestHash: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    const { id } = req.params as { id: string }
    
    try {
      const issuance = await prisma.issuance.findUnique({
        where: { 
          id,
          asset: {
            product: {
              organizationId: req.tenant!.id // Ensure issuance belongs to tenant
            }
          }
        },
        include: {
          asset: {
            select: {
              assetRef: true,
              code: true
            }
          }
        }
      })
      
      if (!issuance) {
        return reply.status(404).send({ error: 'Issuance not found' })
      }
      
      return reply.send({
        id: issuance.id,
        assetId: issuance.assetId,
        assetRef: issuance.asset.assetRef,
        holder: (issuance as any).holder,
        amount: issuance.amount,
        txId: issuance.txId,
        status: issuance.status,
        complianceRef: (issuance as any).complianceRef,
        complianceStatus: (issuance as any).complianceStatus,
        manifestHash: (issuance as any).manifestHash,
        createdAt: issuance.createdAt.toISOString(),
        updatedAt: issuance.updatedAt.toISOString()
      })
    } catch (error: any) {
      console.error('Error fetching issuance:', error)
      return reply.status(500).send({ error: 'Failed to fetch issuance' })
    }
  })

  // 2. POST /v1/assets/{assetId}/issuances - Create issuance
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
        required: ['holder', 'amount'],
        properties: {
          holder: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$', description: 'Recipient address' },
          amount: { type: 'string', pattern: '^[0-9]{1,16}$', description: 'Amount to issue' },
          issuanceFacts: {
            type: 'object',
            properties: {
              purpose: { type: 'string' },
              isin: { type: 'string' },
              legal_issuer: { type: 'string' },
              jurisdiction: { type: 'string' },
              mica_class: { type: 'string' },
              kyc_requirement: { type: 'string' },
              transfer_restrictions: { type: 'string' },
              max_transfer_amount: { type: 'string' },
              expiration_date: { type: 'string' },
              tranche_series: { type: 'string' },
              references: { type: 'array', items: { type: 'string' } }
            },
            description: 'Compliance facts for issuance'
          },
          anchor: { type: 'boolean', default: false, description: 'Anchor compliance data to blockchain' }
        }
      },
                response: {
            202: {
              type: 'object',
              properties: {
                issuanceId: { type: 'string' },
                assetId: { type: 'string' },
                assetRef: { type: 'string' },
                holder: { type: 'string' },
                amount: { type: 'string' },
                manifest: {
                  type: 'object',
                  properties: {
                    manifestHash: { type: 'string' },
                    manifestVersion: { type: 'string' }
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
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    const { assetId } = req.params as { assetId: string }
    const body = IssuanceSchema.safeParse(req.body)
    
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body' })
    }

    const { holder, amount, issuanceFacts, anchor, publicMetadata } = body.data
    
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
        where: { 
          id: assetId,
          product: {
            organizationId: req.tenant!.id // Ensure asset belongs to tenant
          }
        },
        include: {
          product: {
            include: {
              organization: true
            }
          }
        }
      })
      
      if (!assetWithContext) {
        return reply.status(404).send({ error: 'Asset not found or not accessible' })
      }

      // Initialize services for unified compliance design
      const snapshotService = new RequirementSnapshotService(prisma)
      const manifestBuilder = new ComplianceManifestBuilder(prisma)
      
      // MVP readiness validation (policy-light)
      const readiness = await computeAssetReadiness(assetId)
      if (!readiness.ok) {
        return reply.status(422).send({ 
          error: 'Issuance blocked by readiness checks',
          blockers: readiness.blockers
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
      
      const issuanceId = generateIssuanceId()
      
      // Store issuance record in database first
      const issuance = await prisma.issuance.create({
        data: {
          id: issuanceId,
          assetId: asset.id,
          holder,
          amount,
          anchor,
          status: 'SUBMITTED',
          complianceEvaluated: false,
          complianceStatus: 'PENDING'
        } as any
      })
      
      // Link existing authorizations to this issuance
      await prisma.authorization.updateMany({
        where: {
          assetId: asset.id,
          holder: holder,
          issuanceId: null // Only link authorizations that aren't already linked
        },
        data: {
          issuanceId: issuance.id
        }
      })
      
      // Create snapshot of live requirements for this issuance
      await snapshotService.createIssuanceSnapshot(assetId, issuance.id)
      
      // Build compliance manifest and generate hash after issuance exists
      let manifest = null
      let manifestHash = null
      
      try {
        manifest = await manifestBuilder.buildManifest(issuance.id, issuanceFacts || {})
        // Attach MVP readiness decision to manifest for audit
        if (manifest) {
          (manifest as any).readiness = readiness
        }
        manifestHash = manifestBuilder.generateManifestHash(manifest)
        console.log(`✅ Created compliance manifest for issuance ${issuance.id}`)
      } catch (manifestError: any) {
        console.error('⚠️ Failed to create compliance manifest:', manifestError)
        // Don't fail issuance if manifest creation fails
      }
      
      // Prepare memos for blockchain transaction
      const memos = []
      
      // Add compliance hash memo if anchoring is requested
      if (anchor && manifestHash) {
        memos.push(`COMPLIANCE_HASH:${manifestHash}`)
      }
      
      // Add public metadata memo if provided
      if (publicMetadata && Object.keys(publicMetadata).length > 0) {
        const metadataJson = JSON.stringify(publicMetadata)
        memos.push(`PUBLIC_METADATA:${metadataJson}`)
      }
      
      // Combine memos or use undefined if no memos
      const memoHex = memos.length > 0 ? memos.join(' | ') : undefined
      
      console.log('🔍 Submitting transaction to XRPL with memoHex:', memoHex)
      
      const result = await (adapter as any).issue({
        to: holder,
        asset: {
          ledger: asset.ledger.toLowerCase() as any,
          code: asset.code,
          issuer: asset.issuer
        },
        amount,
        memoHex
      })
      
      console.log('✅ XRPL transaction result:', result)
      console.log('🔍 Transaction ID:', result.txid)
      
      // Update issuance with transaction details and manifest
      await prisma.issuance.update({
        where: { id: issuance.id },
        data: {
          txId: result.txid,
          explorer: `https://testnet.xrpl.org/transactions/${result.txid}`,
          ...(manifest && manifestHash ? {
            complianceRef: manifest as any,
            manifestHash: manifestHash as any,
            complianceEvaluated: true,
            complianceStatus: 'READY'
          } : {})
        } as any
      })
      
      console.log('✅ Updated issuance with txId:', result.txid)
      
      // Get snapshot requirements for response
      const requirementInstances = await snapshotService.getIssuanceSnapshot(issuance.id)
      
      // Store for idempotency
      if (idempotencyKey) {
        storeIdempotency(idempotencyKey, {
          issuanceId: issuance.id,
          assetId: issuance.assetId,
          assetRef: asset.assetRef,
          holder: (issuance as any).holder,
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
        holder: (issuance as any).holder,
        amount: issuance.amount,
        manifestHash,
        txId: result.txid,
        explorer: `https://testnet.xrpl.org/transactions/${result.txid}`,
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

  // 2a. POST /v1/assets/{assetId}/preflight - Readiness preflight (MVP)
  app.post('/assets/:assetId/preflight', {
    schema: {
      summary: 'Validate readiness for issuance (MVP)',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId'],
        properties: { assetId: { type: 'string' } }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            blockers: { type: 'array', items: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, hint: { type: 'string' } } } },
            facts: { type: 'object' }
          }
        }
      }
    }
  }, async (req, reply) => {
    const { assetId } = req.params as { assetId: string }
    try {
      const result = await computeAssetReadiness(assetId)
      return reply.status(200).send(result)
    } catch (e: any) {
      return reply.status(500).send({ ok: false, blockers: [{ code: 'INTERNAL', message: 'Preflight failed' }] })
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
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    const { assetId, issuanceId } = req.params as { assetId: string; issuanceId: string }
    const { refresh } = req.query as { refresh?: boolean }
    
    try {
      // Validate asset exists and belongs to tenant
      const asset = await prisma.asset.findUnique({
        where: { 
          id: assetId,
          product: {
            organizationId: req.tenant!.id // Ensure asset belongs to tenant
          }
        }
      })
      
      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found or not accessible' })
      }
      
      // Get issuance
      const issuance = await prisma.issuance.findUnique({
        where: { 
          id: issuanceId,
          assetId: assetId // Ensure issuance belongs to the asset
        }
      })
      if (!issuance || issuance.assetId !== assetId) {
        return reply.status(404).send({ error: 'Issuance not found' })
      }
      
      // If refresh is requested and status is submitted, check ledger
      if (refresh && issuance.status === 'SUBMITTED' && issuance.txId) {
        await issuanceWatcher.refreshIssuanceStatus(issuanceId)
        
        // Fetch updated issuance data
        const updatedIssuance = await prisma.issuance.findUnique({
          where: { id: issuanceId }
        })
        if (updatedIssuance) {
          issuance.status = updatedIssuance.status
          issuance.updatedAt = updatedIssuance.updatedAt
        }
      }
      
      return reply.send({
        issuanceId: issuance.id,
        assetId: issuance.assetId,
        assetRef: asset.assetRef,
        holder: (issuance as any).holder,
        amount: issuance.amount,
        complianceRef: issuance.complianceRef as any,
        txId: issuance.txId,
        explorer: issuance.explorer,
        status: issuance.status,
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
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    const { assetId } = req.params as { assetId: string }
    const { limit = 50, offset = 0 } = req.query as any
    
    try {
      // Validate asset exists and belongs to tenant
      const asset = await prisma.asset.findUnique({
        where: { 
          id: assetId,
          product: {
            organizationId: req.tenant!.id // Ensure asset belongs to tenant
          }
        }
      })
      
      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found or not accessible' })
      }
      
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
          holder: (issuance as any).holder,
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
          holder: (issuance as any).holder,
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
