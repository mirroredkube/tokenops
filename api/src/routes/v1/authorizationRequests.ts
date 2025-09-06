
import { FastifyInstance } from 'fastify'
import { PrismaClient, AuthorizationStatus, AuthorizationRequestStatus } from '@prisma/client'
import { generateOneTimeToken, hashToken, generateExpirationTime, createAuthUrl } from '../../lib/oneTimeToken.js'
import { validateAssetRequireAuth } from '../../lib/requireAuthChecker.js'
import { checkIdempotency, generateIdempotencyKey } from '../../lib/idempotency.js'
import { getLedgerAdapter } from '../../adapters/index.js'
import { tenantMiddleware, TenantRequest } from '../../middleware/tenantMiddleware.js'

const prisma = new PrismaClient()

export default async function authorizationRequestRoutes(fastify: FastifyInstance) {
  
  // GET /authorization-requests/token/:token
  fastify.get('/authorization-requests/token/:token', {
    schema: {
      params: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assetId: { type: 'string' },
            holderAddress: { type: 'string' },
            requestedLimit: { type: 'string' },
            authUrl: { type: 'string' },
            status: { type: 'string' },
            expiresAt: { type: 'string' },
            consumedAt: { type: 'string' },
            createdAt: { type: 'string' },
            asset: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string' },
                ledger: { type: 'string' },
                network: { type: 'string' },
                issuingAddress: {
                  type: 'object',
                  properties: {
                    address: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { token } = request.params as any
    
    try {
      // Hash the token to find the authorization request
      const tokenHash = hashToken(token)
      
      const authRequest = await prisma.authorizationRequest.findFirst({
        where: {
          oneTimeTokenHash: tokenHash,
          status: AuthorizationRequestStatus.INVITED,
          expiresAt: {
            gt: new Date()
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

      if (!authRequest) {
        return reply.status(404).send({ error: 'Authorization request not found or expired' })
      }

      return {
        id: authRequest.id,
        assetId: authRequest.assetId,
        holderAddress: authRequest.holderAddress,
        requestedLimit: authRequest.requestedLimit,
        authUrl: authRequest.authUrl,
        status: authRequest.status,
        expiresAt: authRequest.expiresAt.toISOString(),
        consumedAt: authRequest.consumedAt?.toISOString(),
        createdAt: authRequest.createdAt.toISOString(),
        asset: {
          id: authRequest.asset.id,
          code: authRequest.asset.code,
          ledger: authRequest.asset.ledger,
          network: authRequest.asset.network,
          issuingAddress: {
            address: authRequest.asset.issuingAddress?.address || ''
          }
        }
      }
    } catch (error) {
      console.error('Error fetching authorization request by token:', error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
  
  // POST /authorization-requests
  fastify.post('/authorization-requests', {
    schema: {
      body: {
        type: 'object',
        required: ['assetId', 'holderAddress', 'requestedLimit'],
        properties: {
          assetId: { type: 'string' },
          holderAddress: { type: 'string' },
          requestedLimit: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            authUrl: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(request as TenantRequest, reply)
    
    const { assetId, holderAddress, requestedLimit } = request.body as any
    const tenantId = (request as TenantRequest).tenant?.id

    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey('create_authorization_request', {
      assetId, holderAddress, requestedLimit, tenantId
    })

    const result = await checkIdempotency(idempotencyKey, async () => {
      // Validate RequireAuth
      const requireAuthCheck = await validateAssetRequireAuth(assetId)
      if (!requireAuthCheck.hasRequireAuth) {
        // Return user-friendly error message
        return reply.status(400).send({
          error: 'Authorization not available',
          message: 'The issuer account does not have RequireAuth enabled. Please contact your administrator to enable RequireAuth on the issuer account before creating authorization requests.',
          details: requireAuthCheck.error
        })
      }

      // Get asset info
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          issuingAddress: true,
          product: true
        }
      })

      if (!asset) {
        throw new Error('Asset not found')
      }

      if (asset.product.organizationId !== tenantId) {
        throw new Error('Asset does not belong to tenant')
      }

      // Generate one-time token
      const token = generateOneTimeToken()
      const tokenHash = hashToken(token)
      const expiresAt = generateExpirationTime(24) // 24 hours
      const authUrl = createAuthUrl(process.env.UI_ORIGIN || 'http://localhost:3000', token)

      // Create authorization request
      const request = await prisma.authorizationRequest.create({
        data: {
          tenantId,
          assetId,
          holderAddress,
          requestedLimit,
          oneTimeTokenHash: tokenHash,
          authUrl,
          expiresAt,
          status: AuthorizationRequestStatus.INVITED
        }
      })

      return {
        id: request.id,
        authUrl: request.authUrl
      }
    })

    if (result.isDuplicate) {
      return reply.code(200).send(result.result)
    }

    return reply.code(201).send(result.result)
  })

  // POST /authorization-requests/:id/holder-callback
  fastify.post('/authorization-requests/:id/holder-callback', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['txHash'],
        properties: {
          txHash: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as any
    const { txHash } = request.body as any
    const tenantId = (request as any).tenantId

    // Get authorization request
    const authRequest = await prisma.authorizationRequest.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            issuingAddress: true
          }
        }
      }
    })

    if (!authRequest) {
      return reply.code(404).send({ error: 'Authorization request not found' })
    }

    if (authRequest.tenantId !== tenantId) {
      return reply.code(404).send({ error: 'Authorization request not found' })
    }

    if (authRequest.status !== AuthorizationRequestStatus.INVITED) {
      return reply.code(400).send({ error: 'Authorization request already processed' })
    }

    // Verify transaction is a valid holder TrustSet
    const adapter = getLedgerAdapter()
    if (!adapter.getTransaction) {
      return reply.code(400).send({ error: 'Transaction verification not supported' })
    }
    
    const tx = await adapter.getTransaction(txHash)
    
    if (!tx) {
      return reply.code(400).send({ error: 'Transaction not found on ledger' })
    }
    
    if (tx.TransactionType !== 'TrustSet') {
      return reply.code(400).send({ error: 'Invalid transaction type - expected TrustSet' })
    }
    
    // Verify transaction is validated
    if (tx.validated !== true) {
      return reply.code(400).send({ error: 'Transaction not yet validated on ledger' })
    }
    
    // Verify the account matches the holder address
    if (tx.Account !== authRequest.holderAddress) {
      return reply.code(400).send({ error: 'Transaction account does not match holder address' })
    }
    
    // Verify the LimitAmount matches the asset
    if (!tx.LimitAmount) {
      return reply.code(400).send({ error: 'Transaction missing LimitAmount' })
    }
    
    if (tx.LimitAmount.currency !== authRequest.asset.code) {
      return reply.code(400).send({ error: 'Transaction currency does not match asset code' })
    }
    
    if (tx.LimitAmount.issuer !== authRequest.asset.issuingAddress?.address) {
      return reply.code(400).send({ error: 'Transaction issuer does not match asset issuer' })
    }
    
    // Verify the limit is greater than 0
    const limitValue = parseFloat(tx.LimitAmount.value)
    if (limitValue <= 0) {
      return reply.code(400).send({ error: 'TrustSet limit must be greater than 0' })
    }
    
    // Verify the limit matches the requested limit (with some tolerance for precision)
    const requestedLimit = parseFloat(authRequest.requestedLimit)
    const tolerance = 0.000001 // Small tolerance for floating point precision
    if (Math.abs(limitValue - requestedLimit) > tolerance) {
      return reply.code(400).send({ error: 'Transaction limit does not match requested limit' })
    }

    // Mark request as consumed
    await prisma.authorizationRequest.update({
      where: { id },
      data: {
        status: AuthorizationRequestStatus.CONSUMED,
        consumedAt: new Date()
      }
    })

    // Create authorization entry
    await prisma.authorization.create({
      data: {
        tenantId: authRequest.tenantId,
        assetId: authRequest.assetId,
        ledger: `${authRequest.asset.ledger}-${authRequest.asset.network}`,
        currency: authRequest.asset.code,
        holderAddress: authRequest.holderAddress,
        limit: authRequest.requestedLimit,
        status: AuthorizationStatus.AWAITING_ISSUER_AUTHORIZATION,
        initiatedBy: 'HOLDER',
        txHash
      }
    })

    return reply.send({ recorded: 'AWAITING_ISSUER_AUTHORIZATION' })
  })

  // POST /authorization-requests/:id/authorize
  fastify.post('/authorization-requests/:id/authorize', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          issuerLimit: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as any
    const { issuerLimit = "0" } = request.body as any
    const tenantId = (request as any).tenantId

    // Get authorization request
    const authRequest = await prisma.authorizationRequest.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            issuingAddress: true
          }
        }
      }
    })

    if (!authRequest) {
      return reply.code(404).send({ error: 'Authorization request not found' })
    }

    if (authRequest.tenantId !== tenantId) {
      return reply.code(404).send({ error: 'Authorization request not found' })
    }

    if (authRequest.status !== AuthorizationRequestStatus.CONSUMED) {
      return reply.code(400).send({ error: 'Authorization request not ready for authorization' })
    }

    // Authorize trustline
    const adapter = getLedgerAdapter()
    if (!adapter.authorizeTrustline) {
      return reply.code(400).send({ error: 'Trustline authorization not supported' })
    }
    const result = await adapter.authorizeTrustline({
      holderAddress: authRequest.holderAddress,
      currency: authRequest.asset.code,
      issuerAddress: authRequest.asset.issuingAddress!.address,
      issuerLimit
    })

    // Create authorization entry
    await prisma.authorization.create({
      data: {
        tenantId: authRequest.tenantId,
        assetId: authRequest.assetId,
        ledger: `${authRequest.asset.ledger}-${authRequest.asset.network}`,
        currency: authRequest.asset.code,
        holderAddress: authRequest.holderAddress,
        limit: authRequest.requestedLimit,
        status: AuthorizationStatus.ISSUER_AUTHORIZED,
        initiatedBy: 'ISSUER',
        txHash: result.txid
      }
    })

    return reply.send({ 
      txHash: result.txid, 
      status: 'ISSUER_AUTHORIZED' 
    })
  })

  // GET /authorization-requests?status=pending
  fastify.get('/authorization-requests', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { status } = request.query as any
    const tenantId = (request as any).tenantId

    const requests = await prisma.authorizationRequest.findMany({
      where: {
        tenantId,
        ...(status && { status })
      },
      include: {
        asset: {
          include: {
            issuingAddress: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return reply.send(requests)
  })

  // POST /admin/sync-trustlines?assetId=...
  fastify.post('/admin/sync-trustlines', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          assetId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { assetId } = request.query as any
    const tenantId = (request as any).tenantId

    // Import sync function
    const { syncTrustlines, syncAllTrustlines } = await import('../../lib/trustlineSync.js')

    // Start sync in background
    setImmediate(async () => {
      try {
        if (assetId) {
          await syncTrustlines(assetId)
        } else {
          await syncAllTrustlines(tenantId)
        }
      } catch (error) {
        console.error('Sync error:', error)
      }
    })

    return reply.code(202).send({ started: true })
  })
}
