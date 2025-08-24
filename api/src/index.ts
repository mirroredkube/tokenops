// src/index.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import authPlugin from './plugins/auth.js'         // ← ensure .js like your other imports
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
const uiOrigin = process.env.UI_ORIGIN || 'http://localhost:3000'  // UI on :3000

// ----------------------------------------------------------------------------
// Plugins
// ----------------------------------------------------------------------------
// CORS: allow UI origin + send cookies
await app.register(cors, {
  origin: [uiOrigin],
  credentials: true,
})

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
      { name: 'registry', description: 'Token registry & compliance' },
    ],
  },
})

// Important: do NOT enable staticCSP unless you customize headers;
// it often blocks the UI assets in dev.
await app.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
})

// Auth (adds /auth/google, /auth/me, /auth/logout and verifyAuthOrApiKey)
await app.register(authPlugin)

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------
// Keep the .js extensions if your dev/runtime resolves TS via tsx
import systemRoutes from './routes/system.js'
import tokensRoutes from './routes/tokens.js'
import trustlineRoutes from './routes/trustlines.js'
import balancesRoutes from './routes/balances.js'
import registryRoutes from './routes/registry.js'

await app.register(systemRoutes,     { prefix: '/system' })
await app.register(tokensRoutes,     { prefix: '/tokens' })
await app.register(trustlineRoutes,  { prefix: '/trustlines' })
await app.register(balancesRoutes,   { prefix: '/balances' })
await app.register(registryRoutes,   { prefix: '/registry' })

// ----------------------------------------------------------------------------
// Startup
// ----------------------------------------------------------------------------
await app.ready()
app.log.info(`Swagger UI: /docs`)
app.log.info(`OpenAPI JSON: /docs/json`)
app.log.info({ uiOrigin }, 'CORS configured for UI origin')

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
