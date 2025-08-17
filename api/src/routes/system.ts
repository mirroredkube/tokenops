import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { Client } from 'xrpl'

/**
 * System routes:
 *  - GET /health        → basic process and dependency checks
 *  - GET /xrpl-status   → XRPL connectivity + node telemetry
 */
export async function systemRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // ---- /health -------------------------------------------------------------
  app.get('/health', {
    schema: {
      summary: 'Liveness/health probe',
      tags: ['system'],
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            service: { type: 'string' },
            time: { type: 'string' },
            uptimeSeconds: { type: 'number' },
            pid: { type: 'number' },
            memoryMB: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
            version: { type: 'string' },
            env: { type: 'string' },
          },
        },
      },
    },
  }, async (_req, _rep) => {
    const mem = process.memoryUsage()
    const memoryMB = Object.fromEntries(
      Object.entries(mem).map(([k, v]) => [k, Math.round((v as number) / 1024 / 1024 * 100) / 100])
    )

    return {
      ok: true,
      service: 'api',
      time: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      pid: process.pid,
      memoryMB,
      version: process.env.npm_package_version ?? '0.0.0',
      env: process.env.NODE_ENV ?? 'development',
    }
  })

  // ---- /xrpl-status -------------------------------------------------------
  app.get('/xrpl-status', {
    schema: {
      summary: 'XRPL connectivity and node telemetry',
      tags: ['system', 'xrpl'],
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            endpoint: { type: 'string' },
            connected: { type: 'boolean' },
            info: { type: 'object', additionalProperties: true },
            fees: { type: 'object', additionalProperties: true },
            validatedLedger: { type: 'object', additionalProperties: true },
            error: { type: 'string' },
            time: { type: 'string' },
          },
        },
      },
    },
  }, async (_req, rep) => {
    const endpoint = process.env.XRPL_ENDPOINT || 'wss://xrplcluster.com'

    let client: Client | null = null
    try {
      client = new Client(endpoint, { timeout: 10_000 })
      await client.connect()

      const [serverInfo, fee, ledger] = await Promise.all([
        client.request({ command: 'server_info' as const }),
        client.request({ command: 'fee' as const }),
        client.request({ command: 'ledger_current' as const }),
      ])

      const info = serverInfo.result?.info ?? serverInfo.result
      const validatedLedgerIndex = info?.validated_ledger?.seq

      return {
        ok: true,
        endpoint,
        connected: client.isConnected(),
        info: {
          buildVersion: info?.build_version,
          networkId: info?.network_id,
          serverState: info?.server_state,
          peers: info?.peers,
          loadFactor: info?.load_factor,
          ioLatencyMs: info?.io_latency_ms,
          uptime: info?.uptime,
          validatedLedger: info?.validated_ledger,
        },
        fees: fee.result,
        validatedLedger: {
          index: validatedLedgerIndex,
          current: ledger.result?.ledger_current_index,
        },
        time: new Date().toISOString(),
      }
    } catch (err: any) {
      app.log.error({ err }, 'XRPL status check failed')
      rep.code(200) // keep endpoint friendly for probes; encode failure in payload
      return {
        ok: false,
        endpoint,
        connected: client?.isConnected?.() ?? false,
        error: err?.message ?? 'Unknown error',
        time: new Date().toISOString(),
      }
    } finally {
      try { await client?.disconnect() } catch { /* noop */ }
    }
  })
}

export default systemRoutes

// Usage: in your app bootstrap
// import systemRoutes from './routes/system.js'
// app.register(systemRoutes, { prefix: '/system' })
