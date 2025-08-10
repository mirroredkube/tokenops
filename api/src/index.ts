import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import * as dotenv from 'dotenv'
dotenv.config()

const app = Fastify({ logger: true })
await app.register(cors, { origin: true })

await app.register(swagger, {
  openapi: {
    info: { title: 'TokenOps API', version: '0.1.0' }
  }
})
await app.register(swaggerUI, { routePrefix: '/docs' })

app.get('/health', async () => ({ ok: true }))
app.get('/xrpl-status', async () => {
  return { network: process.env.XRPL_ENDPOINT || 'unset' }
})

// Routes
import tokensRoutes from './routes/tokens.js'
import trustlineRoutes from './routes/trustlines.js' 

await app.register(tokensRoutes, { prefix: '/tokens' })
await app.register(trustlineRoutes, { prefix: '/trustlines' })

const port = Number(process.env.PORT || 4000)
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
