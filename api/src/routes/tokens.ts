import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import xrpl from 'xrpl'
import { withClient } from '../lib/xrplClient.js'

function normalizeCurrencyCode(code: string): string {
  const upper = code.toUpperCase()
  if (upper.length === 3) return upper
  return Buffer.from(upper, 'ascii').toString('hex').padEnd(40, '0')
}

const BodySchema = z.object({
  currencyCode: z.string().min(3).max(40), // 'XRP' or issued currency code
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  destination: z.string().min(25),
  metadata: z.record(z.any()).optional()
})

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post('/issue', async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }
    const { currencyCode, amount, destination, metadata } = parsed.data

      // ⛔ IOU-only: reject native XRP
  if (currencyCode.toUpperCase() === 'XRP') {
    return reply.status(400).send({
      ok: false,
      error: 'XRP is native and cannot be issued. Use a 3-letter code (e.g., EUR) or 40-hex for custom codes.'
    })
  }

    const seed = process.env.ISSUER_SEED
    if (!seed) return reply.status(500).send({ error: 'Missing ISSUER_SEED in env' })

    const memoData = metadata ? Buffer.from(JSON.stringify(metadata)).toString('hex') : undefined
    const memo: xrpl.Memo | undefined = memoData ? { Memo: { MemoData: memoData } } : undefined

    try {
      const result = await withClient(async (client) => {
        const wallet = xrpl.Wallet.fromSeed(seed)
        const accountInfo = await client.request({ command: 'account_info', account: wallet.address })

        if (currencyCode.toUpperCase() === 'XRP') {
          // Simple XRP payment (connectivity test)
          const tx: xrpl.Payment = {
            TransactionType: 'Payment',
            Account: wallet.address,
            Destination: destination,
            Amount: xrpl.xrpToDrops(amount),
            Memos: memo ? [memo] : undefined
          }
          const prepared = await client.autofill(tx)
          const signed = wallet.sign(prepared)
          const submit = await client.submitAndWait(signed.tx_blob)
          return { txHash: submit.result.hash, ledgerIndex: submit.result.validated_ledger_index }
        } else {
          // Issued currency payment (requires trust line on destination)
          // Currency code must be 3-char ISO or 160-bit hex. We'll assume 3-char here.
          const iouAmount: xrpl.IssuedCurrencyAmount = {
            currency: normalizeCurrencyCode(currencyCode),
            issuer: wallet.address,
            value: amount
          }
          const tx: xrpl.Payment = {
            TransactionType: 'Payment',
            Account: wallet.address,
            Destination: destination,
            Amount: iouAmount,
            Memos: memo ? [memo] : undefined
          }
          const prepared = await client.autofill(tx)
          const signed = wallet.sign(prepared)
          const submit = await client.submitAndWait(signed.tx_blob)
          return { txHash: submit.result.hash, ledgerIndex: submit.result.validated_ledger_index }
        }
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
        hint: 'For issued currencies, ensure the destination has a TrustSet to the issuer with sufficient limit.'
      })
    }
  })
}
