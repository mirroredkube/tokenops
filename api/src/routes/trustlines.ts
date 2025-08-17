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

export default async function trustlineRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
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
