import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../adapters/index.js'
import { currencyToHex, isHexCurrency, hexCurrencyToAscii } from '../utils/currency.js'

// ---------- validation ----------
const OptInSetupSchema = z.object({
  currencyCode: z.string().min(3).max(160),
  limit: z.string().regex(/^[0-9]+(\.[0-9]+)?$/), // keep as string for precision
  holderSecret: z.string().min(16),               // dev-only seed
})
type OptInSetupBody = z.infer<typeof OptInSetupSchema>

const OptInCheckSchema = z.object({
  account: z.string().min(1),
  peer: z.string().min(1),
  currency: z.string().optional(),
  ledger_index: z.string().optional().default('validated')
})
type OptInCheckBody = z.infer<typeof OptInCheckSchema>

// Helper function to normalize currency for comparison
const normalizeCurrency = (currency: string) => {
  const up = currency.trim().toUpperCase()
  if (up === 'XRP') return { ascii: 'XRP', hex: undefined }
  if (isHexCurrency(up)) return { ascii: hexCurrencyToAscii(up), hex: up }
  return { ascii: up, hex: currencyToHex(up) }
}

export default async function optInRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Check Opt-In status (ledger-agnostic)
  app.post('/check', {
    schema: {
      summary: 'Check Opt-In status between holder and issuer',
      description: 'Uses ledger-specific commands to check if a holder has opted into an asset (trustline/associate/ATA)',
      tags: ['opt-in'],
      body: {
        type: 'object',
        required: ['account', 'peer'],
        properties: {
          account: {
            type: 'string',
            description: 'Holder account address',
          },
          peer: {
            type: 'string',
            description: 'Issuer account address',
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
    const parsed = OptInCheckSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ ok: false, error: parsed.error.message })

    const { account, peer, currency, ledger_index }: OptInCheckBody = parsed.data
    const adapter = getLedgerAdapter()

    try {
      // Use the adapter to call account_lines directly
      const lines = await adapter.getAccountLines({ account, peer, ledger_index })
      
      console.log('Raw lines from XRPL:', lines)
      console.log('Looking for currency:', currency)
      
      // Filter by currency if provided
      const filteredLines = currency 
        ? lines.filter((line: any) => {
            const lineCurrency = line.currency?.toUpperCase()
            const { ascii, hex } = normalizeCurrency(currency)
            
            // Check if line currency matches either ASCII or hex version
            const matches = lineCurrency === ascii || lineCurrency === hex
            console.log(`Comparing: ${lineCurrency} === ${ascii} (ASCII) or ${hex} (HEX) = ${matches}`)
            return matches
          })
        : lines

      console.log('Filtered lines:', filteredLines)

      return reply.send({
        ok: true,
        account,
        peer,
        lines: filteredLines
      })
    } catch (error: any) {
      console.error('Error in opt-in check:', error)
      return reply.status(500).send({ ok: false, error: error.message })
    }
  })

  // Setup Opt-In (ledger-agnostic)
  app.post('/setup', {
    schema: {
      summary: 'Setup Opt-In between holder and issuer',
      description: 'Creates Opt-In for a specific currency with a given limit (trustline/associate/ATA)',
      tags: ['opt-in'],
      body: {
        type: 'object',
        required: ['currencyCode', 'limit', 'holderSecret'],
        properties: {
          currencyCode: {
            type: 'string',
            minLength: 3,
            maxLength: 160,
            description: 'Currency code (3-char or hex)',
          },
          limit: {
            type: 'string',
            pattern: '^[0-9]+(\\.[0-9]+)?$',
            description: 'Opt-In limit amount',
          },
          holderSecret: {
            type: 'string',
            minLength: 16,
            description: 'Holder wallet secret (dev-only)',
          },
        },
        examples: [{ currencyCode: 'USD', limit: '1000000', holderSecret: 's...' }],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            txHash: { type: 'string' },
            alreadyExisted: { type: 'boolean' },
          },
        },
        400: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
        500: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const parsed = OptInSetupSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ ok: false, error: parsed.error.message })

    const { currencyCode, limit, holderSecret }: OptInSetupBody = parsed.data
    const adapter = getLedgerAdapter()

    try {
      const result = await adapter.createTrustline({ currencyCode, limit, holderSecret })
      return reply.send({
        ok: true,
        txHash: result.txHash,
        alreadyExisted: result.alreadyExisted
      })
    } catch (error: any) {
      return reply.status(500).send({ ok: false, error: error.message })
    }
  })
}
