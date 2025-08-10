// src/routes/trustlines.ts
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
  currencyCode: z.string().min(3).max(40),      // e.g., 'EURT'
  limit: z.string().regex(/^\d+(\.\d+)?$/).default('1000000'),
  // optional: override holder seed via body if you don't want it in .env
  holderSeed: z.string().optional()
})

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post('/', async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const { currencyCode, limit, holderSeed } = parsed.data

    const issuerSeed = process.env.ISSUER_SEED
    const envHolderSeed = process.env.DESTINATION_SEED
    if (!issuerSeed) return reply.status(500).send({ error: 'Missing ISSUER_SEED in env' })
    const holderSecret = holderSeed || envHolderSeed
    if (!holderSecret) return reply.status(400).send({ error: 'Provide holderSeed in body or set DESTINATION_SEED in env' })

    try {
      const res = await withClient(async (client) => {
        const issuer = xrpl.Wallet.fromSeed(issuerSeed)
        const holder = xrpl.Wallet.fromSeed(holderSecret)
        const currency = normalizeCurrencyCode(currencyCode)

        // check if trust line already exists (and limit sufficient)
        const lines = await client.request({
          command: 'account_lines',
          account: holder.address,
          peer: issuer.address,
          ledger_index: 'validated'
        })

        const existing = (lines.result.lines || []).find((l: any) => l.currency === currency)
        if (existing) {
          // if existing limit is high enough, no need to set again
          if (Number(existing.limit) >= Number(limit)) {
            return { already: true, txHash: null }
          }
        }

        const tx: xrpl.TrustSet = {
          TransactionType: 'TrustSet',
          Account: holder.address,
          LimitAmount: { currency, issuer: issuer.address, value: String(limit) }
        }
        const prepared = await client.autofill(tx)
        const signed = holder.sign(prepared)
        const submit = await client.submitAndWait(signed.tx_blob)
        return { already: false, txHash: submit.result.hash }
      })

      return reply.send({
        ok: true,
        alreadyExisted: res.already,
        txHash: res.txHash,
        explorer: res.txHash ? `https://testnet.xrpl.org/transactions/${res.txHash}` : undefined
      })
    } catch (e: any) {
      return reply.status(400).send({ ok: false, error: e?.data || e?.message || String(e) })
    }
  })
}
