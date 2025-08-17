import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import xrpl, { Wallet, Client } from 'xrpl'
import { withClient } from '../lib/xrplClient.js'
import { currencyToHex, isHexCurrency } from '../utils/currency.js'

// ----------------------------- helpers ---------------------------------------

function normalizeCurrency(code: string): string {
  const upper = code.trim().toUpperCase()
  if (upper === 'XRP') return 'XRP'
  if (upper.length === 3) return upper
  if (isHexCurrency(upper)) return upper
  return currencyToHex(upper) // convert long ASCII to 160-bit hex
}

function jsonToHexMemo(obj: unknown): xrpl.Memo[] | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  try {
    const json = JSON.stringify(obj)
    const hex = Buffer.from(json, 'utf8').toString('hex').toUpperCase()
    return [{ Memo: { MemoData: hex } }]
  } catch {
    return undefined
  }
}

async function submitAndWait(client: Client, tx: any, wallet: Wallet) {
  // Autofill (Fee, Sequence, LastLedgerSequence)
  const prepared = await client.autofill(tx)
  const signed = wallet.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)
  const txHash = signed.hash
  // Throw if not validated successfully
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
  amount: z.string().regex(/^[0-9]+(\.[0-9]+)?$/),
  destination: z.string().startsWith('r'),
  metadata: z.record(z.any()).optional(),
})
type IssueBody = z.infer<typeof BodySchema>

// ------------------------------ plugin ---------------------------------------

export default async function tokensRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // POST /tokens/issue
  app.post('/issue', {
    schema: {
      summary: 'Issue a token from issuer to holder',
      description:
        'Issues an IOU payment from the issuer account to the holder. Accepts 3-char codes (USD/EUR) or longer ASCII codes which are normalized to 160-bit hex for XRPL. Holder must have a TrustSet with sufficient limit.',
      tags: ['tokens'],
      body: {
        type: 'object',
        required: ['currencyCode', 'amount', 'destination'],
        properties: {
          currencyCode: {
            type: 'string',
            minLength: 3,
            maxLength: 160,
            description: '3-char code (e.g., USD) or longer ASCII; long codes auto-convert to hex-160.',
          },
          amount: {
            type: 'string',
            pattern: '^[0-9]+(\\.[0-9]+)?$',
            description: 'Token amount as a string to preserve precision.',
          },
          destination: {
            type: 'string',
            description: 'Holder r-address on XRPL.',
          },
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
          example: {
            ok: true,
            txHash: 'ABCDEF1234...',
            explorer: 'https://testnet.xrpl.org/transactions/ABCDEF1234...',
          },
        },
        400: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            error: { type: 'string' },
            hint: { type: 'string' },
          },
          example: {
            ok: false,
            error: 'temBAD_AMOUNT',
            hint: 'Ensure the holder has a TrustSet with sufficient limit for this currency/issuer.',
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
    // Zod validation (runtime safety)
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, error: parsed.error.message })
    }
    const { currencyCode, amount, destination, metadata }: IssueBody = parsed.data

    // Disallow native XRP for issuance
    const finalCurrency = normalizeCurrency(currencyCode)
    if (finalCurrency === 'XRP') {
      return reply.status(400).send({ ok: false, error: 'Use native XRP payments for XRP; issuance is for IOUs only.' })
    }

    // Load issuer wallet (env)
    const seed = process.env.ISSUER_SEED || process.env.ISSUER_SECRET
    if (!seed) {
      return reply.status(500).send({ ok: false, error: 'Missing ISSUER_SEED in environment' })
    }
    const issuerWallet = Wallet.fromSeed(seed)
    const issuerAddress = issuerWallet.address

    try {
      const { txHash } = await withClient(async (client: Client) => {
        // Construct issued currency amount object
        const iouAmount: xrpl.IssuedCurrencyAmount = {
          currency: finalCurrency,
          value: amount,
          issuer: issuerAddress,
        }

        const tx: xrpl.Payment = {
          TransactionType: 'Payment',
          Account: issuerAddress,
          Destination: destination,
          Amount: iouAmount,
          // Attach metadata as Memo (optional)
          Memos: jsonToHexMemo(metadata),
        }

        return await submitAndWait(client, tx, issuerWallet)
      })

      return reply.send({
        ok: true,
        txHash,
        explorer: `https://testnet.xrpl.org/transactions/${txHash}`,
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
