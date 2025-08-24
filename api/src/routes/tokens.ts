import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../adapters/index.js'
import prisma from '../db/client.js'
import { Wallet } from 'xrpl'

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

      // [ADDED] Persist Token + TokenEvent after successful issuance
      const token = await prisma.token.create({
        data: {
          currencyCode: currencyCode.toUpperCase(),
          amount,
          destination,
          issuer: process.env.ISSUER_ADDRESS || 
            (process.env.ISSUER_SEED && adapter.name === 'XRPL'
              ? Wallet.fromSeed(process.env.ISSUER_SEED).address
              : 'UNKNOWN'),
        },
      })

      await prisma.tokenEvent.create({
        data: {
          tokenId: token.id,
          type: 'ISSUE',
          ledgerTxHash: txHash,
          memo: `Issued on ${adapter.name}`,
        },
      })
      // [END ADDED]

      // Auto-create registry entry after successful issuance
      try {
        const ledger = adapter.name === 'XRPL' ? 'xrpl-testnet' : 'xrpl-mainnet' // Default to testnet for now
        const issuerAddress = process.env.ISSUER_ADDRESS || 
          (process.env.ISSUER_SEED && adapter.name === 'XRPL' ? 
            Wallet.fromSeed(process.env.ISSUER_SEED).address : undefined)

        if (issuerAddress) {
          await prisma.tokenRecord.upsert({
            where: { txHash },
            create: {
              ledger: ledger === 'xrpl-testnet' ? 'XRPL_TESTNET' : 'XRPL_MAINNET',
              symbol: currencyCode.toUpperCase(),
              supply: amount,
              issuerAddress,
              holderAddress: destination,
              txHash,
              compliance: metadata || undefined,
            },
            update: {
              compliance: metadata || undefined,
            },
          })
        }
      } catch (registryError: any) {
        // Log registry error but don't fail the issuance
        console.warn('Failed to create registry entry:', registryError?.message)
      }

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
