import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../../adapters/index.js'
import { currencyToHex, isHexCurrency, hexCurrencyToAscii } from '../../utils/currency.js'

// ---------- validation ----------
const AssetKeySchema = z.object({
  ledgerId: z.string().min(1),
  assetKey: z.string().min(1)
})

const HolderSchema = z.object({
  ledgerId: z.string().min(1),
  assetKey: z.string().min(1),
  holder: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/)
})

const OptInParamsSchema = z.object({
  params: z.object({
    limit: z.string().regex(/^[0-9]{1,16}$/).optional()
  }).optional(),
  signing: z.object({
    mode: z.enum(['wallet', 'server']).default('server')
  }).optional()
})

const IssuanceSchema = z.object({
  to: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/),
  amount: z.string().regex(/^[0-9]{1,16}$/),
  complianceRef: z.object({
    recordId: z.string().min(1),
    sha256: z.string().min(1)
  }).optional(),
  anchor: z.boolean().default(true)
})

export default async function ledgerRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // 1. GET opt-in status
  app.get('/ledgers/:ledgerId/assets/:assetKey/opt-ins/:holder', {
    schema: {
      summary: 'Get opt-in status for a holder and asset',
      description: 'Check if a holder has opted into an asset (XRPL = trustline)',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['ledgerId', 'assetKey', 'holder'],
        properties: {
          ledgerId: { type: 'string', description: 'Ledger identifier (e.g., xrpl)' },
          assetKey: { type: 'string', description: 'Asset key (e.g., rISSUER.USD)' },
          holder: { type: 'string', description: 'Holder account address' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ledger: { type: 'string' },
            asset: { type: 'string' },
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
        502: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const parsed = HolderSchema.safeParse(req.params)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid parameters' })
    }

    const { ledgerId, assetKey, holder } = parsed.data
    
    // Parse asset key (format: rISSUER.CODE)
    const parts = assetKey.split('.')
    if (parts.length !== 2) {
      return reply.status(400).send({ error: 'Invalid asset key format. Expected: rISSUER.CODE' })
    }
    
    const [issuer, code] = parts
    
    try {
      const adapter = getLedgerAdapter()
      const lines = await adapter.getAccountLines({ 
        account: holder, 
        peer: issuer, 
        ledger_index: 'validated' 
      })
      
      // Find the specific currency line
      const line = lines.find((l: any) => {
        const lineCurrency = l.currency?.toUpperCase()
        
        if (isHexCurrency(code)) {
          return lineCurrency === code
        } else {
          return lineCurrency === code || lineCurrency === currencyToHex(code)
        }
      })
      
      if (!line) {
        return reply.send({
          ledger: ledgerId,
          asset: assetKey,
          holder,
          exists: false
        })
      }
      
      return reply.send({
        ledger: ledgerId,
        asset: assetKey,
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
      return reply.status(502).send({ error: 'Ledger connection error' })
    }
  })

  // 2. PUT create/update opt-in
  app.put('/ledgers/:ledgerId/assets/:assetKey/opt-ins/:holder', {
    schema: {
      summary: 'Create or update opt-in for a holder and asset',
      description: 'Create trustline (XRPL) or equivalent opt-in mechanism',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['ledgerId', 'assetKey', 'holder'],
        properties: {
          ledgerId: { type: 'string' },
          assetKey: { type: 'string' },
          holder: { type: 'string' }
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
        200: {
          type: 'object',
          properties: {
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
    const parsed = HolderSchema.safeParse(req.params)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid parameters' })
    }

    const body = OptInParamsSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body' })
    }

    const { ledgerId, assetKey, holder } = parsed.data
    const { params, signing } = body.data
    
    // Parse asset key
    const parts = assetKey.split('.')
    if (parts.length !== 2) {
      return reply.status(400).send({ error: 'Invalid asset key format' })
    }
    
    const [issuer, code] = parts
    const limit = params?.limit || '1000000000' // Safe high default
    const mode = signing?.mode || 'server'
    
    try {
      const adapter = getLedgerAdapter()
      
      // For MVP, we'll use server-side signing
      if (mode === 'wallet') {
        // TODO: Implement wallet integration
        return reply.status(400).send({ error: 'Wallet mode not implemented yet' })
      }
      
      // Use existing createTrustline method
      const result = await adapter.createTrustline({
        currencyCode: code,
        limit,
        holderSecret: process.env.HOLDER_SECRET || '' // For MVP, use env var
      })
      
      return reply.send({
        txId: result.txHash,
        status: 'submitted'
      })
    } catch (error: any) {
      console.error('Error creating opt-in:', error)
      
      if (error.message?.includes('reserve')) {
        return reply.status(422).send({ 
          error: 'Insufficient reserve', 
          reason: 'INSUFFICIENT_RESERVE' 
        })
      }
      
      return reply.status(502).send({ error: 'Ledger connection error' })
    }
  })

  // 3. POST create issuance
  app.post('/ledgers/:ledgerId/assets/:assetKey/issuances', {
    schema: {
      summary: 'Issue tokens to a holder',
      description: 'Issue tokens with optional compliance anchoring',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['ledgerId', 'assetKey'],
        properties: {
          ledgerId: { type: 'string' },
          assetKey: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['to', 'amount'],
        properties: {
          to: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$' },
          amount: { type: 'string', pattern: '^[0-9]{1,16}$' },
          complianceRef: {
            type: 'object',
            properties: {
              recordId: { type: 'string' },
              sha256: { type: 'string' }
            }
          },
          anchor: { type: 'boolean', default: true }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            issuanceId: { type: 'string' },
            txId: { type: 'string' },
            explorer: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        422: { type: 'object', properties: { error: { type: 'string' } } },
        502: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const parsed = AssetKeySchema.safeParse(req.params)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid parameters' })
    }

    const body = IssuanceSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body' })
    }

    const { ledgerId, assetKey } = parsed.data
    const { to, amount, complianceRef, anchor } = body.data
    
    // Parse asset key
    const parts = assetKey.split('.')
    if (parts.length !== 2) {
      return reply.status(400).send({ error: 'Invalid asset key format' })
    }
    
    const [issuer, code] = parts
    
    try {
      const adapter = getLedgerAdapter()
      
      // Pre-flight checks
      const lines = await adapter.getAccountLines({ 
        account: to, 
        peer: issuer, 
        ledger_index: 'validated' 
      })
      
      const line = lines.find((l: any) => {
        const lineCurrency = l.currency?.toUpperCase()
        
        if (isHexCurrency(code)) {
          return lineCurrency === code
        } else {
          return lineCurrency === code || lineCurrency === currencyToHex(code)
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
        currencyCode: code,
        amount,
        destination: to,
        metadata: anchor && complianceRef ? { 
          recordId: complianceRef.recordId, 
          sha256: complianceRef.sha256 
        } : undefined
      })
      
      const issuanceId = `iss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      return reply.status(201).send({
        issuanceId,
        txId: result.txHash,
        explorer: `https://testnet.xrpl.org/transactions/${result.txHash}`
      })
    } catch (error: any) {
      console.error('Error issuing tokens:', error)
      return reply.status(502).send({ error: 'Ledger connection error' })
    }
  })

  // 4. GET issuance status
  app.get('/ledgers/:ledgerId/assets/:assetKey/issuances/:id', {
    schema: {
      summary: 'Get issuance status',
      description: 'Fetch issuance details and transaction status',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['ledgerId', 'assetKey', 'id'],
        properties: {
          ledgerId: { type: 'string' },
          assetKey: { type: 'string' },
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            issuanceId: { type: 'string' },
            txId: { type: 'string' },
            to: { type: 'string' },
            amount: { type: 'string' },
            complianceRef: {
              type: 'object',
              properties: {
                recordId: { type: 'string' },
                sha256: { type: 'string' }
              }
            },
            anchored: { type: 'boolean' },
            status: { type: 'string' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    // For MVP, we'll return a simple response
    // TODO: Store issuance records in database
    return reply.status(404).send({ error: 'Issuance not found (not implemented yet)' })
  })
}
