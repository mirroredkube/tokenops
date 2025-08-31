import { PrismaClient, OrganizationStatus, UserRole, UserStatus, AssetClass, ProductStatus } from '@prisma/client'
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

export interface TestProduct {
  id: string
  name: string
  description?: string
  assetClass: AssetClass
  policyPresets?: string[]
  documents?: string[]
  targetMarkets: string[]
  status: ProductStatus
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

  static async createTestProduct(organizationId: string, data: Partial<TestProduct> = {}): Promise<TestProduct> {
    const product = await prisma.product.create({
      data: {
        name: data.name || `Test Product ${Date.now()}`,
        description: data.description || `Test product description ${Date.now()}`,
        assetClass: data.assetClass || AssetClass.OTHER,
        policyPresets: data.policyPresets || ['mica-kyc-tier-art-emt'],
        documents: data.documents || ['whitepaper.pdf'],
        targetMarkets: data.targetMarkets || ['US', 'EU'],
        status: data.status || ProductStatus.DRAFT,
        organizationId
      }
    })
    
    return product as TestProduct
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

export const testProducts = {
  valid: {
    name: 'Valid Test Product',
    description: 'A valid test product for testing',
    assetClass: AssetClass.ART,
    policyPresets: ['mica-kyc-tier-art-emt'],
    documents: ['whitepaper.pdf'],
    targetMarkets: ['US', 'EU'],
    status: ProductStatus.DRAFT
  },
  
  minimal: {
    name: 'Minimal Test Product',
    assetClass: AssetClass.OTHER
  },
  
  invalid: {
    name: '', // Invalid: empty name
    assetClass: 'INVALID' as any // Invalid: not a valid enum
  }
}
