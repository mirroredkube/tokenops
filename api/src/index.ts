// src/index.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import * as dotenv from 'dotenv'
dotenv.config()

// ----------------------------------------------------------------------------
// App
// ----------------------------------------------------------------------------
const app = Fastify({ logger: true })
const port = Number(process.env.PORT || 4000)
const serverUrl = `http://localhost:${port}`

// ----------------------------------------------------------------------------
// Plugins
// ----------------------------------------------------------------------------
await app.register(cors, { origin: true })

await app.register(swagger, {
  openapi: {
    info: {
      title: 'TokenOps API',
      description: 'XRPL system & tokenization APIs',
      version: '0.1.0',
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: 'system', description: 'Liveness & XRPL connectivity' },
      { name: 'tokens', description: 'Issuance & token utilities' },
      { name: 'trustlines', description: 'Trustline management' },
      { name: 'balances', description: 'Account balances & queries' },
    ],
  },
})

// Important: do NOT enable staticCSP unless you customize headers;
// it often blocks the UI assets in dev.
await app.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
})

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------
// Keep the .js extensions if your dev/runtime resolves TS via tsx
import systemRoutes from './routes/system.js'
import tokensRoutes from './routes/tokens.js'
import trustlineRoutes from './routes/trustlines.js'
import balancesRoutes from './routes/balances.js'

await app.register(systemRoutes,     { prefix: '/system' })
await app.register(tokensRoutes,     { prefix: '/tokens' })
await app.register(trustlineRoutes,  { prefix: '/trustlines' })
await app.register(balancesRoutes,   { prefix: '/balances' })

// ----------------------------------------------------------------------------
// Startup
// ----------------------------------------------------------------------------
await app.ready()
app.log.info(`Swagger UI: /docs`)
app.log.info(`OpenAPI JSON: /docs/json`)

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
