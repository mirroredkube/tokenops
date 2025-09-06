// src/index.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import authPlugin from './plugins/auth.js'         // ← ensure .js like your other imports
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import * as dotenv from 'dotenv'
dotenv.config()

// ----------------------------------------------------------------------------
// App
// ----------------------------------------------------------------------------
const app = Fastify({ 
  logger: true,
  trustProxy: true // Trust proxy for X-Forwarded-Host headers (required for tenant middleware)
})
const port = Number(process.env.PORT || 4000)
const serverUrl = `http://localhost:${port}`
const uiOrigin = process.env.UI_ORIGIN || 'http://localhost:3000'  // UI on :3000

// ----------------------------------------------------------------------------
// Plugins
// ----------------------------------------------------------------------------
// CORS: allow UI origin + tenant subdomains + send cookies
await app.register(cors, {
  origin: [
    uiOrigin,
    // Allow tenant subdomains for development (web app calling API)
    /^http:\/\/[a-z0-9-]+\.app\.localhost:3000$/,
    // Allow direct localhost access (fallback)
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Allow direct API access for testing
    'http://localhost:4000',
    'http://127.0.0.1:4000'
  ],
  credentials: true,
})

// Multipart: for file uploads
await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file per request
  }
})

await app.register(swagger, {
  openapi: {
    info: {
      title: 'TokenOps API',
      description: 'Multi-ledger tokenization APIs',
      version: '0.1.0',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Default tenant (localhost)' },
      { url: 'http://default.api.localhost:4000', description: 'Default Organization' },
      { url: 'http://am1.api.localhost:4000', description: 'Asset Manager 1' }
    ],
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
import v1BalancesRoutes from './routes/v1/balances.js'

// New v1 routes (asset-centric)
import v1ComplianceRoutes from './routes/v1/compliance.js'
import v1AssetRoutes from './routes/v1/assets.js'
import v1AuthorizationRoutes from './routes/v1/authorizations.js'
import v1IssuanceRoutes from './routes/v1/issuances.js'
import v1UsersRoutes from './routes/v1/users.js'
import v1OrganizationRoutes from './routes/v1/organizations.js'
import v1ProductRoutes from './routes/v1/products.js'
import v1IssuerAddressRoutes from './routes/v1/issuer-addresses.js'

// Background jobs
import { startIssuanceWatcherJob } from './jobs/issuanceWatcherJob.js'

// Essential routes (no v1 equivalent)
await app.register(systemRoutes,     { prefix: '/system' })

// New v1 routes (asset-centric)
await app.register(v1ComplianceRoutes, { prefix: '/v1' })
await app.register(v1AssetRoutes,    { prefix: '/v1' })
await app.register(v1AuthorizationRoutes,    { prefix: '/v1' })
await app.register(v1IssuanceRoutes, { prefix: '/v1' })
await app.register(v1UsersRoutes,    { prefix: '/v1/users' })
await app.register(v1OrganizationRoutes, { prefix: '/v1' })
await app.register(v1ProductRoutes,  { prefix: '/v1' })
await app.register(v1IssuerAddressRoutes, { prefix: '/v1' })
await app.register(v1BalancesRoutes, { prefix: '/v1' })

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
