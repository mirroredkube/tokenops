import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import xrpl from 'xrpl'
import { withClient } from '../lib/xrplClient.js'

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/:account', async (req, reply) => {
    const { account } = req.params as { account: string }
    const { issuer, currency } = req.query as { issuer?: string; currency?: string }

    try {
      const result = await withClient(async (client) => {
        // Get XRP balance
        const accountInfo = await client.request({
          command: 'account_info',
          account: account,
          ledger_index: 'validated'
        })
        const xrpBalance = xrpl.dropsToXrp(accountInfo.result.account_data.Balance)

        // Get trust lines
        const linesRequest: any = {
          command: 'account_lines',
          account: account,
          ledger_index: 'validated'
        }
        if (issuer) linesRequest.peer = issuer
        if (currency) linesRequest.currency = currency

        const lines = await client.request(linesRequest)
        const trustLines = (lines.result.lines || []).map((line: any) => ({
          currency: line.currency,
          issuer: line.account,
          balance: line.balance,
          limit: line.limit,
          authorized: line.authorized || false
        }))

        return {
          xrpBalance,
          trustLines
        }
      })

      return reply.send({
        ok: true,
        ...result
      })
    } catch (e: any) {
      return reply.status(400).send({
        ok: false,
        error: e?.data || e?.message || String(e)
      })
    }
  })
}
