import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../adapters/index.js'

// ---------- validation ----------
const BodySchema = z.object({
  currencyCode: z.string().min(3).max(160),
  limit: z.string().regex(/^[0-9]+(\.[0-9]+)?$/), // keep as string for precision
  holderSecret: z.string().min(16),               // dev-only seed
})
type CreateTrustlineBody = z.infer<typeof BodySchema>

const CheckTrustlineSchema = z.object({
  account: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/),
  peer: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/),
  currency: z.string().optional(),
  ledger_index: z.string().optional().default('validated')
})
type CheckTrustlineBody = z.infer<typeof CheckTrustlineSchema>

export default async function trustlineRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Check trustline existence
  app.post('/check', {
    schema: {
      summary: 'Check if a trustline exists between holder and issuer',
      description: 'Uses XRPL account_lines command to check if a trustline exists for a specific currency',
      tags: ['trustlines'],
      body: {
        type: 'object',
        required: ['account', 'peer'],
        properties: {
          account: {
            type: 'string',
            pattern: '^r[a-zA-Z0-9]{24,34}$',
            description: 'Holder account address (r-address)',
          },
          peer: {
            type: 'string',
            pattern: '^r[a-zA-Z0-9]{24,34}$',
            description: 'Issuer account address (r-address)',
          },
          currency: {
            type: 'string',
            description: 'Optional currency filter (3-char code or hex)',
          },
          ledger_index: {
            type: 'string',
            description: 'Ledger index to query (default: validated)',
            default: 'validated'
          },
        },
        examples: [{ account: 'rHolder123...', peer: 'rIssuer456...', ledger_index: 'validated' }],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            account: { type: 'string' },
            peer: { type: 'string' },
            lines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  account: { type: 'string' },
                  balance: { type: 'string' },
                  currency: { type: 'string' },
                  limit: { type: 'string' },
                  limit_peer: { type: 'string' },
                  quality_in: { type: 'number' },
                  quality_out: { type: 'number' },
                  no_ripple: { type: 'boolean' },
                  no_ripple_peer: { type: 'boolean' },
                  authorized: { type: 'boolean' },
                  peer_authorized: { type: 'boolean' },
                  freeze: { type: 'boolean' },
                  freeze_peer: { type: 'boolean' }
                }
              }
            }
          },
        },
        400: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
        500: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const parsed = CheckTrustlineSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ ok: false, error: parsed.error.message })

    const { account, peer, currency, ledger_index }: CheckTrustlineBody = parsed.data
    const adapter = getLedgerAdapter()

    try {
      // Use the XRPL adapter to call account_lines directly
      const lines = await adapter.getAccountLines({ account, peer, ledger_index })
      
      // Filter by currency if provided (handle both ASCII and hex)
      const filteredLines = currency 
        ? lines.filter(line => {
            // Direct match
            if (line.currency === currency) return true
            
            // Handle hex currency codes
            if (currency.length === 3) {
              // Convert 3-letter currency to hex and compare
              const hexCurrency = Buffer.from(currency, 'ascii').toString('hex').toUpperCase()
              if (line.currency === hexCurrency) return true
            }
            
            // Handle hex to ASCII conversion
            if (line.currency.length === 40 && line.currency.match(/^[0-9A-F]+$/)) {
              try {
                const asciiCurrency = Buffer.from(line.currency, 'hex').toString('ascii').replace(/\0/g, '')
                if (asciiCurrency === currency) return true
              } catch (e) {
                // Ignore conversion errors
              }
            }
            
            return false
          })
        : lines
      
      return reply.send({
        ok: true,
        account,
        peer,
        currency: currency || null,
        lines: filteredLines || [],
        // Also provide a cleaner structure for easy consumption
        result: {
          exists: filteredLines.length > 0,
          lines: filteredLines.map(line => ({
            currency: line.currency,
            account: line.account,
            limit: line.limit,
            balance: line.balance,
            authorized: Boolean(line.authorized),
            no_ripple: Boolean(line.no_ripple),
            freeze: Boolean(line.freeze),
            quality_in: line.quality_in ?? 0,
            quality_out: line.quality_out ?? 0,
          }))
        }
      })
    } catch (e: any) {
      return reply.status(400).send({ ok: false, error: e?.data || e?.message || String(e) })
    }
  })

  app.post('/create', {
    schema: {
      summary: 'Create/Set a trust line (Holder → Issuer)',
      description:
        'Holder establishes a trust line to the issuer for a given currency and limit. 3-char codes or longer ASCII are normalized by the adapter.',
      tags: ['trustlines'],
      body: {
        type: 'object',
        required: ['currencyCode', 'limit', 'holderSecret'],
        properties: {
          currencyCode: {
            type: 'string',
            minLength: 3,
            maxLength: 160,
            description: '3-char code (EUR) or longer ASCII; adapter handles hex conversion.',
          },
          limit: {
            type: 'string',
            pattern: '^[0-9]+(\\.[0-9]+)?$',
            description: 'Trust line limit as a string to preserve precision.',
          },
          holderSecret: {
            type: 'string',
            description: 'DEV ONLY: Family seed of the holder (used to sign the TrustSet).',
          },
        },
        examples: [{ currencyCode: 'EURF', limit: '1000000', holderSecret: 'sEd7...DEV_ONLY...' }],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            alreadyExisted: { type: 'boolean' },
            txHash: { type: 'string', nullable: true },
            explorer: { type: 'string', nullable: true },
          },
        },
        400: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
        500: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ ok: false, error: parsed.error.message })

    const { currencyCode, limit, holderSecret }: CreateTrustlineBody = parsed.data
    const adapter = getLedgerAdapter()

    try {
      const { alreadyExisted, txHash } = await adapter.createTrustline({ currencyCode, limit, holderSecret })
      const explorerBase =
        process.env.EXPLORER_URL ||
        (adapter.name === 'XRPL' ? 'https://testnet.xrpl.org' : undefined)

      return reply.send({
        ok: true,
        alreadyExisted: !!alreadyExisted,
        txHash: txHash || undefined,
        explorer: txHash && explorerBase ? `${explorerBase}/transactions/${txHash}` : undefined,
      })
    } catch (e: any) {
      return reply.status(400).send({ ok: false, error: e?.data || e?.message || String(e) })
    }
  })
}
