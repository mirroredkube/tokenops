import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'

// Import routes
import organizationRoutes from '../../src/routes/v1/organizations'
import productRoutes from '../../src/routes/v1/products'

export async function createTestApp() {
  const app = Fastify({ 
    logger: false // Disable logging in tests
  })

  // Register minimal plugins for testing
  await app.register(cors, {
    origin: ['http://localhost:3000'],
    credentials: true,
  })

  // Register routes
  await app.register(organizationRoutes, { prefix: '/v1' })
  await app.register(productRoutes, { prefix: '/v1' })

  // Add a simple health check for testing
  app.get('/health', async () => {
    return { status: 'ok' }
  })

  // Error handler for tests
  app.setErrorHandler((error, request, reply) => {
    console.error('Test error:', error)
    reply.status(500).send({ error: 'Internal server error' })
  })

  await app.ready()
  
  return app
}

export async function createTestAppWithAuth() {
  const app = await createTestApp()
  
  // Add authentication plugin for tests that need it
  // This would be similar to the main auth plugin but simplified for testing
  
  return app
}
