import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../../adapters/index.js'
import { currencyToHex, isHexCurrency, hexCurrencyToAscii } from '../../utils/currency.js'
import { Asset, assets, validateAsset } from './shared.js'

// ---------- Validation Schemas ----------
const OptInParamsSchema = z.object({
  params: z.object({
    limit: z.string().regex(/^[0-9]{1,16}$/).optional()
  }).optional(),
  signing: z.object({
    mode: z.enum(['wallet', 'server']).default('server')
  }).optional()
})

export default async function optInRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // 1. GET /v1/assets/{assetId}/opt-ins/{holder} - Check opt-in status
  app.get('/assets/:assetId/opt-ins/:holder', {
    schema: {
      summary: 'Get opt-in status for a holder and asset',
      description: 'Check if a holder has opted into an asset (XRPL = trustline)',
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
      console.error('Error checking opt-in status:', error)
      
      if (error.message === 'Asset not found') {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      if (error.message.includes('must be active')) {
        return reply.status(422).send({ error: error.message })
      }
      
      return reply.status(502).send({ error: 'Ledger connection error' })
    }
  })

  // 2. PUT /v1/assets/{assetId}/opt-ins/{holder} - Create/update opt-in
  app.put('/assets/:assetId/opt-ins/:holder', {
    schema: {
      summary: 'Create or update opt-in for a holder and asset',
      description: 'Create trustline (XRPL) or equivalent opt-in mechanism',
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
            properties: {
              limit: { type: 'string', pattern: '^[0-9]{1,16}$' }
            }
          },
          signing: {
            type: 'object',
            properties: {
              mode: { type: 'string', enum: ['wallet', 'server'] }
            }
          }
        }
      },
      response: {
        202: {
          type: 'object',
          properties: {
            assetId: { type: 'string' },
            assetRef: { type: 'string' },
            holder: { type: 'string' },
            txId: { type: 'string' },
            status: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        422: { type: 'object', properties: { error: { type: 'string' }, reason: { type: 'string' } } },
        502: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId, holder } = req.params as { assetId: string; holder: string }
    const body = OptInParamsSchema.safeParse(req.body)
    
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body' })
    }

    const { params, signing } = body.data
    const limit = params?.limit || '1000000000' // Safe high default
    const mode = signing?.mode || 'server'
    
    try {
      // Validate asset exists and is active
      const asset = await validateAsset(assetId)
      
      // For MVP, we'll use server-side signing
      if (mode === 'wallet') {
        return reply.status(400).send({ error: 'Wallet mode not implemented yet' })
      }
      
      const adapter = getLedgerAdapter()
      
      // Use existing createTrustline method
      const result = await adapter.createTrustline({
        currencyCode: asset.code,
        limit,
        holderSecret: process.env.HOLDER_SECRET || '' // For MVP, use env var
      })
      
      return reply.status(202).send({
        assetId: asset.id,
        assetRef: asset.assetRef,
        holder,
        txId: result.txHash,
        status: 'submitted'
      })
    } catch (error: any) {
      console.error('Error creating opt-in:', error)
      
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

  // 3. DELETE /v1/assets/{assetId}/opt-ins/{holder} - Remove opt-in
  app.delete('/assets/:assetId/opt-ins/:holder', {
    schema: {
      summary: 'Remove opt-in for a holder and asset',
      description: 'Remove trustline (XRPL) or equivalent opt-in mechanism',
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
      // TODO: Implement actual opt-in removal
      return reply.send({
        assetId: asset.id,
        holder,
        txId: 'mock_tx_id_for_mvp',
        status: 'submitted'
      })
    } catch (error: any) {
      console.error('Error removing opt-in:', error)
      
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
