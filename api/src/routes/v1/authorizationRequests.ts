import { FastifyInstance } from 'fastify'
import { PrismaClient, AuthorizationRequestStatus } from '@prisma/client'
import { generateOneTimeToken, hashToken, generateExpirationTime, createAuthUrl } from '../../lib/oneTimeToken.js'
import { validateAssetRequireAuth } from '../../lib/requireAuthChecker.js'
import { checkIdempotency, generateIdempotencyKey } from '../../lib/idempotency.js'
import { getLedgerAdapter } from '../../adapters/index.js'

const prisma = new PrismaClient()

export default async function authorizationRequestRoutes(fastify: FastifyInstance) {
  
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
    const { assetId, holderAddress, requestedLimit } = request.body as any
    const tenantId = (request as any).tenantId

    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey('create_authorization_request', {
      assetId, holderAddress, requestedLimit, tenantId
    })

    const result = await checkIdempotency(idempotencyKey, async () => {
      // Validate RequireAuth
      const requireAuthCheck = await validateAssetRequireAuth(assetId)
      if (!requireAuthCheck.hasRequireAuth) {
        throw new Error(`RequireAuth validation failed: ${requireAuthCheck.error}`)
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
    
    if (!tx || tx.TransactionType !== 'TrustSet') {
      return reply.code(400).send({ error: 'Invalid transaction type' })
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
        status: 'HOLDER_REQUESTED',
        initiatedBy: 'HOLDER',
        txHash
      }
    })

    return reply.send({ recorded: 'HOLDER_REQUESTED' })
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
        status: 'ISSUER_AUTHORIZED',
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
