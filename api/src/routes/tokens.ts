import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import xrpl from 'xrpl'
import { withClient } from '../lib/xrplClient.js'
import { currencyToHex, isHexCurrency } from '../utils/currency.js'

function normalizeCurrency(code: string): string {
  const upper = code.trim().toUpperCase()
  if (upper === 'XRP') return 'XRP'
  if (upper.length === 3) return upper
  if (isHexCurrency(upper)) return upper
  return currencyToHex(upper)
}

const BodySchema = z.object({
  currencyCode: z.string().min(3).max(40),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  destination: z.string().min(25),
  metadata: z.record(z.any()).optional()
})

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post('/issue', async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ ok: false, error: parsed.error.flatten() })

    const { currencyCode, amount, destination, metadata } = parsed.data
    if (currencyCode.trim().toUpperCase() === 'XRP') {
      return reply.status(400).send({ ok: false, error: 'XRP is native and cannot be issued.' })
    }
    const finalCurrency = normalizeCurrency(currencyCode)

    const seed = process.env.ISSUER_SEED
    if (!seed) return reply.status(500).send({ ok: false, error: 'Missing ISSUER_SEED in env' })

    const memoData = metadata ? Buffer.from(JSON.stringify(metadata)).toString('hex') : undefined
    const memo: xrpl.Memo | undefined = memoData ? { Memo: { MemoData: memoData } } : undefined

    try {
      const result = await withClient(async (client) => {
        const wallet = xrpl.Wallet.fromSeed(seed)
        const basePayment: xrpl.Payment = {
          TransactionType: 'Payment',
          Account: wallet.address,
          Destination: destination,
          Amount: {
            currency: finalCurrency,
            issuer: wallet.address,
            value: amount
          } as xrpl.IssuedCurrencyAmount,
          Memos: memo ? [memo] : undefined
        }

        for (let attempt = 1; attempt <= 4; attempt++) {
          try {
            const { result: { ledger_current_index } } = await client.request({ command: 'ledger_current' })
            const prepared = await client.autofill({
              ...basePayment,
              LastLedgerSequence: ledger_current_index + 30
            })
            const signed = wallet.sign(prepared)
            const submit = await client.submitAndWait(signed.tx_blob)
            return { txHash: submit.result.hash, ledgerIndex: submit.result.validated_ledger_index }
          } catch (err: any) {
            const msg = (err?.data || err?.message || '').toString()
            const looksExpired =
              msg.includes('tefMAX_LEDGER') ||
              msg.includes('latest ledger sequence') ||
              msg.includes('pastSeq') ||
              msg.includes('tooLATE') ||
              msg.includes('expired')

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
        txHash: result.txHash,
        explorer: `https://testnet.xrpl.org/transactions/${result.txHash}`
      })
    } catch (e: any) {
      return reply.status(400).send({
        ok: false,
        error: e?.data || e?.message || String(e),
        hint: 'Ensure the holder has a TrustSet with sufficient limit for this currency/issuer.'
      })
    }
  })
}
