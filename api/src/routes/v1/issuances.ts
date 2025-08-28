import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../../adapters/index.js'
import { currencyToHex, isHexCurrency } from '../../utils/currency.js'
import { Asset, assets, issuances, validateAsset, generateIssuanceId, checkIdempotency, storeIdempotency } from './shared.js'
import prisma from '../../db/client.js'

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
      
      // Store issuance record
      const issuance = {
        issuanceId,
        assetId: asset.id,
        assetRef: asset.assetRef,
        to,
        amount,
        complianceRef,
        txId: result.txHash,
        explorer: `https://testnet.xrpl.org/transactions/${result.txHash}`,
        status: 'submitted',
        createdAt: new Date().toISOString()
      }
      
      issuances.set(issuanceId, issuance)
      
      // Store for idempotency
      if (idempotencyKey) {
        storeIdempotency(idempotencyKey, issuance)
      }
      
      return reply.status(202).send(issuance)
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
      description: 'Fetch issuance details and transaction status',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId', 'issuanceId'],
        properties: {
          assetId: { type: 'string', description: 'Asset ID' },
          issuanceId: { type: 'string', description: 'Issuance ID' }
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
            createdAt: { type: 'string' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId, issuanceId } = req.params as { assetId: string; issuanceId: string }
    
    try {
      // Validate asset exists
      const asset = await validateAsset(assetId)
      
      // Get issuance
      const issuance = issuances.get(issuanceId)
      if (!issuance || issuance.assetId !== assetId) {
        return reply.status(404).send({ error: 'Issuance not found' })
      }
      
      return reply.send(issuance)
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
      const assetIssuances = Array.from(issuances.values())
        .filter(issuance => issuance.assetId === assetId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      // Pagination
      const total = assetIssuances.length
      const paginatedIssuances = assetIssuances.slice(offset, offset + limit)
      
      return reply.send({
        issuances: paginatedIssuances.map(issuance => ({
          issuanceId: issuance.issuanceId,
          assetId: issuance.assetId,
          to: issuance.to,
          amount: issuance.amount,
          txId: issuance.txId,
          status: issuance.status,
          createdAt: issuance.createdAt
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
}
