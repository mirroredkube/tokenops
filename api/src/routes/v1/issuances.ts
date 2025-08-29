import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../../adapters/index.js'
import { currencyToHex, isHexCurrency } from '../../utils/currency.js'
import { Asset, assets, issuances, validateAsset, generateIssuanceId, checkIdempotency, storeIdempotency } from './shared.js'
import prisma from '../../db/client.js'
import { issuanceWatcher } from '../../lib/issuanceWatcher.js'

// ---------- Validation Schemas ----------
const IssuanceSchema = z.object({
  to: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/),
  amount: z.string().regex(/^[0-9]{1,16}$/),
  complianceRef: z.object({
    recordId: z.string().min(1),
    sha256: z.string().min(1)
  }).optional(),
  anchor: z.boolean().default(true)
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
        to: issuance.to,
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
            status: { type: 'string' }
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

    const { to, amount, complianceRef, anchor } = body.data
    
    // Check idempotency
    const idempotencyKey = req.headers['idempotency-key'] as string
    const existingResponse = checkIdempotency(idempotencyKey)
    if (existingResponse) {
      return reply.status(202).send(existingResponse)
    }
    
    try {
      // Validate asset exists and is active
      const asset = await validateAsset(assetId)
      
      // Check compliance mode requirements
      if (asset.complianceMode === 'GATED_BEFORE' && !complianceRef) {
        return reply.status(422).send({ 
          error: 'Compliance record required for GATED_BEFORE mode' 
        })
      }
      
      const adapter = getLedgerAdapter()
      
      // Pre-flight checks
      const lines = await adapter.getAccountLines({ 
        account: to, 
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
      
      // Prepare memo for compliance anchoring
      let memoHex: string | undefined
      if (anchor && complianceRef) {
        const memoData = JSON.stringify({ 
          r: complianceRef.recordId, 
          h: complianceRef.sha256 
        })
        memoHex = Buffer.from(memoData, 'utf8').toString('hex').toUpperCase()
      }
      
      // Issue tokens
      const result = await adapter.issueToken({
        currencyCode: asset.code,
        amount,
        destination: to,
        metadata: anchor && complianceRef ? { 
          recordId: complianceRef.recordId, 
          sha256: complianceRef.sha256 
        } : undefined
      })
      
      const issuanceId = generateIssuanceId()
      
      // Store issuance record in database
      const issuance = await prisma.issuance.create({
        data: {
          id: issuanceId,
          assetId: asset.id,
          to,
          amount,
          complianceRef: complianceRef ? complianceRef : undefined,
          anchor,
          txId: result.txHash,
          explorer: `https://testnet.xrpl.org/transactions/${result.txHash}`,
          status: 'submitted'
        }
      })
      
      // Store for idempotency
      if (idempotencyKey) {
        storeIdempotency(idempotencyKey, {
          issuanceId: issuance.id,
          assetId: issuance.assetId,
          assetRef: asset.assetRef,
          to: issuance.to,
          amount: issuance.amount,
          complianceRef: complianceRef,
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
        to: issuance.to,
        amount: issuance.amount,
        complianceRef: complianceRef,
        txId: issuance.txId,
        explorer: issuance.explorer,
        status: issuance.status,
        createdAt: issuance.createdAt.toISOString()
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
