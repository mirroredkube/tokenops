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
      description: 'Multi-ledger tokenization APIs',
      version: '0.1.0',
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: 'system', description: 'Liveness & ledger connectivity' },
      { name: 'balances', description: 'Account balances & queries' },
      { name: 'v1', description: 'Asset-centric API endpoints' },
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
import balancesRoutes from './routes/balances.js'

// New v1 routes (asset-centric)
import v1ComplianceRoutes from './routes/v1/compliance.js'
import v1AssetRoutes from './routes/v1/assets.js'
import v1AuthorizationRoutes from './routes/v1/authorizations.js'
import v1IssuanceRoutes from './routes/v1/issuances.js'
import v1UsersRoutes from './routes/v1/users.js'
import v1OrganizationRoutes from './routes/v1/organizations.js'

// Background jobs
import { startIssuanceWatcherJob } from './jobs/issuanceWatcherJob.js'

// Essential routes (no v1 equivalent)
await app.register(systemRoutes,     { prefix: '/system' })
await app.register(balancesRoutes,   { prefix: '/balances' })

// New v1 routes (asset-centric)
await app.register(v1ComplianceRoutes, { prefix: '/v1' })
await app.register(v1AssetRoutes,    { prefix: '/v1' })
await app.register(v1AuthorizationRoutes,    { prefix: '/v1' })
await app.register(v1IssuanceRoutes, { prefix: '/v1' })
await app.register(v1UsersRoutes,    { prefix: '/v1/users' })
await app.register(v1OrganizationRoutes, { prefix: '/v1' })

// ----------------------------------------------------------------------------
// Startup
// ----------------------------------------------------------------------------
await app.ready()
app.log.info(`Swagger UI: /docs`)
app.log.info(`OpenAPI JSON: /docs/json`)
app.log.info({ uiOrigin }, 'CORS configured for UI origin')

// Start background jobs
await startIssuanceWatcherJob()

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
