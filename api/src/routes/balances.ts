import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import xrpl from 'xrpl'
import { withClient } from '../lib/xrplClient.js'
import { hexCurrencyToAscii, isHexCurrency, currencyToHex } from '../utils/currency.js'

function normalizeCurrencyInput(code?: string): { ascii?: string; hex?: string } {
  if (!code) return {}
  const upper = code.trim().toUpperCase()
  if (upper === 'XRP') return { ascii: 'XRP' }
  if (isHexCurrency(upper)) return { hex: upper }
  if (upper.length === 3) return { ascii: upper }      // standard 3-char ISO-like
  return { hex: currencyToHex(upper) }                 // long custom codes → hex-160
}

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // GET /balances/:account?issuer=&currency=
  app.get('/:account', {
    schema: {
      summary: 'Get issued token balances for an account',
      tags: ['balances'],
      params: {
        type: 'object',
        required: ['account'],
        properties: {
          account: { type: 'string', description: 'Account r-address' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          issuer: { type: 'string', description: 'Optional issuer r-address filter' },
          currency: { type: 'string', description: 'Optional currency (3-char like USD/EUR or 160-bit hex)' },
        },
        examples: [{ issuer: 'rISSUER...', currency: 'USD' }],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            account: { type: 'string' },
            xrpBalance: { type: 'string' },
            trustLines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  currency: { type: 'string' },
                  currencyHex: { type: 'string' },
                  issuer: { type: 'string' },
                  balance: { type: 'string' },
                  limit: { type: 'string' },
                  frozen: { type: 'boolean' },
                  noRipple: { type: 'boolean' },
                  qualityIn: { type: 'number' },
                  qualityOut: { type: 'number' },
                },
              },
            },
          },
        },
        400: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const { account } = req.params as { account: string }
    const { issuer, currency } = req.query as { issuer?: string; currency?: string }

    try {
      const result = await withClient(async (client) => {
        // Native XRP balance
        const info = await client.request({ command: 'account_info', account, ledger_index: 'validated' })
        const xrpBalance = xrpl.dropsToXrp(info.result.account_data.Balance)

        // Issued balances (trust lines)
        const linesRes = await client.request({
          command: 'account_lines',
          account,
          ledger_index: 'validated',
        } as any)

        const { ascii: curAscii, hex: curHex } = normalizeCurrencyInput(currency)

        const trustLines = (linesRes.result.lines || [])
          .filter((l: any) => {
            if (issuer && l.account !== issuer) return false
            if (curAscii && l.currency !== curAscii) return false
            if (curHex && l.currency !== curHex) return false
            return true
          })
          .map((l: any) => {
            const isHex = isHexCurrency(l.currency)
            const ascii = isHex ? hexCurrencyToAscii(l.currency) : l.currency
            return {
              currency: ascii,
              currencyHex: isHex ? l.currency : currencyToHex(l.currency),
              issuer: l.account,
              balance: l.balance,
              limit: l.limit,
              frozen: !!l.freeze || !!l.frozen,
              noRipple: !!l.no_ripple,
              qualityIn: l.quality_in,
              qualityOut: l.quality_out,
            }
          })

        return { account, xrpBalance, trustLines }
      })

      return reply.send({ ok: true, ...result })
    } catch (e: any) {
      return reply.status(400).send({ ok: false, error: e?.data || e?.message || String(e) })
    }
  })
}
