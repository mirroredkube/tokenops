import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { getLedgerAdapter } from '../../adapters/index.js'
import { currencyToHex, isHexCurrency, hexCurrencyToAscii } from '../../utils/currency.js'
import { Asset, assets, validateAsset } from './shared.js'
import prisma from '../../db/client.js'
import { tenantMiddleware, TenantRequest, requireActiveTenant } from '../../middleware/tenantMiddleware.js'
import { AuthorizationStatus, AuthorizationInitiator } from '@prisma/client'

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
          status: { type: 'string', enum: ['HOLDER_REQUESTED', 'ISSUER_AUTHORIZED', 'EXTERNAL', 'LIMIT_UPDATED', 'TRUSTLINE_CLOSED', 'FROZEN', 'UNFROZEN'] },
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
                  external: { type: 'boolean' },
                  externalSource: { type: 'string' },
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
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    const { limit = 20, offset = 0, status, assetId, holder } = req.query as {
      limit?: number
      offset?: number
      status?: string
      assetId?: string
      holder?: string
    }
    
    try {
      // Build where clause - scope to tenant's organization
      const where: any = {
        asset: {
          product: {
            organizationId: req.tenant!.id // Scope to tenant's organization
          }
        }
      }
      if (status) where.status = status
      if (assetId) where.assetId = assetId
      if (holder) where.holderAddress = holder
      
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
            status: { type: 'string' },
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
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    const { assetId, holder } = req.params as { assetId: string; holder: string }
    
    try {
      // Validate asset exists and is active
      const asset = await validateAsset(assetId)
      
      // Check our database for authorization records
      const authorization = await prisma.authorization.findFirst({
        where: {
          assetId: asset.id,
          holderAddress: holder,
          tenantId: (req as TenantRequest).tenant?.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      // Also check for pending authorization requests
      const pendingRequest = await prisma.authorizationRequest.findFirst({
        where: {
          assetId: asset.id,
          holderAddress: holder,
          tenantId: (req as TenantRequest).tenant?.id,
          status: 'INVITED',
          expiresAt: {
            gt: new Date() // Not expired
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
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
        // No trustline on ledger
        if (authorization) {
          // We have a database record but no trustline - this shouldn't happen normally
          return reply.send({
            assetId: asset.id,
            assetRef: asset.assetRef,
            holder,
            exists: true,
            status: authorization.status,
            details: {
              limit: authorization.limit,
              balance: '0',
              authorized: false
            }
          })
        } else if (pendingRequest) {
          // We have a pending authorization request
          return reply.send({
            assetId: asset.id,
            assetRef: asset.assetRef,
            holder,
            exists: false,
            status: 'HOLDER_REQUESTED',
            pendingRequest: {
              id: pendingRequest.id,
              expiresAt: pendingRequest.expiresAt,
              requestedLimit: pendingRequest.requestedLimit
            }
          })
        } else {
          return reply.send({
            assetId: asset.id,
            assetRef: asset.assetRef,
            holder,
            exists: false
          })
        }
      }
      
      // Trustline exists on ledger
      if (authorization) {
        // We have both ledger trustline and database record
        return reply.send({
          assetId: asset.id,
          assetRef: asset.assetRef,
          holder,
          exists: true,
          status: authorization.status,
          details: {
            limit: line.limit,
            balance: line.balance,
            authorized: line.authorized || false
          }
        })
      } else {
        // Trustline exists on ledger but not in our database - this is an external trustline
        return reply.send({
          assetId: asset.id,
          assetRef: asset.assetRef,
          holder,
          exists: true,
          status: 'EXTERNAL',
          details: {
            limit: line.limit,
            balance: line.balance,
            authorized: line.authorized || false
          }
        })
      }
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

  // 1.5. GET /v1/assets/{assetId}/authorizations/{holder}/ledger-check - Check trustline on XRPL ledger
  app.get('/assets/:assetId/authorizations/:holder/ledger-check', {
    schema: {
      summary: 'Check if trustline exists on XRPL ledger',
      description: 'Check the XRPL ledger directly to see if a trustline exists for the given holder and asset',
      tags: ['v1'],
      params: {
        type: 'object',
        properties: {
          assetId: { type: 'string' },
          holder: { type: 'string' }
        },
        required: ['assetId', 'holder']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            exists: { type: 'boolean' },
            limit: { type: 'string' },
            balance: { type: 'string' },
            authorized: { type: 'boolean' },
            noRipple: { type: 'boolean' },
            freeze: { type: 'boolean' }
          }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    const { assetId, holder } = req.params as { assetId: string, holder: string }
    
    try {
      // Validate asset exists and belongs to tenant
      const asset = await validateAsset(assetId)
      
      const adapter = getLedgerAdapter()
      
      // Check trustline on XRPL ledger
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
      
      if (line) {
        return reply.send({
          exists: true,
          limit: line.limit_peer || '0',
          balance: line.balance || '0',
          authorized: line.authorized || false,
          noRipple: line.no_ripple || false,
          freeze: line.freeze || false
        })
      } else {
        return reply.send({
          exists: false,
          limit: '0',
          balance: '0',
          authorized: false,
          noRipple: false,
          freeze: false
        })
      }
    } catch (error: any) {
      console.error('Error checking ledger trustline:', error)
      return reply.status(500).send({ error: 'Failed to check ledger trustline' })
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
              callbackUrl: { type: 'string', format: 'uri' },
              status: { type: 'string', enum: ['HOLDER_REQUESTED', 'EXTERNAL'], default: 'HOLDER_REQUESTED' }
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
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    const { assetId, holder } = req.params as { assetId: string; holder: string }
    const body = AuthorizationRequestSchema.safeParse(req.body)
    
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.errors })
    }

    const { params, signing } = body.data
    const limit = params.limit || '1000000000' // Safe high default
    const mode = signing?.mode || 'wallet'
    
    console.log('Authorization request params:', { status: params.status, limit, mode })
    
    // Security: Always use wallet mode, never handle private keys
    if (mode !== 'wallet') {
      return reply.status(400).send({ 
        error: 'Only wallet signing mode is supported for security. Private keys are never handled.' 
      })
    }
    
    try {
      // Validate asset exists, is active, and belongs to tenant
      const asset = await prisma.asset.findUnique({
        where: { 
          id: assetId,
          product: {
            organizationId: req.tenant!.id // Ensure asset belongs to tenant
          }
        },
        include: {
          issuingAddress: true,
          product: true
        }
      })
      
      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found or not accessible' })
      }
      
      if (asset.status !== 'ACTIVE') {
        return reply.status(422).send({ error: 'Asset is not active' })
      }
      
      // Validate RequireAuth is enabled on the issuer account (skip for external authorizations)
      console.log('Checking RequireAuth for status:', params.status)
      if (params.status !== 'EXTERNAL') {
        console.log('Performing RequireAuth check for non-external authorization')
        const { validateAssetRequireAuth } = await import('../../lib/requireAuthChecker.js')
        const requireAuthCheck = await validateAssetRequireAuth(assetId)
        console.log('RequireAuth check result:', requireAuthCheck)
        if (!requireAuthCheck.hasRequireAuth) {
          return reply.status(400).send({
            error: 'Authorization not available',
            message: 'The issuer account does not have RequireAuth enabled. Please contact your administrator to enable RequireAuth on the issuer account before creating authorization requests.',
            details: requireAuthCheck.error
          })
        }
      } else {
        console.log('Skipping RequireAuth check for external authorization')
      }
      
      // Generate secure one-time token for authorization URL
      const oneTimeToken = crypto.randomUUID()
      
      // Set expiration time (default 24 hours from now)
      const expiresAt = params.expiresAt 
        ? new Date(params.expiresAt)
        : new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      // Generate authorization URL
      const baseUrl = process.env.PUBLIC_AUTH_BASE_URL || 'http://localhost:3000'
      const authUrl = `${baseUrl}/auth/authorize/${oneTimeToken}`
      
      // Determine status and initiatedBy based on request
      const status = params.status === 'EXTERNAL' ? AuthorizationStatus.EXTERNAL : AuthorizationStatus.HOLDER_REQUESTED
      const initiatedBy = params.status === 'EXTERNAL' ? AuthorizationInitiator.SYSTEM : AuthorizationInitiator.HOLDER
      
      // Create authorization request in database
      const authorization = await prisma.authorization.create({
        data: {
          tenantId: asset.product.organizationId,
          assetId: asset.id,
          ledger: `${asset.ledger}-${asset.network}`,
          currency: params.currencyCode,
          holderAddress: params.holderAddress,
          limit,
          status,
          initiatedBy,
          txHash: null,
          external: params.status === 'EXTERNAL',
          externalSource: params.status === 'EXTERNAL' ? 'ledger-detected' : null
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
        status: AuthorizationStatus.HOLDER_REQUESTED,
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

  // 3. GET /v1/authorizations/token/{token} - Get authorization request by token
  app.get('/authorizations/token/:token', {
    schema: {
      summary: 'Get authorization request by token',
      description: 'Retrieve authorization request details using the one-time token',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', description: 'One-time authorization token' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assetId: { type: 'string' },
            holder: { type: 'string' },
            currency: { type: 'string' },
            issuerAddress: { type: 'string' },
            limit: { type: 'string' },
            status: { type: 'string' },
            expiresAt: { type: 'string' },
            noRipple: { type: 'boolean' },
            requireAuth: { type: 'boolean' },
            metadata: { type: 'object' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        410: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    try {
      const { token } = req.params as { token: string }
      
      // Find authorization request by one-time token hash
      const authRequest = await prisma.authorizationRequest.findFirst({
        where: { 
          oneTimeTokenHash: crypto.createHash('sha256').update(token).digest('hex')
        },
        include: {
          asset: {
            include: {
              issuingAddress: true
            }
          }
        }
      })
      
      if (!authRequest) {
        return reply.code(404).send({ error: 'Authorization request not found or expired' })
      }
      
      const authorization = await prisma.authorization.findFirst({
        where: {
          assetId: authRequest.assetId,
          holderAddress: authRequest.holderAddress
        },
        include: {
          asset: {
            include: {
              issuingAddress: true
            }
          }
        }
      })
      
      if (!authorization) {
        return reply.status(404).send({ error: 'Authorization request not found' })
      }
      
      // Check if expired
      if (authRequest.expiresAt && new Date(authRequest.expiresAt) < new Date()) {
        return reply.status(410).send({ error: 'Authorization request has expired' })
      }
      
      return reply.send({
        id: authorization.id,
        assetId: authorization.assetId,
        holder: authorization.holderAddress,
        currency: authorization.currency,
        issuerAddress: authorization.asset.issuingAddress?.address,
        limit: authorization.limit,
        status: authorization.status,
        expiresAt: authRequest.expiresAt?.toISOString(),
        noRipple: false, // Legacy field - not in new schema
        requireAuth: true, // Legacy field - not in new schema
        metadata: null // Legacy field - not in new schema
      })
    } catch (error: any) {
      console.error('Error fetching authorization request:', error)
      return reply.status(500).send({ error: 'Failed to fetch authorization request' })
    }
  })

  // 4. GET /v1/authorizations/{id}/status - Get trustline status
  app.get('/authorizations/:id/status', {
    schema: {
      summary: 'Get trustline status',
      description: 'Check the current status of a trustline on the ledger',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Authorization ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            exists: { type: 'boolean' },
            authorized: { type: 'boolean' },
            limit: { type: 'string' },
            balance: { type: 'string' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    try {
      const { id } = req.params as { id: string }
      
      // Find authorization request
      const authorization = await prisma.authorization.findUnique({
        where: { 
          id,
          asset: {
            product: {
              organizationId: req.tenant!.id // Ensure authorization belongs to tenant
            }
          }
        },
        include: {
          asset: {
            include: {
              issuingAddress: true
            }
          }
        }
      })
      
      if (!authorization) {
        return reply.status(404).send({ error: 'Authorization request not found' })
      }
      
      // Use existing XRPL adapter to check trustline status
      const adapter = getLedgerAdapter()
      
      try {
        // Check if trustline exists using account_lines
        const accountLines = await adapter.getAccountLines({
          account: authorization.holderAddress,
          peer: authorization.asset.issuingAddress?.address || '',
          ledger_index: 'validated'
        })
        
        // Find the specific currency line
        const trustline = accountLines.find((line: any) => {
          const lineCurrency = line.currency?.toUpperCase()
          const authCurrency = authorization.currency?.toUpperCase()
          
          // Handle both hex and ASCII currency codes
          if (authCurrency && authCurrency.length === 40) {
            // Hex currency
            return lineCurrency === authCurrency
          } else {
            // ASCII currency - check both formats
            return lineCurrency === authCurrency || 
                   lineCurrency === currencyToHex(authCurrency || '')
          }
        })
        
        const status = {
          exists: !!trustline,
          authorized: trustline ? (trustline.authorized === true || trustline.peer_authorized === true) : false,
          limit: trustline ? trustline.limit : '0',
          balance: trustline ? trustline.balance : '0'
        }
        
        // Update authorization status if trustline exists
        if (status.exists && authorization.status === AuthorizationStatus.AWAITING_ISSUER_AUTHORIZATION) {
          await prisma.authorization.update({
            where: { id: authorization.id },
            data: { 
              status: AuthorizationStatus.ISSUER_AUTHORIZED,
              txHash: 'ledger-detected'
            }
          })
        }
        
        return reply.send(status)
      } catch (error: any) {
        console.error('Error checking trustline status:', error)
        
        // Fallback to database status if ledger query fails
        const fallbackStatus = {
          exists: authorization.status === AuthorizationStatus.ISSUER_AUTHORIZED || authorization.status === AuthorizationStatus.EXTERNAL,
          authorized: authorization.status === AuthorizationStatus.ISSUER_AUTHORIZED,
          limit: authorization.limit,
          balance: '0'
        }
        
        return reply.send(fallbackStatus)
      }
    } catch (error: any) {
      console.error('Error checking trustline status:', error)
      return reply.status(500).send({ error: 'Failed to check trustline status' })
    }
  })

  // 5. POST /v1/authorizations/{id}/authorize - Issuer authorizes trustline
  app.post('/authorizations/:id/authorize', {
    schema: {
      summary: 'Authorize trustline as issuer',
      description: 'Issuer authorizes a trustline using tfSetfAuth flag (4-eyes approval required)',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Authorization ID' }
        }
      },
      body: {
        type: 'object',
        properties: {
          issuerSecret: { type: 'string', description: 'Issuer secret for signing authorization' },
          approvedBy: { type: 'string', description: 'User ID who approved the authorization' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            txId: { type: 'string' },
            authorizedAt: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    try {
      const { id } = req.params as { id: string }
      const { issuerSecret, approvedBy } = req.body as { issuerSecret?: string; approvedBy?: string }
      
      // Find authorization request
      const authorization = await prisma.authorization.findUnique({
        where: { 
          id,
          asset: {
            product: {
              organizationId: req.tenant!.id // Ensure authorization belongs to tenant
            }
          }
        },
        include: {
          asset: {
            include: {
              issuingAddress: true
            }
          }
        }
      })
      
      if (!authorization) {
        return reply.status(404).send({ error: 'Authorization request not found' })
      }
      
      if (authorization.status !== AuthorizationStatus.HOLDER_REQUESTED) {
        return reply.status(400).send({ error: 'Authorization request is not in HOLDER_REQUESTED status' })
      }
      
      // Note: requireAuth check is now handled by RequireAuth checker service
      
      // TODO: Implement 4-eyes approval check
      // For now, require approvedBy parameter
      if (!approvedBy) {
        return reply.status(400).send({ error: '4-eyes approval required - approvedBy parameter missing' })
      }
      
      // TODO: Implement actual issuer authorization using tfSetfAuth
      // This would use the XRPL adapter to sign and submit the authorization transaction
      if (!issuerSecret) {
        return reply.status(400).send({ error: 'Issuer secret required for authorization' })
      }
      
      // Mock authorization for now
      const mockTxId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Update authorization status
      const updatedAuth = await prisma.authorization.update({
        where: { id },
        data: {
          status: AuthorizationStatus.ISSUER_AUTHORIZED,
          txHash: mockTxId
        }
      })
      
      return reply.send({
        id: updatedAuth.id,
        status: updatedAuth.status,
        txId: updatedAuth.txHash,
        authorizedAt: updatedAuth.createdAt?.toISOString()
      })
    } catch (error: any) {
      console.error('Error authorizing trustline:', error)
      return reply.status(500).send({ error: 'Failed to authorize trustline' })
    }
  })

  // 6. POST /v1/authorizations/external - Create external trustline entry
  app.post('/authorizations/external', {
    schema: {
      summary: 'Create external trustline entry',
      description: 'Add a trustline that was created outside our platform to our database',
      tags: ['v1'],
      body: {
        type: 'object',
        required: ['assetId', 'holderAddress', 'currency', 'issuerAddress'],
        properties: {
          assetId: { type: 'string' },
          holderAddress: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$' },
          currency: { type: 'string' },
          issuerAddress: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$' },
          limit: { type: 'string' },
          externalSource: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assetId: { type: 'string' },
            holderAddress: { type: 'string' },
            status: { type: 'string' },
            external: { type: 'boolean' },
            externalSource: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    try {
      const { assetId, holderAddress, currency, issuerAddress, limit = '1000000000', externalSource = 'xrpl_external' } = req.body as {
        assetId: string
        holderAddress: string
        currency: string
        issuerAddress: string
        limit?: string
        externalSource?: string
      }
      
      // Validate asset exists and get organizationId
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          product: true,
          issuingAddress: true
        }
      })
      
      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      
      if (asset.status !== 'ACTIVE') {
        return reply.status(422).send({ error: `Asset is ${asset.status.toLowerCase()}, must be active` })
      }
      
      // Check if external trustline already exists
      const existingExternal = await prisma.authorization.findFirst({
        where: {
          assetId: asset.id,
          holderAddress: holderAddress,
          external: true
        }
      })
      
      if (existingExternal) {
        // For token issuance flow, existing external trustline is a success case
        return reply.status(200).send({
          id: existingExternal.id,
          assetId: existingExternal.assetId,
          holderAddress: existingExternal.holderAddress,
          status: existingExternal.status,
          external: existingExternal.external,
          externalSource: existingExternal.externalSource,
          message: 'External trustline already exists and is ready for token issuance'
        })
      }
      
      // Create external trustline entry
      const externalAuth = await prisma.authorization.create({
        data: {
          tenantId: asset.product.organizationId,
          assetId: asset.id,
          ledger: `${asset.ledger}-${asset.network}`,
          currency,
          holderAddress: holderAddress,
          limit,
          status: AuthorizationStatus.EXTERNAL, // External trustlines are considered external
          initiatedBy: AuthorizationInitiator.SYSTEM,
          txHash: null,
          external: true,
          externalSource
        }
      })
      
      return reply.status(201).send({
        id: externalAuth.id,
        assetId: externalAuth.assetId,
        holderAddress: externalAuth.holderAddress,
        status: externalAuth.status,
        external: externalAuth.external,
        externalSource: externalAuth.externalSource
      })
    } catch (error: any) {
      console.error('Error creating external trustline entry:', error)
      
      if (error.message === 'Asset not found') {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      
      return reply.status(500).send({ error: 'Failed to create external trustline entry' })
    }
  })
}
