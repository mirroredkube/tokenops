import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.AUTH_MODE = 'off'
  
  // Initialize test database connection
  const prisma = new PrismaClient()
  
  // Clean up test data
  await prisma.requirementInstance.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.product.deleteMany()
  await prisma.issuerAddress.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
  
  await prisma.$disconnect()
})

// Global test teardown
afterAll(async () => {
  const prisma = new PrismaClient()
  
  // Clean up all test data
  await prisma.requirementInstance.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.product.deleteMany()
  await prisma.issuerAddress.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
  
  await prisma.$disconnect()
})

// Increase timeout for database operations
jest.setTimeout(30000)
