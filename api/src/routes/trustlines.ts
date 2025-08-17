import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import xrpl, { Wallet, Client } from 'xrpl'
import { withClient } from '../lib/xrplClient.js'
import { currencyToHex, isHexCurrency } from '../utils/currency.js'

// ----------------------------- helpers ---------------------------------------

function normalizeCurrency(code: string): string {
  const upper = code.trim().toUpperCase()
  if (upper === 'XRP') throw new Error('Trust lines are for IOUs, not native XRP.')
  if (upper.length === 3) return upper
  if (isHexCurrency(upper)) return upper
  return currencyToHex(upper) // convert long ASCII to 160-bit hex
}

async function submitAndWait(client: Client, tx: any, wallet: Wallet) {
  const prepared = await client.autofill(tx)
  const signed = wallet.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)
  const txHash = signed.hash
  const meta = result.result?.meta as any
  const status = result.result?.engine_result || meta?.TransactionResult
  if (status && status !== 'tesSUCCESS') {
    const err = new Error(status)
    ;(err as any).data = result.result
    throw err
  }
  return { txHash, result }
}

// ----------------------------- validation ------------------------------------

const BodySchema = z.object({
  currencyCode: z.string().min(3).max(160),
  limit: z.string().regex(/^[0-9]+(\.[0-9]+)?$/), // string to preserve precision
  holderSecret: z.string().min(16),               // dev-only seed (e.g., starts with sEd...)
})
type CreateTrustlineBody = z.infer<typeof BodySchema>

// ------------------------------ plugin ---------------------------------------

export default async function trustlineRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post('/create', {
    schema: {
      summary: 'Create/Set a trust line (Holder → Issuer)',
      description:
        'Holder establishes a trust line to the issuer for a given currency and limit. Accepts 3-char codes (EUR/USD) or longer ASCII which are normalized to 160-bit hex.',
      tags: ['trustlines'],
      body: {
        type: 'object',
        required: ['currencyCode', 'limit', 'holderSecret'],
        properties: {
          currencyCode: {
            type: 'string',
            minLength: 3,
            maxLength: 160,
            description: '3-char code (EUR) or longer ASCII; long codes auto-convert to hex-160.',
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
        examples: [{
          currencyCode: 'EURF',
          limit: '1000000',
          holderSecret: 'sEd7...DEV_ONLY...',
        }],
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
          example: {
            ok: true,
            alreadyExisted: false,
            txHash: 'ABCDEF1234...',
            explorer: 'https://testnet.xrpl.org/transactions/ABCDEF1234...',
          },
        },
        400: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, error: parsed.error.message })
    }
    const { currencyCode, limit, holderSecret }: CreateTrustlineBody = parsed.data

    const issuerAddress =
      process.env.ISSUER_ADDRESS
      || (process.env.ISSUER_SEED ? Wallet.fromSeed(process.env.ISSUER_SEED).address : undefined)
      || (process.env.ISSUER_SECRET ? Wallet.fromSeed(process.env.ISSUER_SECRET).address : undefined)

    if (!issuerAddress) {
      return reply.status(500).send({ ok: false, error: 'Missing ISSUER_ADDRESS or ISSUER_SEED in environment' })
    }

    let finalCurrency: string
    try {
      finalCurrency = normalizeCurrency(currencyCode)
    } catch (e: any) {
      return reply.status(400).send({ ok: false, error: e?.message || String(e) })
    }

    try {
      const holderWallet = Wallet.fromSeed(holderSecret)
      const holderAddress = holderWallet.address

      const result = await withClient(async (client: Client) => {
        // Check if trust line already exists (and if limit is sufficient)
        const lines = await client.request({
          command: 'account_lines',
          account: holderAddress,
          ledger_index: 'validated',
          peer: issuerAddress, // filter to just this issuer
        } as any)

        const existing = (lines.result.lines || []).find((l: any) => l.currency === finalCurrency)
        if (existing) {
          // If existing limit is already >= requested, treat as already established
          if (Number(existing.limit) >= Number(limit)) {
            return { already: true, txHash: null as string | null }
          }
          // else fall through to increase limit
        }

        const tx: xrpl.TrustSet = {
          TransactionType: 'TrustSet',
          Account: holderAddress,
          LimitAmount: {
            currency: finalCurrency,
            issuer: issuerAddress,
            value: limit,
          },
          // You can add Flags here (e.g., xrpl.TrustSetFlags.tfSetNoRipple) if you expose it in UI later.
        }

        const { txHash } = await submitAndWait(client, tx, holderWallet)
        return { already: false, txHash }
      })

      return reply.send({
        ok: true,
        alreadyExisted: result.already,
        txHash: result.txHash || undefined,
        explorer: result.txHash ? `https://testnet.xrpl.org/transactions/${result.txHash}` : undefined,
      })
    } catch (e: any) {
      return reply.status(400).send({ ok: false, error: e?.data || e?.message || String(e) })
    }
  })
}
