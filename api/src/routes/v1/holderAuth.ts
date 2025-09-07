import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { XummSdk } from 'xumm-sdk'
import crypto from 'crypto'
import prisma from '../../db/client.js'
import { tenantMiddleware, TenantRequest, requireActiveTenant } from '../../middleware/tenantMiddleware.js'
// import { AuthorizationStatus, AuthorizationInitiator } from '@prisma/client'
import { currencyToHex, isHexCurrency } from '../../utils/currency.js'

// Initialize Xaman SDK conditionally
let xumm: XummSdk | null = null

try {
  if (process.env.XUMM_API_KEY && process.env.XUMM_API_SECRET && 
      process.env.XUMM_API_KEY !== 'your-xaman-api-key-here' && 
      process.env.XUMM_API_SECRET !== 'your-xaman-api-secret-here') {
    xumm = new XummSdk(process.env.XUMM_API_KEY, process.env.XUMM_API_SECRET)
    console.log('✅ Xaman SDK initialized successfully')
    console.log('API Key:', process.env.XUMM_API_KEY.substring(0, 8) + '...')
    console.log('API Secret:', process.env.XUMM_API_SECRET.substring(0, 8) + '...')
  } else {
    console.log('⚠️  Xaman SDK not initialized - API keys not configured')
    console.log('XUMM_API_KEY:', process.env.XUMM_API_KEY ? 'Set' : 'Not set')
    console.log('XUMM_API_SECRET:', process.env.XUMM_API_SECRET ? 'Set' : 'Not set')
  }
} catch (error) {
  console.error('❌ Failed to initialize Xaman SDK:', error)
  xumm = null
}

export default async function holderAuthRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // 1. POST /v1/holder-auth/:reqId/start - Start holder signing flow
  app.post('/holder-auth/:reqId/start', {
    schema: {
      summary: 'Start holder authorization flow with Xaman',
      description: 'Create a Xaman signing payload for holder to set up trustline',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['reqId'],
        properties: {
          reqId: { type: 'string', description: 'Authorization request ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            uuid: { type: 'string' },
            deepLink: { type: 'string' },
            qrPng: { type: 'string' }
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
    
    const { reqId } = req.params as { reqId: string }
    
    try {
      // Check if Xaman SDK is available
      if (!xumm) {
        return reply.status(503).send({ 
          error: 'Xaman integration not available',
          message: 'Xaman API keys are not configured. Please contact your administrator.'
        })
      }
      
      // Get authorization request from database
      const authRequest = await prisma.authorizationRequest.findFirst({
        where: {
          id: reqId,
          tenantId: (req as TenantRequest).tenant?.id,
          status: 'INVITED'
        },
        include: {
          asset: {
            include: {
              issuingAddress: true,
              product: true
            }
          }
        }
      })
      
      if (!authRequest) {
        return reply.status(404).send({ error: 'Authorization request not found or expired' })
      }
      
      // Check if request is expired
      if (new Date() > authRequest.expiresAt) {
        return reply.status(400).send({ error: 'Authorization request has expired' })
      }
      
      // Validate RequireAuth is enabled on the issuer account
      const { validateAssetRequireAuth } = await import('../../lib/requireAuthChecker.js')
      const requireAuthCheck = await validateAssetRequireAuth(authRequest.assetId)
      if (!requireAuthCheck.hasRequireAuth) {
        return reply.status(400).send({
          error: 'Authorization not available',
          message: 'The issuer account does not have RequireAuth enabled. Please contact your administrator.'
        })
      }
      
      // Convert currency code to proper XRPL format
      const currency = isHexCurrency(authRequest.asset.code) 
        ? authRequest.asset.code 
        : currencyToHex(authRequest.asset.code)

      // Create Xaman signing payload
      const txjson = {
        TransactionType: 'TrustSet',
        // Account omitted: Xaman will set the signing account automatically
        LimitAmount: {
          currency: currency,
          issuer: authRequest.asset.issuingAddress?.address,
          value: authRequest.requestedLimit
        },
        Flags: 0
        // Don't set Fee or Sequence - let Xaman handle these automatically
      }
      
      console.log('Creating Xaman payload for:', {
        expectedHolderAddress: authRequest.holderAddress,
        assetCode: authRequest.asset.code,
        currencyHex: currency,
        issuerAddress: authRequest.asset.issuingAddress?.address,
        requestedLimit: authRequest.requestedLimit,
        txjson
      })

      let payload
      try {
        console.log('Calling xumm.payload.create with:', {
          txjson,
          options: { expire: 600 },
          custom_meta: {
            identifier: `authreq:${authRequest.id}`,
            instruction: `Create trustline to ${authRequest.asset.code} issuer`,
            blob: { 
              assetId: authRequest.assetId, 
              tenantId: (req as TenantRequest).tenant?.id,
              requestId: authRequest.id
            }
          }
        })

        // Try simple payload first without custom_meta
        payload = await xumm.payload.create({
          txjson,
          options: { 
            expire: 600 // 10 minutes
          }
        })
        
        console.log('Xaman payload creation result:', payload ? 'SUCCESS' : 'FAILED')
        console.log('Payload object:', JSON.stringify(payload, null, 2))
      } catch (error) {
        console.error('Xaman payload creation failed with error:', error)
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          response: error.response?.data,
          stack: error.stack
        })
        return reply.status(500).send({ 
          error: 'Failed to create authorization payload',
          message: `Xaman API error: ${error.message || 'Unknown error'}`,
          details: error.response?.data || error.stack
        })
      }
      
      if (!payload) {
        console.error('Failed to create Xaman payload - payload is null/undefined')
        return reply.status(500).send({ 
          error: 'Failed to create authorization payload',
          message: 'Unable to create Xaman signing payload. Please try again.'
        })
      }
      
      // Subscribe to payload resolution
      if (!xumm) {
        return reply.status(503).send({ 
          error: 'Xaman integration not available',
          message: 'Xaman API keys are not configured.'
        })
      }
      
      const subscription = await xumm.payload.subscribe(payload.uuid, async (event) => {
        try {
          if (event.data.signed === true && xumm) {
            // Get payload details
            const details = await xumm.payload.get(payload.uuid)
            const txid = details.response?.txid
            const signerAccount = details.response?.account
            const engineResult = details.response?.engine_result
            
            console.log('Xaman transaction result:', {
              txid,
              signerAccount,
              expectedHolder: authRequest.holderAddress,
              engineResult,
              response: details.response
            })
            
            // Check if transaction actually succeeded on XRPL
            if (engineResult && engineResult !== 'tesSUCCESS') {
              console.error('XRPL transaction failed:', engineResult, details.response?.engine_result_message)
              return
            }
            
            if (!txid || !signerAccount) {
              console.error('Missing txid or signer account in Xaman response')
              return
            }
            
            // Validate that the signing account matches the expected holder
            if (signerAccount !== authRequest.holderAddress) {
              console.warn('Account mismatch - using actual signer:', {
                expected: authRequest.holderAddress,
                actual: signerAccount
              })
            }
            
            // Verify the transaction details
            const txDetails = details.response?.txid ? await xumm.payload.get(payload.uuid) : null
            if (txDetails?.response?.txid) {
              // Determine initial authorization status based on issuer's RequireAuth setting
              let initialStatus: string
              if (requireAuthCheck.hasRequireAuth) {
                // Issuer has RequireAuth enabled - requires issuer authorization
                initialStatus = 'AWAITING_ISSUER_AUTHORIZATION'
              } else {
                // Issuer does not have RequireAuth - pre-authorized
                initialStatus = 'ISSUER_AUTHORIZED'
              }
              
              // Create authorization record
              await prisma.authorization.create({
                data: {
                  tenantId: (req as TenantRequest).tenant?.id!,
                  assetId: authRequest.assetId,
                  ledger: `${authRequest.asset.ledger}-${authRequest.asset.network}`,
                  currency: authRequest.asset.code,
                  holderAddress: signerAccount,
                  limit: authRequest.requestedLimit,
                  status: initialStatus as any,
                  initiatedBy: 'HOLDER' as any,
                  txHash: txid,
                  external: false,
                  externalSource: null
                }
              })
              
              // Mark authorization request as consumed
              await prisma.authorizationRequest.update({
                where: { id: authRequest.id },
                data: {
                  status: 'CONSUMED',
                  consumedAt: new Date()
                }
              })
              
              console.log('Holder authorization completed:', {
                requestId: authRequest.id,
                holder: signerAccount,
                txid,
                asset: authRequest.asset.code,
                issuerRequireAuth: requireAuthCheck.hasRequireAuth,
                initialStatus
              })
            }
          } else if (event.data.signed === false || event.data.expires_in_seconds === 0) {
            console.log('Holder authorization rejected or expired:', {
              requestId: authRequest.id,
              signed: event.data.signed,
              expiresIn: event.data.expires_in_seconds
            })
          }
        } catch (error) {
          console.error('Error processing Xaman payload result:', error)
        }
      })
      
      // Return deep link and QR code
      return reply.send({
        uuid: payload.uuid,
        deepLink: payload.next.always,
        qrPng: payload.refs.qr_png
      })
      
    } catch (error: any) {
      console.error('Error starting holder authorization:', error)
      return reply.status(500).send({ error: 'Failed to start authorization flow' })
    }
  })
  
  // 2. GET /v1/holder-auth/:reqId/status - Get authorization request status
  app.get('/holder-auth/:reqId/status', {
    schema: {
      summary: 'Get holder authorization request status',
      description: 'Check the status of a holder authorization request',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['reqId'],
        properties: {
          reqId: { type: 'string', description: 'Authorization request ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            expiresAt: { type: 'string' },
            asset: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                issuer: { type: 'string' },
                assetRef: { type: 'string' }
              }
            }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    requireActiveTenant(req, reply)
    
    const { reqId } = req.params as { reqId: string }
    
    try {
      const authRequest = await prisma.authorizationRequest.findFirst({
        where: {
          id: reqId,
          tenantId: (req as TenantRequest).tenant?.id
        },
        include: {
          asset: true
        }
      })
      
      if (!authRequest) {
        return reply.status(404).send({ error: 'Authorization request not found' })
      }
      
      return reply.send({
        status: authRequest.status,
        expiresAt: authRequest.expiresAt.toISOString(),
        asset: {
          code: authRequest.asset.code,
          issuer: authRequest.asset.issuer,
          assetRef: authRequest.asset.assetRef
        }
      })
      
    } catch (error: any) {
      console.error('Error getting authorization request status:', error)
      return reply.status(500).send({ error: 'Failed to get authorization status' })
    }
  })
}
