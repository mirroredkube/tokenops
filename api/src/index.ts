import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import * as dotenv from 'dotenv'
dotenv.config()

const app = Fastify({ logger: true })
await app.register(cors, { origin: true })
await app.register(swagger, { openapi: { info: { title: 'TokenOps API', version: '0.1.0' } } })
await app.register(swaggerUI, { routePrefix: '/docs' })

// app.get('/health', async () => ({ ok: true })) - moved to system routes

// debug helper
import { withClient } from './lib/xrplClient.js'
app.get('/debug/ledger', async () => {
  return withClient(async (client) => {
    const res = await client.request({ command: 'ledger_current' })
    return { ok: true, ledger_current_index: res.result.ledger_current_index }
  })
})

// Routes
import systemRoutes from './routes/system.js'
import tokensRoutes from './routes/tokens.js'
import trustlineRoutes from './routes/trustlines.js'
import balancesRoutes from './routes/balances.js'

app.register(systemRoutes, { prefix: '/system' })
await app.register(tokensRoutes,   { prefix: '/tokens' })
await app.register(trustlineRoutes,{ prefix: '/trustlines' })
await app.register(balancesRoutes, { prefix: '/balances' })

const port = Number(process.env.PORT || 4000)
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err); process.exit(1)
})
