import { PrismaClient, OrganizationStatus, UserRole, UserStatus } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import supertest from 'supertest'

export const prisma = new PrismaClient()

export interface TestOrganization {
  id: string
  name: string
  legalName: string
  country: string
  jurisdiction: string
  status: OrganizationStatus
  taxId?: string
  website?: string
}

export interface TestUser {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  organizationId: string
}

export class TestDataManager {
  static async createTestOrganization(data: Partial<TestOrganization> = {}): Promise<TestOrganization> {
    const organization = await prisma.organization.create({
      data: {
        name: data.name || `Test Org ${Date.now()}`,
        legalName: data.legalName || `Test Organization ${Date.now()}`,
        country: data.country || 'US',
        jurisdiction: data.jurisdiction || 'US',
        status: data.status || OrganizationStatus.ACTIVE,
        taxId: 'TEST123',
        website: 'https://test-org.com',
        metadata: { test: true }
      }
    })
    
    return organization as TestOrganization
  }

  static async createTestUser(organizationId: string, data: Partial<TestUser> = {}): Promise<TestUser> {
    const user = await prisma.user.create({
      data: {
        sub: `test-user-${Date.now()}`,
        email: data.email || `test${Date.now()}@example.com`,
        name: data.name || `Test User ${Date.now()}`,
        role: data.role || UserRole.VIEWER,
        status: data.status || UserStatus.ACTIVE,
        organizationId,
        twoFactorEnabled: false
      }
    })
    
    return user as TestUser
  }

  static async cleanupTestData(): Promise<void> {
    await prisma.requirementInstance.deleteMany()
    await prisma.asset.deleteMany()
    await prisma.product.deleteMany()
    await prisma.issuerAddress.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organization.deleteMany()
  }
}

export class ApiTestHelper {
  static createTestApp(app: FastifyInstance) {
    return supertest(app.server)
  }

  static async makeAuthenticatedRequest(
    app: FastifyInstance,
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string,
    data?: any
  ) {
    const request = supertest(app.server)[method](url)
    
    if (data) {
      request.send(data)
    }
    
    return request
  }
}

export const testOrganizations = {
  valid: {
    name: 'Valid Test Organization',
    legalName: 'Valid Test Organization LLC',
    country: 'US',
    jurisdiction: 'United States',
    website: 'https://valid-test-org.com'
  },
  
  minimal: {
    name: 'Minimal Test Organization',
    country: 'DE'
  },
  
  invalid: {
    name: '', // Invalid: empty name
    country: 'INVALID' // Invalid: not 2 characters
  }
}
