import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { getLedgerAdapter } from '../../adapters/index.js'
import { tenantMiddleware } from '../../middleware/tenantMiddleware.js'
import type { TenantRequest } from '../../middleware/tenantMiddleware.js'
import { requireActiveTenant } from '../../plugins/auth.js'

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Apply tenant middleware to all routes
  app.addHook('preHandler', tenantMiddleware)
  
  app.get('/balances/:account', {
    preHandler: [requireActiveTenant],
    schema: {
      summary: 'Get issued token balances for an account (tenant-scoped)',
      tags: ['balances'],
      params: {
        type: 'object',
        required: ['account'],
        properties: { account: { type: 'string', description: 'Account r-address' } },
      },
      querystring: {
        type: 'object',
        properties: {
          issuer: { type: 'string', description: 'Optional issuer r-address filter (must belong to tenant)' },
          currency: { type: 'string', description: 'Optional currency filter (3-char like USD/EUR or 160-bit hex)' },
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
        404: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
      },
    },
  }, async (req: TenantRequest, reply) => {
    const { account } = req.params as { account: string }
    const { issuer, currency } = req.query as { issuer?: string; currency?: string }

    // If issuer filter is provided, validate it belongs to the tenant
    if (issuer) {
      const issuerAddress = await app.prisma.issuerAddress.findFirst({
        where: {
          address: issuer,
          organizationId: req.tenant!.id,
          status: 'APPROVED'
        }
      })
      
      if (!issuerAddress) {
        return reply.status(404).send({ 
          ok: false, 
          error: 'Issuer address not found or not approved for this organization' 
        })
      }
    }

    const adapter = getLedgerAdapter()
    try {
      const { xrpBalance, balances } = await adapter.getBalances({ account, issuer, currency })
      return reply.send({ ok: true, account, xrpBalance: xrpBalance ?? '0', trustLines: balances })
    } catch (e: any) {
      return reply.status(400).send({ ok: false, error: e?.data || e?.message || String(e) })
    }
  })
}
