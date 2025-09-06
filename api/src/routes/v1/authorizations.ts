import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { getLedgerAdapter } from '../../adapters/index.js'
import { currencyToHex, isHexCurrency, hexCurrencyToAscii } from '../../utils/currency.js'
import { Asset, assets, validateAsset } from './shared.js'
import prisma from '../../db/client.js'

// ---------- Validation Schemas ----------
const AuthorizationRequestSchema = z.object({
  params: z.object({
    limit: z.string().regex(/^[0-9]{1,16}$/).optional(),
    holderAddress: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/),
    currencyCode: z.string().min(1),
    issuerAddress: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/),
    noRipple: z.boolean().default(false),
    requireAuth: z.boolean().default(false),
    expiresAt: z.string().datetime().optional(), // ISO string
    callbackUrl: z.string().url().optional()
  }),
  signing: z.object({
    mode: z.enum(['wallet']).default('wallet') // Always wallet mode for security
  }).optional()
})

export default async function authorizationRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // 0. GET /v1/authorizations - List all authorizations
  app.get('/authorizations', {
    schema: {
      summary: 'List all authorizations',
      description: 'Get a paginated list of all authorization records',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
          offset: { type: 'number', default: 0, minimum: 0 },
          status: { type: 'string', enum: ['PENDING', 'SUBMITTED', 'VALIDATED', 'FAILED', 'EXPIRED'] },
          assetId: { type: 'string' },
          holder: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            authorizations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  assetId: { type: 'string' },
                  holder: { type: 'string' },
                  limit: { type: 'string' },
                  txId: { type: 'string' },
                  explorer: { type: 'string' },
                  status: { type: 'string' },
                  validatedAt: { type: 'string' },
                  noRipple: { type: 'boolean' },
                  requireAuth: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  asset: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      code: { type: 'string' },
                      assetRef: { type: 'string' },
                      ledger: { type: 'string' },
                      network: { type: 'string' }
                    }
                  }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' },
                hasMore: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
    const { limit = 20, offset = 0, status, assetId, holder } = req.query as {
      limit?: number
      offset?: number
      status?: string
      assetId?: string
      holder?: string
    }
    
    try {
      // Build where clause
      const where: any = {}
      if (status) where.status = status
      if (assetId) where.assetId = assetId
      if (holder) where.holder = holder
      
      // Get authorizations with asset details
      const [authorizations, total] = await Promise.all([
        prisma.authorization.findMany({
          where,
          include: {
            asset: {
              select: {
                id: true,
                code: true,
                assetRef: true,
                ledger: true,
                network: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.authorization.count({ where })
      ])
      
      return reply.send({
        authorizations,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      })
    } catch (error: any) {
      console.error('Error fetching authorizations:', error)
      return reply.status(500).send({ error: 'Failed to fetch authorizations' })
    }
  })
  // 1. GET /v1/assets/{assetId}/authorizations/{holder} - Check authorization status
  app.get('/assets/:assetId/authorizations/:holder', {
    schema: {
      summary: 'Get authorization status for a holder and asset',
      description: 'Check if a holder has been authorized for an asset (XRPL = trustline)',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId', 'holder'],
        properties: {
          assetId: { type: 'string', description: 'Asset ID' },
          holder: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$', description: 'Holder account address' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            assetId: { type: 'string' },
            assetRef: { type: 'string' },
            holder: { type: 'string' },
            exists: { type: 'boolean' },
            details: {
              type: 'object',
              properties: {
                limit: { type: 'string' },
                balance: { type: 'string' },
                authorized: { type: 'boolean' }
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
    const { assetId, holder } = req.params as { assetId: string; holder: string }
    
    try {
      // Validate asset exists and is active
      const asset = await validateAsset(assetId)
      
      const adapter = getLedgerAdapter()
      const lines = await adapter.getAccountLines({ 
        account: holder, 
        peer: asset.issuer, 
        ledger_index: 'validated' 
      })
      
      // Find the specific currency line
      const line = lines.find((l: any) => {
        const lineCurrency = l.currency?.toUpperCase()
        
        if (isHexCurrency(asset.code)) {
          return lineCurrency === asset.code
        } else {
          return lineCurrency === asset.code || lineCurrency === currencyToHex(asset.code)
        }
      })
      
      if (!line) {
        return reply.send({
          assetId: asset.id,
          assetRef: asset.assetRef,
          holder,
          exists: false
        })
      }
      
      return reply.send({
        assetId: asset.id,
        assetRef: asset.assetRef,
        holder,
        exists: true,
        details: {
          limit: line.limit,
          balance: line.balance,
          authorized: line.authorized || false
        }
      })
    } catch (error: any) {
      console.error('Error checking authorization status:', error)
      
      if (error.message === 'Asset not found') {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      if (error.message.includes('must be active')) {
        return reply.status(422).send({ error: error.message })
      }
      
      return reply.status(502).send({ error: 'Ledger connection error' })
    }
  })

  // 2. PUT /v1/assets/{assetId}/authorizations/{holder} - Create/update authorization
  app.put('/assets/:assetId/authorizations/:holder', {
    schema: {
      summary: 'Create authorization request for holder',
      description: 'Create a secure authorization request that generates a URL for the holder to set up their trustline using their own wallet. Never handles private keys.',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId', 'holder'],
        properties: {
          assetId: { type: 'string' },
          holder: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$' }
        }
      },
      body: {
        type: 'object',
        properties: {
          params: {
            type: 'object',
            required: ['holderAddress', 'currencyCode', 'issuerAddress'],
            properties: {
              limit: { type: 'string', pattern: '^[0-9]{1,16}$' },
              holderAddress: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$' },
              currencyCode: { type: 'string', minLength: 1 },
              issuerAddress: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$' },
              noRipple: { type: 'boolean', default: false },
              requireAuth: { type: 'boolean', default: false },
              expiresAt: { type: 'string', format: 'date-time' },
              callbackUrl: { type: 'string', format: 'uri' }
            }
          },
          signing: {
            type: 'object',
            properties: {
              mode: { type: 'string', enum: ['wallet'], default: 'wallet' }
            }
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assetId: { type: 'string' },
            assetRef: { type: 'string' },
            holder: { type: 'string' },
            currency: { type: 'string' },
            issuerAddress: { type: 'string' },
            limit: { type: 'string' },
            status: { type: 'string' },
            authUrl: { type: 'string' },
            expiresAt: { type: 'string' },
            oneTimeToken: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        422: { type: 'object', properties: { error: { type: 'string' }, reason: { type: 'string' } } },
        502: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId, holder } = req.params as { assetId: string; holder: string }
    const body = AuthorizationRequestSchema.safeParse(req.body)
    
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.errors })
    }

    const { params, signing } = body.data
    const limit = params.limit || '1000000000' // Safe high default
    const mode = signing?.mode || 'wallet'
    
    // Security: Always use wallet mode, never handle private keys
    if (mode !== 'wallet') {
      return reply.status(400).send({ 
        error: 'Only wallet signing mode is supported for security. Private keys are never handled.' 
      })
    }
    
    try {
      // Validate asset exists and is active
      const asset = await validateAsset(assetId)
      
      // Generate secure one-time token for authorization URL
      const oneTimeToken = crypto.randomUUID()
      
      // Set expiration time (default 24 hours from now)
      const expiresAt = params.expiresAt 
        ? new Date(params.expiresAt)
        : new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      // Generate authorization URL
      const baseUrl = process.env.PUBLIC_AUTH_BASE_URL || 'http://localhost:3000'
      const authUrl = `${baseUrl}/auth/authorize/${oneTimeToken}`
      
      // Create authorization request in database
      const authorization = await prisma.authorization.create({
        data: {
          assetId: asset.id,
          holder: params.holderAddress,
          limit,
          status: 'PENDING', // Start as INVITED/PENDING
          // TODO: Uncomment after database migration
          // currency: params.currencyCode,
          // issuerAddress: params.issuerAddress,
          // expiresAt,
          // oneTimeToken,
          // callbackUrl: params.callbackUrl,
          // requestedLimit: limit,
          // authUrl,
          noRipple: params.noRipple,
          requireAuth: params.requireAuth,
          metadata: {
            ledger: asset.ledger,
            network: asset.network,
            currencyCode: asset.code,
            mode: 'wallet',
            createdAt: new Date().toISOString(),
            // Store new fields in metadata temporarily
            currency: params.currencyCode,
            issuerAddress: params.issuerAddress,
            expiresAt: expiresAt.toISOString(),
            oneTimeToken,
            callbackUrl: params.callbackUrl,
            requestedLimit: limit,
            authUrl
          }
        }
      })
      
      console.log('Authorization request created:', {
        id: authorization.id,
        holder: params.holderAddress,
        currency: params.currencyCode,
        authUrl
      })
      
      return reply.status(201).send({
        id: authorization.id,
        assetId: asset.id,
        assetRef: asset.assetRef,
        holder: params.holderAddress,
        currency: params.currencyCode,
        issuerAddress: params.issuerAddress,
        limit,
        status: 'PENDING',
        authUrl,
        expiresAt: expiresAt.toISOString(),
        oneTimeToken
      })
    } catch (error: any) {
      console.error('Error creating authorization:', error)
      
      if (error.message === 'Asset not found') {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      if (error.message.includes('must be active')) {
        return reply.status(422).send({ error: error.message })
      }
      if (error.message?.includes('reserve')) {
        return reply.status(422).send({ 
          error: 'Insufficient reserve', 
          reason: 'INSUFFICIENT_RESERVE' 
        })
      }
      
      return reply.status(502).send({ error: 'Ledger connection error' })
    }
  })

  // 3. DELETE /v1/assets/{assetId}/authorizations/{holder} - Remove authorization
  app.delete('/assets/:assetId/authorizations/:holder', {
    schema: {
      summary: 'Remove authorization for a holder and asset',
      description: 'Remove trustline (XRPL) or equivalent authorization mechanism',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId', 'holder'],
        properties: {
          assetId: { type: 'string' },
          holder: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            assetId: { type: 'string' },
            holder: { type: 'string' },
            txId: { type: 'string' },
            status: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        422: { type: 'object', properties: { error: { type: 'string' } } },
        502: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId, holder } = req.params as { assetId: string; holder: string }
    
    try {
      // Validate asset exists and is active
      const asset = await validateAsset(assetId)
      
      // For MVP, we'll return a mock response
      // TODO: Implement actual authorization removal
      return reply.send({
        assetId: asset.id,
        holder,
        txId: 'mock_tx_id_for_mvp',
        status: 'submitted'
      })
    } catch (error: any) {
      console.error('Error removing authorization:', error)
      
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
