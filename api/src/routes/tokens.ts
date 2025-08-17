import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../adapters/index.js'

// ---------- validation ----------
const BodySchema = z.object({
  currencyCode: z.string().min(3).max(160),
  amount: z.string().regex(/^[0-9]+(\.[0-9]+)?$/),
  destination: z.string().startsWith('r'), // XRPL-style address (ok for now)
  metadata: z.record(z.any()).optional(),
})
type IssueBody = z.infer<typeof BodySchema>

export default async function tokensRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post('/issue', {
    schema: {
      summary: 'Issue a token from issuer to holder',
      description:
        'Issues an IOU payment from the issuer account to the holder. Accepts 3-char codes (USD/EUR) or longer ASCII codes which are normalized (by the adapter) to 160-bit hex for XRPL. Holder must have a TrustSet with sufficient limit.',
      tags: ['tokens'],
      body: {
        type: 'object',
        required: ['currencyCode', 'amount', 'destination'],
        properties: {
          currencyCode: {
            type: 'string',
            minLength: 3,
            maxLength: 160,
            description: '3-char code (e.g., USD) or longer ASCII; long codes auto-convert to hex-160 by the adapter.',
          },
          amount: {
            type: 'string',
            pattern: '^[0-9]+(\\.[0-9]+)?$',
            description: 'Token amount as a string to preserve precision.',
          },
          destination: { type: 'string', description: 'Holder address (r-addr on XRPL).' },
          metadata: {
            type: 'object',
            additionalProperties: true,
            description: 'Optional arbitrary metadata encoded in a transaction Memo.',
            default: {},
          },
        },
        examples: [
          {
            currencyCode: 'MARKS',
            amount: '100',
            destination: 'rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw',
            metadata: { jurisdiction: 'DE' },
          },
        ],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            txHash: { type: 'string' },
            explorer: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            error: { type: 'string' },
            hint: { type: 'string' },
          },
        },
        500: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ ok: false, error: parsed.error.message })

    const { currencyCode, amount, destination, metadata }: IssueBody = parsed.data
    const adapter = getLedgerAdapter()

    try {
      const { txHash } = await adapter.issueToken({ currencyCode, amount, destination, metadata })
      const explorerBase =
        process.env.EXPLORER_URL ||
        (adapter.name === 'XRPL' ? 'https://testnet.xrpl.org' : undefined)

      return reply.send({
        ok: true,
        txHash,
        explorer: explorerBase ? `${explorerBase}/transactions/${txHash}` : undefined,
      })
    } catch (e: any) {
      return reply.status(400).send({
        ok: false,
        error: e?.data || e?.message || String(e),
        hint: 'Ensure the holder has a TrustSet with sufficient limit for this currency/issuer.',
      })
    }
  })
}
