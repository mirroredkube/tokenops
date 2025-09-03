const { test, describe, beforeAll, afterAll, beforeEach, afterEach } = require('tap')
const { PrismaClient } = require('@prisma/client')
const { build } = require('../src/index.js')
const fs = require('fs')
const path = require('path')

describe('Evidence API Endpoints', () => {
  let app
  let prisma
  let testRequirementInstance
  let testUser
  let testAsset
  let testProduct
  let testOrganization

  beforeAll(async () => {
    // Build the Fastify app
    app = await build()
    prisma = new PrismaClient()
    
    // Clean up any existing test data
    await prisma.evidence.deleteMany()
    await prisma.requirementInstance.deleteMany()
    await prisma.asset.deleteMany()
    await prisma.product.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organization.deleteMany()
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.evidence.deleteMany()
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
        description: 'Test product for evidence testing',
        assetClass: 'OTHER',
        status: 'ACTIVE'
      }
    })

    // Create test asset
    testAsset = await prisma.asset.create({
      data: {
        assetRef: 'TEST_ASSET_001',
        ledger: 'XRPL',
        network: 'TESTNET',
        code: 'TEST',
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
        email: 'test@example.com',
        name: 'Test User',
        sub: 'test-user-123',
        organizationId: testOrganization.id,
        role: 'COMPLIANCE_OFFICER'
      }
    })

    // Create test requirement instance
    testRequirementInstance = await prisma.requirementInstance.create({
      data: {
        assetId: testAsset.id,
        requirementTemplateId: 'test-template-id', // You might need to create this
        status: 'REQUIRED',
        holder: 'test-holder',
        transferAmount: '1000',
        transferType: 'ISSUANCE'
      }
    })
  })

  afterEach(async () => {
    // Clean up evidence after each test
    await prisma.evidence.deleteMany()
  })

  test('POST /v1/compliance/evidence - Create evidence record', async (t) => {
    const evidenceData = {
      requirementInstanceId: testRequirementInstance.id,
      fileName: 'test-document.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      fileHash: 'abc123hash',
      uploadPath: 'uploads/test-document.pdf',
      description: 'Test evidence document',
      tags: ['test', 'document', 'pdf']
    }

    const response = await app.inject({
      method: 'POST',
      url: '/v1/compliance/evidence',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}` // Mock auth
      },
      payload: evidenceData
    })

    t.equal(response.statusCode, 201)
    
    const result = JSON.parse(response.payload)
    t.equal(result.requirementInstanceId, testRequirementInstance.id)
    t.equal(result.fileName, 'test-document.pdf')
    t.equal(result.fileType, 'application/pdf')
    t.equal(result.fileSize, 1024)
    t.equal(result.fileHash, 'abc123hash')
    t.equal(result.description, 'Test evidence document')
    t.same(result.tags, ['test', 'document', 'pdf'])
    t.ok(result.id)
    t.ok(result.uploadedAt)
  })

  test('POST /v1/compliance/evidence - Missing required fields', async (t) => {
    const incompleteData = {
      fileName: 'test-document.pdf',
      fileType: 'application/pdf'
      // Missing required fields
    }

    const response = await app.inject({
      method: 'POST',
      url: '/v1/compliance/evidence',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: incompleteData
    })

    t.equal(response.statusCode, 400)
  })

  test('POST /v1/compliance/evidence - Invalid requirement instance ID', async (t) => {
    const evidenceData = {
      requirementInstanceId: 'invalid-id',
      fileName: 'test-document.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      fileHash: 'abc123hash',
      uploadPath: 'uploads/test-document.pdf'
    }

    const response = await app.inject({
      method: 'POST',
      url: '/v1/compliance/evidence',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: evidenceData
    })

    t.equal(response.statusCode, 404)
  })

  test('GET /v1/compliance/evidence/:requirementInstanceId - Get evidence for requirement', async (t) => {
    // First create some evidence
    const evidence1 = await prisma.evidence.create({
      data: {
        requirementInstanceId: testRequirementInstance.id,
        fileName: 'document1.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        fileHash: 'hash1',
        uploadPath: 'uploads/doc1.pdf',
        description: 'First document',
        tags: ['doc1'],
        uploadedBy: testUser.id
      }
    })

    const evidence2 = await prisma.evidence.create({
      data: {
        requirementInstanceId: testRequirementInstance.id,
        fileName: 'document2.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
        fileHash: 'hash2',
        uploadPath: 'uploads/doc2.pdf',
        description: 'Second document',
        tags: ['doc2'],
        uploadedBy: testUser.id
      }
    })

    const response = await app.inject({
      method: 'GET',
      url: `/v1/compliance/evidence/${testRequirementInstance.id}`,
      headers: {
        'authorization': `Bearer ${testUser.id}`
      }
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.equal(result.evidence.length, 2)
    
    // Check first evidence
    const firstEvidence = result.evidence.find(e => e.fileName === 'document1.pdf')
    t.ok(firstEvidence)
    t.equal(firstEvidence.fileSize, 1024)
    t.equal(firstEvidence.description, 'First document')
    
    // Check second evidence
    const secondEvidence = result.evidence.find(e => e.fileName === 'document2.pdf')
    t.ok(secondEvidence)
    t.equal(secondEvidence.fileSize, 2048)
    t.equal(secondEvidence.description, 'Second document')
  })

  test('GET /v1/compliance/evidence/:requirementInstanceId - No evidence found', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/compliance/evidence/${testRequirementInstance.id}`,
      headers: {
        'authorization': `Bearer ${testUser.id}`
      }
    })

    t.equal(response.statusCode, 200)
    
    const result = JSON.parse(response.payload)
    t.equal(result.evidence.length, 0)
  })

  test('GET /v1/compliance/evidence/:requirementInstanceId - Invalid requirement instance ID', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/compliance/evidence/invalid-id',
      headers: {
        'authorization': `Bearer ${testUser.id}`
      }
    })

    t.equal(response.statusCode, 404)
  })

  test('POST /v1/compliance/evidence/upload - Upload file with multipart', async (t) => {
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt')
    const testContent = 'This is a test file for evidence upload'
    fs.writeFileSync(testFilePath, testContent)

    const formData = new FormData()
    formData.append('requirementInstanceId', testRequirementInstance.id)
    formData.append('file', fs.createReadStream(testFilePath))
    formData.append('description', 'Test file upload')
    formData.append('tags', 'test,file,txt')

    const response = await app.inject({
      method: 'POST',
      url: '/v1/compliance/evidence/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        'authorization': `Bearer ${testUser.id}`
      },
      payload: formData
    })

    t.equal(response.statusCode, 201)
    
    const result = JSON.parse(response.payload)
    t.equal(result.requirementInstanceId, testRequirementInstance.id)
    t.equal(result.fileName, 'test-file.txt')
    t.equal(result.fileType, 'text/plain')
    t.equal(result.description, 'Test file upload')
    t.same(result.tags, ['test', 'file', 'txt'])
    t.ok(result.id)
    t.ok(result.fileHash)
    t.ok(result.uploadPath)

    // Clean up test file
    fs.unlinkSync(testFilePath)
  })

  test('POST /v1/compliance/evidence/upload - Missing file', async (t) => {
    const formData = new FormData()
    formData.append('requirementInstanceId', testRequirementInstance.id)
    formData.append('description', 'Test without file')

    const response = await app.inject({
      method: 'POST',
      url: '/v1/compliance/evidence/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        'authorization': `Bearer ${testUser.id}`
      },
      payload: formData
    })

    t.equal(response.statusCode, 400)
  })

  test('Evidence file integrity - SHA256 hash verification', async (t) => {
    const testContent = 'Test content for hash verification'
    const expectedHash = require('crypto').createHash('sha256').update(testContent).digest('hex')
    
    const testFilePath = path.join(__dirname, 'hash-test.txt')
    fs.writeFileSync(testFilePath, testContent)

    const formData = new FormData()
    formData.append('requirementInstanceId', testRequirementInstance.id)
    formData.append('file', fs.createReadStream(testFilePath))
    formData.append('description', 'Hash verification test')

    const response = await app.inject({
      method: 'POST',
      url: '/v1/compliance/evidence/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        'authorization': `Bearer ${testUser.id}`
      },
      payload: formData
    })

    t.equal(response.statusCode, 201)
    
    const result = JSON.parse(response.payload)
    t.equal(result.fileHash, expectedHash, 'File hash should match expected SHA256 hash')

    // Clean up test file
    fs.unlinkSync(testFilePath)
  })

  test('Evidence file size limits', async (t) => {
    // Create a file larger than 10MB limit
    const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
    const largeFilePath = path.join(__dirname, 'large-file.txt')
    fs.writeFileSync(largeFilePath, largeContent)

    const formData = new FormData()
    formData.append('requirementInstanceId', testRequirementInstance.id)
    formData.append('file', fs.createReadStream(largeFilePath))

    const response = await app.inject({
      method: 'POST',
      url: '/v1/compliance/evidence/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        'authorization': `Bearer ${testUser.id}`
      },
      payload: formData
    })

    // Should either reject or handle gracefully
    t.ok(response.statusCode >= 400, 'Large file should be rejected or handled gracefully')

    // Clean up test file
    fs.unlinkSync(largeFilePath)
  })

  test('Evidence with multiple tags', async (t) => {
    const evidenceData = {
      requirementInstanceId: testRequirementInstance.id,
      fileName: 'multi-tag-doc.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      fileHash: 'multitaghash',
      uploadPath: 'uploads/multi-tag.pdf',
      description: 'Document with multiple tags',
      tags: ['compliance', 'regulatory', 'audit', '2025']
    }

    const response = await app.inject({
      method: 'POST',
      url: '/v1/compliance/evidence',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: evidenceData
    })

    t.equal(response.statusCode, 201)
    
    const result = JSON.parse(response.payload)
    t.same(result.tags, ['compliance', 'regulatory', 'audit', '2025'])
    t.equal(result.tags.length, 4)
  })

  test('Evidence audit trail - uploadedBy and uploadedAt', async (t) => {
    const evidenceData = {
      requirementInstanceId: testRequirementInstance.id,
      fileName: 'audit-doc.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      fileHash: 'audithash',
      uploadPath: 'uploads/audit.pdf',
      description: 'Audit trail test document'
    }

    const response = await app.inject({
      method: 'POST',
      url: '/v1/compliance/evidence',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${testUser.id}`
      },
      payload: evidenceData
    })

    t.equal(response.statusCode, 201)
    
    const result = JSON.parse(response.payload)
    t.equal(result.uploadedBy, testUser.id, 'Should record the uploading user')
    t.ok(result.uploadedAt, 'Should record upload timestamp')
    
    // Verify timestamp is recent (within last minute)
    const uploadTime = new Date(result.uploadedAt)
    const now = new Date()
    const timeDiff = Math.abs(now.getTime() - uploadTime.getTime())
    t.ok(timeDiff < 60000, 'Upload time should be recent')
  })
})
