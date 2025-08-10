import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import xrpl from 'xrpl'
import { withClient } from '../lib/xrplClient.js'
import { currencyToHex, isHexCurrency } from '../utils/currency.js'

function normalizeCurrency(code: string): string {
  const upper = code.trim().toUpperCase()
  if (upper.length === 3) return upper
  if (isHexCurrency(upper)) return upper
  return currencyToHex(upper)
}

const BodySchema = z.object({
  currencyCode: z.string().min(3).max(40),
  limit: z.string().regex(/^\d+(\.\d+)?$/).default('1000000'),
  holderSeed: z.string().optional()
})

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // prefix in index.ts should be { prefix: '/trustlines' }
  app.post('/', async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ ok: false, error: parsed.error.flatten() })

    const { currencyCode, limit, holderSeed } = parsed.data
    const issuerSeed = process.env.ISSUER_SEED
    const envHolderSeed = process.env.DESTINATION_SEED
    if (!issuerSeed) return reply.status(500).send({ ok: false, error: 'Missing ISSUER_SEED in env' })
    const holderSecret = holderSeed || envHolderSeed
    if (!holderSecret) return reply.status(400).send({ ok: false, error: 'Provide holderSeed or set DESTINATION_SEED in env' })

    const finalCurrency = normalizeCurrency(currencyCode)

    try {
      const result = await withClient(async (client) => {
        const issuer = xrpl.Wallet.fromSeed(issuerSeed)
        const holder = xrpl.Wallet.fromSeed(holderSecret)

        // short-circuit if a sufficient line already exists
        const lines = await client.request({
          command: 'account_lines',
          account: holder.address,
          peer: issuer.address,
          ledger_index: 'validated'
        })
        const existing = (lines.result.lines || []).find(
          (l: any) => (l.currency || '').toUpperCase() === finalCurrency.toUpperCase()
        )
        if (existing && Number(existing.limit) >= Number(limit)) {
          return { already: true, txHash: null }
        }

        const baseTx: xrpl.TrustSet = {
          TransactionType: 'TrustSet',
          Account: holder.address,
          LimitAmount: { currency: finalCurrency, issuer: issuer.address, value: String(limit) }
        }

        // Submit with explicit LastLedgerSequence and retries
        for (let attempt = 1; attempt <= 4; attempt++) {
          try {
            const { result: { ledger_current_index } } = await client.request({ command: 'ledger_current' })
            const prepared = await client.autofill({
              ...baseTx,
              // give ~30 ledgers (~20s+) to survive brief network hiccups
              LastLedgerSequence: ledger_current_index + 30
            })
            const signed = holder.sign(prepared)
            const submit = await client.submitAndWait(signed.tx_blob)
            return { already: false, txHash: submit.result.hash }
          } catch (err: any) {
            const msg = (err?.data || err?.message || '').toString()
            const looksExpired =
              msg.includes('tefMAX_LEDGER') ||
              msg.includes('latest ledger sequence') ||
              msg.includes('pastSeq') ||
              msg.includes('tooLATE') ||
              msg.includes('expired')

            // sequence/fee/expired → retry with fresh LastLedgerSequence
            if (attempt < 4 && (looksExpired || msg.includes('terQUEUED') || msg.includes('tefPAST_SEQ'))) {
              await sleep(700)
              continue
            }
            throw err
          }
        }
        throw new Error('Failed to submit after retries')
      })

      return reply.send({
        ok: true,
        alreadyExisted: result.already,
        txHash: result.txHash,
        explorer: result.txHash ? `https://testnet.xrpl.org/transactions/${result.txHash}` : undefined
      })
    } catch (e: any) {
      return reply.status(400).send({ ok: false, error: e?.data || e?.message || String(e) })
    }
  })
}
