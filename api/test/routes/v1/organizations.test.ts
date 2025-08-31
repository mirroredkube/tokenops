import { FastifyInstance } from 'fastify'
import supertest from 'supertest'
import { PrismaClient } from '@prisma/client'
import { TestDataManager, ApiTestHelper, testOrganizations } from '../../utils/testHelpers'

// Import the app factory (we'll create this)
import { createTestApp } from '../../utils/appFactory'

describe('Organization Management API', () => {
  let app: FastifyInstance
  let request: any
  let prisma: PrismaClient

  beforeAll(async () => {
    app = await createTestApp()
    request = supertest(app.server)
    prisma = new PrismaClient()
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await TestDataManager.cleanupTestData()
  })

  describe('GET /v1/organizations', () => {
    it('should return empty list when no organizations exist', async () => {
      const response = await request
        .get('/v1/organizations')
        .expect(200)

      expect(response.body).toEqual({
        organizations: [],
        total: 0,
        limit: 20,
        offset: 0
      })
    })

    it('should return list of organizations', async () => {
      // Create test organizations
      const org1 = await TestDataManager.createTestOrganization({
        name: 'Test Org 1',
        country: 'US'
      })
      const org2 = await TestDataManager.createTestOrganization({
        name: 'Test Org 2',
        country: 'DE'
      })

      const response = await request
        .get('/v1/organizations')
        .expect(200)

      expect(response.body.total).toBe(2)
      expect(response.body.organizations).toHaveLength(2)
      expect(response.body.organizations.map((org: any) => org.name)).toContain('Test Org 1')
      expect(response.body.organizations.map((org: any) => org.name)).toContain('Test Org 2')
    })

    it('should filter organizations by country', async () => {
      await TestDataManager.createTestOrganization({ name: 'US Org', country: 'US' })
      await TestDataManager.createTestOrganization({ name: 'DE Org', country: 'DE' })

      const response = await request
        .get('/v1/organizations?country=US')
        .expect(200)

      expect(response.body.total).toBe(1)
      expect(response.body.organizations[0].country).toBe('US')
    })

    it('should filter organizations by status', async () => {
      await TestDataManager.createTestOrganization({ name: 'Active Org', status: 'ACTIVE' })
      await TestDataManager.createTestOrganization({ name: 'Suspended Org', status: 'SUSPENDED' })

      const response = await request
        .get('/v1/organizations?status=ACTIVE')
        .expect(200)

      expect(response.body.total).toBe(1)
      expect(response.body.organizations[0].status).toBe('ACTIVE')
    })

    it('should support pagination', async () => {
      // Create 3 organizations
      await TestDataManager.createTestOrganization({ name: 'Org 1' })
      await TestDataManager.createTestOrganization({ name: 'Org 2' })
      await TestDataManager.createTestOrganization({ name: 'Org 3' })

      const response = await request
        .get('/v1/organizations?limit=2&offset=1')
        .expect(200)

      expect(response.body.total).toBe(3)
      expect(response.body.organizations).toHaveLength(2)
      expect(response.body.limit).toBe(2)
      expect(response.body.offset).toBe(1)
    })

    it('should validate query parameters', async () => {
      const response = await request
        .get('/v1/organizations?limit=1000') // Invalid: limit > 100
        .expect(400)

      expect(response.body.error).toBe('Invalid query parameters')
    })
  })

  describe('POST /v1/organizations', () => {
    it('should create organization with valid data', async () => {
      const orgData = testOrganizations.valid

      const response = await request
        .post('/v1/organizations')
        .send(orgData)
        .expect(201)

      expect(response.body.name).toBe(orgData.name)
      expect(response.body.legalName).toBe(orgData.legalName)
      expect(response.body.country).toBe(orgData.country)
      expect(response.body.status).toBe('ACTIVE')
      expect(response.body.id).toBeDefined()
      expect(response.body.createdAt).toBeDefined()
    })

    it('should create organization with minimal required data', async () => {
      const orgData = testOrganizations.minimal

      const response = await request
        .post('/v1/organizations')
        .send(orgData)
        .expect(201)

      expect(response.body.name).toBe(orgData.name)
      expect(response.body.country).toBe(orgData.country)
      expect(response.body.legalName).toBeNull()
      expect(response.body.website).toBeNull()
    })

    it('should reject organization with duplicate name', async () => {
      const orgData = testOrganizations.valid

      // Create first organization
      await request
        .post('/v1/organizations')
        .send(orgData)
        .expect(201)

      // Try to create duplicate
      const response = await request
        .post('/v1/organizations')
        .send(orgData)
        .expect(409)

      expect(response.body.error).toBe('Organization with this name already exists')
    })

    it('should validate required fields', async () => {
      const response = await request
        .post('/v1/organizations')
        .send({})
        .expect(400)

      expect(response.body.error).toBe('Invalid request body')
    })

    it('should validate country code format', async () => {
      const response = await request
        .post('/v1/organizations')
        .send({
          name: 'Test Org',
          country: 'INVALID'
        })
        .expect(400)

      expect(response.body.error).toBe('Invalid request body')
    })

    it('should validate website URL format', async () => {
      const response = await request
        .post('/v1/organizations')
        .send({
          name: 'Test Org',
          country: 'US',
          website: 'not-a-url'
        })
        .expect(400)

      expect(response.body.error).toBe('Invalid request body')
    })
  })

  describe('GET /v1/organizations/:organizationId', () => {
    it('should return organization details', async () => {
      const org = await TestDataManager.createTestOrganization()

      const response = await request
        .get(`/v1/organizations/${org.id}`)
        .expect(200)

      expect(response.body.id).toBe(org.id)
      expect(response.body.name).toBe(org.name)
      expect(response.body.stats).toBeDefined()
      expect(response.body.stats.users).toBe(0)
      expect(response.body.stats.products).toBe(0)
      expect(response.body.stats.assets).toBe(0)
      expect(response.body.stats.issuerAddresses).toBe(0)
    })

    it('should return 404 for non-existent organization', async () => {
      const response = await request
        .get('/v1/organizations/non-existent-id')
        .expect(404)

      expect(response.body.error).toBe('Organization not found')
    })

    it('should include all organization fields', async () => {
      const org = await TestDataManager.createTestOrganization({
        name: 'Complete Org',
        legalName: 'Complete Organization LLC',
        country: 'FR',
        jurisdiction: 'France',
        taxId: 'FR123456789',
        website: 'https://complete-org.fr'
      })

      const response = await request
        .get(`/v1/organizations/${org.id}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: org.id,
        name: 'Complete Org',
        legalName: 'Complete Organization LLC',
        country: 'FR',
        jurisdiction: 'France',
        taxId: 'FR123456789',
        website: 'https://complete-org.fr',
        status: 'ACTIVE'
      })
    })
  })

  describe('PUT /v1/organizations/:organizationId', () => {
    it('should update organization with valid data', async () => {
      const org = await TestDataManager.createTestOrganization()

      const updateData = {
        name: 'Updated Organization',
        website: 'https://updated-org.com'
      }

      const response = await request
        .put(`/v1/organizations/${org.id}`)
        .send(updateData)
        .expect(200)

      expect(response.body.name).toBe('Updated Organization')
      expect(response.body.website).toBe('https://updated-org.com')
      expect(response.body.updatedAt).toBeDefined()
    })

    it('should return 404 for non-existent organization', async () => {
      const response = await request
        .put('/v1/organizations/non-existent-id')
        .send({ name: 'Updated' })
        .expect(404)

      expect(response.body.error).toBe('Organization not found')
    })

    it('should reject duplicate name on update', async () => {
      const org1 = await TestDataManager.createTestOrganization({ name: 'Org 1' })
      const org2 = await TestDataManager.createTestOrganization({ name: 'Org 2' })

      const response = await request
        .put(`/v1/organizations/${org2.id}`)
        .send({ name: 'Org 1' })
        .expect(409)

      expect(response.body.error).toBe('Organization with this name already exists')
    })

    it('should validate update data', async () => {
      const org = await TestDataManager.createTestOrganization()

      const response = await request
        .put(`/v1/organizations/${org.id}`)
        .send({ country: 'INVALID' })
        .expect(400)

      expect(response.body.error).toBe('Invalid request body')
    })

    it('should allow partial updates', async () => {
      const org = await TestDataManager.createTestOrganization()

      const response = await request
        .put(`/v1/organizations/${org.id}`)
        .send({ name: 'Partially Updated' })
        .expect(200)

      expect(response.body.name).toBe('Partially Updated')
      expect(response.body.country).toBe(org.country) // Should remain unchanged
    })
  })

  describe('GET /v1/organizations/:organizationId/users', () => {
    it('should return empty list when organization has no users', async () => {
      const org = await TestDataManager.createTestOrganization()

      const response = await request
        .get(`/v1/organizations/${org.id}/users`)
        .expect(200)

      expect(response.body.users).toEqual([])
      expect(response.body.total).toBe(0)
    })

    it('should return organization users', async () => {
      const org = await TestDataManager.createTestOrganization()
      const user1 = await TestDataManager.createTestUser(org.id, {
        name: 'User 1',
        email: 'user1@test.com'
      })
      const user2 = await TestDataManager.createTestUser(org.id, {
        name: 'User 2',
        email: 'user2@test.com'
      })

      const response = await request
        .get(`/v1/organizations/${org.id}/users`)
        .expect(200)

      expect(response.body.total).toBe(2)
      expect(response.body.users).toHaveLength(2)
      expect(response.body.users.map((u: any) => u.name)).toContain('User 1')
      expect(response.body.users.map((u: any) => u.name)).toContain('User 2')
    })

    it('should filter users by role', async () => {
      const org = await TestDataManager.createTestOrganization()
      await TestDataManager.createTestUser(org.id, { role: 'ADMIN' })
      await TestDataManager.createTestUser(org.id, { role: 'VIEWER' })

      const response = await request
        .get(`/v1/organizations/${org.id}/users?role=ADMIN`)
        .expect(200)

      expect(response.body.total).toBe(1)
      expect(response.body.users[0].role).toBe('ADMIN')
    })

    it('should filter users by status', async () => {
      const org = await TestDataManager.createTestOrganization()
      await TestDataManager.createTestUser(org.id, { status: 'ACTIVE' })
      await TestDataManager.createTestUser(org.id, { status: 'SUSPENDED' })

      const response = await request
        .get(`/v1/organizations/${org.id}/users?status=ACTIVE`)
        .expect(200)

      expect(response.body.total).toBe(1)
      expect(response.body.users[0].status).toBe('ACTIVE')
    })

    it('should support pagination', async () => {
      const org = await TestDataManager.createTestOrganization()
      await TestDataManager.createTestUser(org.id, { name: 'User 1' })
      await TestDataManager.createTestUser(org.id, { name: 'User 2' })
      await TestDataManager.createTestUser(org.id, { name: 'User 3' })

      const response = await request
        .get(`/v1/organizations/${org.id}/users?limit=2&offset=1`)
        .expect(200)

      expect(response.body.total).toBe(3)
      expect(response.body.users).toHaveLength(2)
      expect(response.body.limit).toBe(2)
      expect(response.body.offset).toBe(1)
    })

    it('should return 404 for non-existent organization', async () => {
      const response = await request
        .get('/v1/organizations/non-existent-id/users')
        .expect(404)

      expect(response.body.error).toBe('Organization not found')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the API doesn't crash on malformed requests
      
      const response = await request
        .post('/v1/organizations')
        .send({ invalid: 'data' })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should validate organization ID format', async () => {
      const response = await request
        .get('/v1/organizations/invalid-id-format')
        .expect(404)

      expect(response.body.error).toBe('Organization not found')
    })
  })
})
