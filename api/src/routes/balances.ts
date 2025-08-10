import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import xrpl from 'xrpl'
import { withClient } from '../lib/xrplClient.js'
import { hexCurrencyToAscii } from '../utils/currency.js'

export default async function routes(app, _opts) {
    app.get('/:account', async (req, reply) => {
      const { account } = req.params as { account: string }
      const { issuer, currency } = req.query as { issuer?: string; currency?: string }
  
      try {
        const result = await withClient(async (client) => {
          const info = await client.request({ command: 'account_info', account, ledger_index: 'validated' })
          const xrpBalance = xrpl.dropsToXrp(info.result.account_data.Balance)
  
          const linesReq: any = { command: 'account_lines', account, ledger_index: 'validated' }
          if (issuer) linesReq.peer = issuer
          const linesResp = await client.request(linesReq)
          let lines = (linesResp.result.lines || []) as any[]
  
          const filterCurrency = currency?.toUpperCase()
          if (filterCurrency) {
            lines = lines.filter(l => (l.currency || '').toUpperCase() === filterCurrency)
          }
  
          const mapped = lines.map((l: any) => {
            const c = (l.currency || '').toUpperCase()
            const ascii = hexCurrencyToAscii(c)
            return {
              currency: c,
              currencyPretty: ascii && ascii.length >= 3 ? ascii : null,
              issuer: l.account,
              balance: String(l.balance ?? '0'),  // ensure string
              limit: String(l.limit ?? '0'),
              authorized: !!l.authorized,
              noRipple: !!l.no_ripple,
              qualityIn: l.quality_in,
              qualityOut: l.quality_out,
            }
          })
  
          return { account, xrpBalance, trustLines: mapped }
        })
  
        return reply.send({ ok: true, ...result })
      } catch (e:any) {
        return reply.status(400).send({ ok:false, error: e?.data || e?.message || String(e) })
      }
    })
  }