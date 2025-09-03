const { test, describe, beforeAll, afterAll, beforeEach, afterEach } = require('tap')
const { PrismaClient } = require('@prisma/client')
const { build } = require('../src/index.js')

describe('Requirement Status Update API', () => {
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
        description: 'Test product for status testing',
        assetClass: 'OTHER',
        status: 'ACTIVE'
      }
    })

    // Create test asset
    testAsset = await prisma.asset.create({
      data: {
        assetRef: 'TEST_ASSET_002',
        ledger: 'XRPL',
        network: 'TESTNET',
        code: 'TEST2',
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
        email: 'test2@example.com',
        name: 'Test User 2',
        sub: 'test-user-456',
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

  test('PATCH /v1/compliance/requirements/:requirementId - Mark as SATISFIED', async (t) => {
    const updateData = {
      status: 'SATISFIED',
      rationale: 'All compliance requirements have been met'
    }

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/compliance/requirements/${testRequirementInstance.id}`,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: updateData
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.equal(result.status, 'SATISFIED')
    t.equal(result.rationale, 'All compliance requirements have been met')
    t.equal(result.verifierId, testUser.id)
    t.ok(result.verifiedAt)
    t.equal(result.exceptionReason, null)
  })

  test('PATCH /v1/compliance/requirements/:requirementId - Mark as EXCEPTION with reason', async (t) => {
    const updateData = {
      status: 'EXCEPTION',
      exceptionReason: 'Regulatory exemption applies for this case',
      rationale: 'Exception granted based on regulatory framework'
    }

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/compliance/requirements/${testRequirementInstance.id}`,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: updateData
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.equal(result.status, 'EXCEPTION')
    t.equal(result.exceptionReason, 'Regulatory exemption applies for this case')
    t.equal(result.rationale, 'Exception granted based on regulatory framework')
    t.equal(result.verifierId, testUser.id)
    t.ok(result.verifiedAt)
  })

  test('PATCH /v1/compliance/requirements/:requirementId - EXCEPTION without reason should fail', async (t) => {
    const updateData = {
      status: 'EXCEPTION',
      rationale: 'Exception without reason'
      // Missing exceptionReason
    }

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/compliance/requirements/${testRequirementInstance.id}`,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: updateData
    })

    t.equal(response.statusCode, 400)
  })

  test('PATCH /v1/compliance/requirements/:requirementId - Invalid status should fail', async (t) => {
    const updateData = {
      status: 'INVALID_STATUS',
      rationale: 'Invalid status test'
    }

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/compliance/requirements/${testRequirementInstance.id}`,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: updateData
    })

    t.equal(response.statusCode, 400)
  })

  test('PATCH /v1/compliance/requirements/:requirementId - Non-existent requirement should fail', async (t) => {
    const updateData = {
      status: 'SATISFIED',
      rationale: 'Test for non-existent requirement'
    }

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/compliance/requirements/non-existent-id',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: updateData
    })

    t.equal(response.statusCode, 404)
  })

  test('PATCH /v1/compliance/requirements/:requirementId - Update back to REQUIRED', async (t) => {
    // First mark as satisfied
    await app.inject({
      method: 'PATCH',
      url: `/v1/compliance/requirements/${testRequirementInstance.id}`,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: {
        status: 'SATISFIED',
        rationale: 'Marking as satisfied first'
      }
    })

    // Then update back to required
    const updateData = {
      status: 'REQUIRED',
      rationale: 'Requirements need to be re-evaluated'
    }

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/compliance/requirements/${testRequirementInstance.id}`,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: updateData
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.equal(result.status, 'REQUIRED')
    t.equal(result.rationale, 'Requirements need to be re-evaluated')
    t.equal(result.verifierId, testUser.id)
    t.ok(result.verifiedAt)
  })

  test('PATCH /v1/compliance/requirements/:requirementId - Audit trail verification', async (t) => {
    const updateData = {
      status: 'SATISFIED',
      rationale: 'Audit trail test'
    }

    const beforeTime = new Date()

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/compliance/requirements/${testRequirementInstance.id}`,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: updateData
    })

    const afterTime = new Date()

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.equal(result.verifierId, testUser.id, 'Should record the verifying user')
    t.ok(result.verifiedAt, 'Should record verification timestamp')
    
    // Verify timestamp is within expected range
    const verifiedTime = new Date(result.verifiedAt)
    t.ok(verifiedTime >= beforeTime, 'Verification time should be after request start')
    t.ok(verifiedTime <= afterTime, 'Verification time should be before request end')
  })
})
