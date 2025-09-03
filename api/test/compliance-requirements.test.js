const { test, describe, beforeAll, afterAll, beforeEach, afterEach } = require('tap')
const { PrismaClient } = require('@prisma/client')
const { build } = require('../src/index.js')

describe('Compliance Requirements API', () => {
  let app
  let prisma
  let testRequirementInstance
  let testUser
  let testAsset
  let testProduct
  let testOrganization

  beforeAll(async () => {
    app = await build()
    prisma = new PrismaClient()
    
    // Clean up existing test data
    await prisma.requirementInstance.deleteMany()
    await prisma.asset.deleteMany()
    await prisma.product.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organization.deleteMany()
  })

  afterAll(async () => {
    await prisma.requirementInstance.deleteMany()
    await prisma.asset.deleteMany()
    await prisma.product.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organization.deleteMany()
    
    await prisma.$disconnect()
    await app.close()
  })

  beforeEach(async () => {
    // Create test organization
    testOrganization = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        country: 'US',
        legalName: 'Test Organization Inc.'
      }
    })

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        organizationId: testOrganization.id,
        name: 'Test Product',
        description: 'Test product for requirements testing',
        assetClass: 'OTHER',
        status: 'ACTIVE'
      }
    })

    // Create test asset
    testAsset = await prisma.asset.create({
      data: {
        assetRef: 'TEST_ASSET_003',
        ledger: 'XRPL',
        network: 'TESTNET',
        code: 'TEST3',
        assetClass: 'OTHER',
        decimals: 6,
        complianceMode: 'RECORD_ONLY',
        productId: testProduct.id,
        status: 'ACTIVE'
      }
    })

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test3@example.com',
        name: 'Test User 3',
        sub: 'test-user-789',
        organizationId: testOrganization.id,
        role: 'COMPLIANCE_OFFICER'
      }
    })

    // Create test requirement instance
    testRequirementInstance = await prisma.requirementInstance.create({
      data: {
        assetId: testAsset.id,
        requirementTemplateId: 'test-template-id',
        status: 'REQUIRED',
        holder: 'test-holder',
        transferAmount: '1000',
        transferType: 'ISSUANCE'
      }
    })
  })

  test('GET /v1/compliance/requirements - Get requirements for specific asset', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/compliance/requirements?assetId=${testAsset.id}`,
      headers: {
        'authorization': `Bearer ${testUser.id}`
      }
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.ok(Array.isArray(result.requirements))
    t.equal(result.requirements.length, 1)
    
    const requirement = result.requirements[0]
    t.equal(requirement.assetId, testAsset.id)
    t.equal(requirement.status, 'REQUIRED')
    t.equal(requirement.holder, 'test-holder')
  })

  test('GET /v1/compliance/requirements - Get all requirements (no assetId)', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/compliance/requirements',
      headers: {
        'authorization': `Bearer ${testUser.id}`
      }
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.ok(Array.isArray(result.templates))
    t.ok(result.templates.length > 0, 'Should return requirement templates')
  })

  test('GET /v1/compliance/requirements - Filter by status', async (t) => {
    // Create another requirement with SATISFIED status
    await prisma.requirementInstance.create({
      data: {
        assetId: testAsset.id,
        requirementTemplateId: 'test-template-id-2',
        status: 'SATISFIED',
        holder: 'test-holder-2',
        transferAmount: '2000',
        transferType: 'ISSUANCE'
      }
    })

    const response = await app.inject({
      method: 'GET',
      url: `/v1/compliance/requirements?assetId=${testAsset.id}&status=REQUIRED`,
      headers: {
        'authorization': `Bearer ${testUser.id}`
      }
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.ok(Array.isArray(result.requirements))
    
    // Should only return REQUIRED status requirements
    const allRequired = result.requirements.every(req => req.status === 'REQUIRED')
    t.ok(allRequired, 'All returned requirements should have REQUIRED status')
  })

  test('GET /v1/compliance/requirements - Pagination', async (t) => {
    // Create multiple requirements
    for (let i = 0; i < 5; i++) {
      await prisma.requirementInstance.create({
        data: {
          assetId: testAsset.id,
          requirementTemplateId: `test-template-${i}`,
          status: 'REQUIRED',
          holder: `test-holder-${i}`,
          transferAmount: `${1000 + i * 100}`,
          transferType: 'ISSUANCE'
        }
      })
    }

    const response = await app.inject({
      method: 'GET',
      url: `/v1/compliance/requirements?assetId=${testAsset.id}&limit=3&offset=0`,
      headers: {
        'authorization': `Bearer ${testUser.id}`
      }
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.ok(Array.isArray(result.requirements))
    t.equal(result.requirements.length, 3, 'Should return only 3 requirements')
  })

  test('GET /v1/compliance/requirements - Invalid assetId', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/compliance/requirements?assetId=invalid-asset-id',
      headers: {
        'authorization': `Bearer ${testUser.id}`
      }
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.ok(Array.isArray(result.requirements))
    t.equal(result.requirements.length, 0, 'Should return empty array for invalid assetId')
  })

  test('GET /v1/compliance/requirements - Response structure validation', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/compliance/requirements?assetId=${testAsset.id}`,
      headers: {
        'authorization': `Bearer ${testUser.id}`
      }
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.ok(Array.isArray(result.requirements))
    
    if (result.requirements.length > 0) {
      const requirement = result.requirements[0]
      
      // Check required fields
      t.ok(requirement.id, 'Should have id')
      t.ok(requirement.assetId, 'Should have assetId')
      t.ok(requirement.status, 'Should have status')
      t.ok(requirement.createdAt, 'Should have createdAt')
      t.ok(requirement.updatedAt, 'Should have updatedAt')
      
      // Check status enum values
      const validStatuses = ['REQUIRED', 'SATISFIED', 'EXCEPTION']
      t.ok(validStatuses.includes(requirement.status), 'Status should be valid enum value')
    }
  })
})
