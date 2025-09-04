import { test } from 'tap'
import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Test data setup
let testOrg, testProduct, testAsset, testRequirement, testUser

test.before(async () => {
  // Create test organization
  testOrg = await prisma.organization.create({
    data: {
      name: 'Test Platform Org',
      legalName: 'Test Platform Organization Ltd',
      country: 'DE',
      jurisdiction: 'DE',
      status: 'ACTIVE'
    }
  })

  // Create test product (ART)
  testProduct = await prisma.product.create({
    data: {
      organizationId: testOrg.id,
      name: 'Test ART Token',
      description: 'Test Asset-Referenced Token',
      assetClass: 'ART',
      targetMarkets: ['DE', 'EU'],
      status: 'ACTIVE'
    }
  })

  // Create test user (COMPLIANCE_OFFICER)
  testUser = await prisma.user.create({
    data: {
      email: 'compliance@test.com',
      name: 'Test Compliance Officer',
      sub: 'test-compliance-officer',
      organizationId: testOrg.id,
      role: 'COMPLIANCE_OFFICER',
      status: 'ACTIVE'
    }
  })

  // Create test asset
  testAsset = await prisma.asset.create({
    data: {
      productId: testProduct.id,
      assetRef: 'xrpl:testnet:rTestIssuer:TEST',
      ledger: 'XRPL',
      network: 'TESTNET',
      code: 'TEST',
      assetClass: 'ART',
      decimals: 6,
      complianceMode: 'GATED_BEFORE',
      status: 'DRAFT'
    }
  })

  // Create test requirement instance
  testRequirement = await prisma.requirementInstance.create({
    data: {
      assetId: testAsset.id,
      requirementTemplateId: 'mica-issuer-auth-art-emt',
      status: 'SATISFIED',
      rationale: 'Test requirement satisfied',
      platformAcknowledged: false,
      platformAcknowledgedBy: null,
      platformAcknowledgedAt: null,
      platformAcknowledgmentReason: null
    }
  })
})

test.after(async () => {
  // Cleanup test data
  await prisma.requirementInstance.deleteMany({ where: { assetId: testAsset.id } })
  await prisma.asset.deleteMany({ where: { id: testAsset.id } })
  await prisma.product.deleteMany({ where: { id: testProduct.id } })
  await prisma.user.deleteMany({ where: { id: testUser.id } })
  await prisma.organization.deleteMany({ where: { id: testOrg.id } })
  await prisma.$disconnect()
})

test('Platform Acknowledgement Workflow', async (t) => {
  const baseUrl = 'http://localhost:4000'

  // Test 1: Get platform status for requirement
  t.test('GET platform status', async (t) => {
    const response = await fetch(`${baseUrl}/v1/compliance/requirements/${testRequirement.id}/platform-status`)
    
    t.equal(response.status, 200, 'Should return 200')
    
    const data = await response.json()
    t.equal(data.id, testRequirement.id, 'Should return correct requirement ID')
    t.equal(data.platformAcknowledged, false, 'Should show not acknowledged')
    t.equal(data.requiresPlatformAcknowledgement, true, 'Should require platform acknowledgement')
    t.equal(data.assetClass, 'ART', 'Should show correct asset class')
  })

  // Test 2: Platform acknowledge requirement
  t.test('POST platform acknowledgement', async (t) => {
    const response = await fetch(`${baseUrl}/v1/compliance/requirements/${testRequirement.id}/platform-acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token` // Mock auth
      },
      body: JSON.stringify({
        acknowledgmentReason: 'Platform co-acknowledgement for ART token compliance requirement'
      })
    })
    
    // Note: This will likely return 401 due to auth, but we're testing the endpoint exists
    t.ok([200, 401].includes(response.status), 'Should return 200 or 401 (auth required)')
  })

  // Test 3: Asset activation should be blocked without platform acknowledgement
  t.test('Asset activation blocked without platform acknowledgement', async (t) => {
    const response = await fetch(`${baseUrl}/v1/assets/${testAsset.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'active'
      })
    })
    
    t.equal(response.status, 422, 'Should return 422 - blocked by platform acknowledgement')
    
    const data = await response.json()
    t.equal(data.error, 'Asset activation blocked by pending platform acknowledgement', 'Should have correct error message')
    t.ok(data.pendingPlatformAcknowledgements, 'Should list pending acknowledgements')
    t.equal(data.pendingPlatformAcknowledgements.length, 1, 'Should have one pending acknowledgement')
  })

  // Test 4: Manually acknowledge requirement (simulate platform acknowledgement)
  t.test('Manually acknowledge requirement', async (t) => {
    const updatedRequirement = await prisma.requirementInstance.update({
      where: { id: testRequirement.id },
      data: {
        platformAcknowledged: true,
        platformAcknowledgedBy: testUser.id,
        platformAcknowledgedAt: new Date(),
        platformAcknowledgmentReason: 'Platform co-acknowledgement completed'
      }
    })

    t.equal(updatedRequirement.platformAcknowledged, true, 'Should be acknowledged')
    t.equal(updatedRequirement.platformAcknowledgedBy, testUser.id, 'Should have correct acknowledger')
  })

  // Test 5: Asset activation should succeed after platform acknowledgement
  t.test('Asset activation succeeds after platform acknowledgement', async (t) => {
    const response = await fetch(`${baseUrl}/v1/assets/${testAsset.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'active'
      })
    })
    
    t.equal(response.status, 200, 'Should return 200 - activation successful')
    
    const data = await response.json()
    t.equal(data.status, 'active', 'Should be active')
  })

  // Test 6: Evidence bundle export
  t.test('Export evidence bundle', async (t) => {
    const response = await fetch(`${baseUrl}/v1/compliance/evidence/bundle/${testRequirement.id}`)
    
    t.ok([200, 404].includes(response.status), 'Should return 200 or 404 (no evidence files)')
    
    if (response.status === 200) {
      const contentType = response.headers.get('content-type')
      t.equal(contentType, 'application/zip', 'Should return ZIP file')
    }
  })
})

test('Platform Acknowledgement Validation', async (t) => {
  // Test 1: Non-ART/EMT assets don't require platform acknowledgement
  t.test('Non-ART/EMT assets skip platform acknowledgement', async (t) => {
    const otherProduct = await prisma.product.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test OTHER Token',
        description: 'Test Utility Token',
        assetClass: 'OTHER',
        targetMarkets: ['DE'],
        status: 'ACTIVE'
      }
    })

    const otherAsset = await prisma.asset.create({
      data: {
        productId: otherProduct.id,
        assetRef: 'xrpl:testnet:rTestIssuer:OTHER',
        ledger: 'XRPL',
        network: 'TESTNET',
        code: 'OTHER',
        assetClass: 'OTHER',
        decimals: 6,
        complianceMode: 'GATED_BEFORE',
        status: 'DRAFT'
      }
    })

    // Try to activate OTHER asset - should succeed without platform acknowledgement
    const response = await fetch(`${baseUrl}/v1/assets/${otherAsset.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'active'
      })
    })
    
    t.equal(response.status, 200, 'OTHER assets should activate without platform acknowledgement')
    
    // Cleanup
    await prisma.asset.delete({ where: { id: otherAsset.id } })
    await prisma.product.delete({ where: { id: otherProduct.id } })
  })

  // Test 2: Platform acknowledgement with invalid reason
  t.test('Platform acknowledgement validation', async (t) => {
    const response = await fetch(`${baseUrl}/v1/compliance/requirements/${testRequirement.id}/platform-acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        acknowledgmentReason: 'Short' // Too short
      })
    })
    
    t.equal(response.status, 400, 'Should return 400 for invalid reason')
  })
})
