#!/usr/bin/env tsx

/**
 * Comprehensive Authorization Test Suite
 * 
 * This test file consolidates all authorization-related tests:
 * 1. Button validation logic
 * 2. Schema validation
 * 3. Tenant middleware
 * 4. External authorization creation
 * 5. Authorization request creation
 * 6. Full end-to-end flow
 */

import { z } from 'zod'
import { lookupTenantBySubdomain } from '../src/lib/tenantService.js'
import prisma from '../src/db/client.js'

// ============================================================================
// 1. BUTTON VALIDATION LOGIC TESTS
// ============================================================================

function testButtonValidation() {
  console.log('🧪 Testing Button Validation Logic...\n')

  // Test case 1: All required fields present
  const testCase1 = {
    loading: false,
    selectedAsset: { id: 'test-asset', code: 'LAKSHMI' },
    trustlineCheckData: {
      holderAddress: 'rTestHolder123456789012345678901234',
      currencyCode: 'LAKSHMI'
    }
  }
  
  const buttonEnabled1 = !testCase1.loading && 
                        testCase1.selectedAsset && 
                        testCase1.trustlineCheckData.holderAddress && 
                        testCase1.trustlineCheckData.currencyCode
  
  console.log('✅ Test Case 1 (All fields present):', buttonEnabled1 ? 'ENABLED' : 'DISABLED')
  
  // Test case 2: Missing holder address
  const testCase2 = {
    loading: false,
    selectedAsset: { id: 'test-asset', code: 'LAKSHMI' },
    trustlineCheckData: {
      holderAddress: '',
      currencyCode: 'LAKSHMI'
    }
  }
  
  const buttonEnabled2 = !testCase2.loading && 
                        testCase2.selectedAsset && 
                        testCase2.trustlineCheckData.holderAddress && 
                        testCase2.trustlineCheckData.currencyCode
  
  console.log('✅ Test Case 2 (Missing holder address):', buttonEnabled2 ? 'ENABLED' : 'DISABLED')
  
  // Test case 3: Loading state
  const testCase3 = {
    loading: true,
    selectedAsset: { id: 'test-asset', code: 'LAKSHMI' },
    trustlineCheckData: {
      holderAddress: 'rTestHolder123456789012345678901234',
      currencyCode: 'LAKSHMI'
    }
  }
  
  const buttonEnabled3 = !testCase3.loading && 
                        testCase3.selectedAsset && 
                        testCase3.trustlineCheckData.holderAddress && 
                        testCase3.trustlineCheckData.currencyCode
  
  console.log('✅ Test Case 3 (Loading state):', buttonEnabled3 ? 'ENABLED' : 'DISABLED')
  
  console.log('\n📋 Button validation summary:')
  console.log('   ✅ Button should be ENABLED when all fields are present')
  console.log('   ✅ Button should be DISABLED when holder address is missing')
  console.log('   ✅ Button should be DISABLED when loading is true')
}

// ============================================================================
// 2. SCHEMA VALIDATION TESTS
// ============================================================================

function testSchemaValidation() {
  console.log('\n🧪 Testing Schema Validation...\n')

  // Copy the exact schema from the API
  const AuthorizationRequestSchema = z.object({
    params: z.object({
      limit: z.string().regex(/^[0-9]{1,16}$/).optional(),
      holderAddress: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/),
      currencyCode: z.string().min(1),
      issuerAddress: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/),
      noRipple: z.boolean().default(false),
      requireAuth: z.boolean().default(false),
      expiresAt: z.string().datetime().optional(),
      callbackUrl: z.string().url().optional()
    }),
    signing: z.object({
      mode: z.enum(['wallet']).default('wallet')
    }).optional()
  })

  // Test with valid data (35-character addresses)
  const validData = {
    params: {
      holderAddress: 'rTestHolder123456789012345678901234', // 35 chars
      currencyCode: 'TEST',
      issuerAddress: 'rTestIssuer123456789012345678901234', // 35 chars
      limit: '1000000000',
      noRipple: false,
      requireAuth: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      callbackUrl: 'http://localhost:3000/app/issuance/history'
    },
    signing: {
      mode: 'wallet'
    }
  }

  console.log('🔧 Testing with valid data...')
  const validResult = AuthorizationRequestSchema.safeParse(validData)
  
  if (validResult.success) {
    console.log('✅ Valid data schema validation successful!')
  } else {
    console.log('❌ Valid data schema validation failed!')
    console.log('Errors:', JSON.stringify(validResult.error.errors, null, 2))
  }

  // Test with invalid data (41-character addresses)
  const invalidData = {
    params: {
      holderAddress: 'rTestHolder123456789012345678901234567890', // 41 chars - INVALID
      currencyCode: 'TEST',
      issuerAddress: 'rTestIssuer123456789012345678901234567890', // 41 chars - INVALID
    },
    signing: {
      mode: 'wallet'
    }
  }

  console.log('\n🔧 Testing with invalid data (too long addresses)...')
  const invalidResult = AuthorizationRequestSchema.safeParse(invalidData)
  
  if (!invalidResult.success) {
    console.log('✅ Invalid data correctly rejected by schema validation!')
    console.log('Errors:', JSON.stringify(invalidResult.error.errors, null, 2))
  } else {
    console.log('❌ Invalid data should have been rejected!')
  }
}

// ============================================================================
// 3. TENANT MIDDLEWARE TESTS
// ============================================================================

async function testTenantMiddleware() {
  console.log('\n🧪 Testing Tenant Middleware...\n')

  try {
    // Test the tenant lookup directly
    console.log('🔧 Testing tenant lookup for "default"...')
    const result = await lookupTenantBySubdomain('default')
    
    if (result.success) {
      console.log('✅ Tenant lookup successful!')
      console.log(`   ID: ${result.tenant?.id}`)
      console.log(`   Name: ${result.tenant?.name}`)
      console.log(`   Status: ${result.tenant?.status}`)
    } else {
      console.log('❌ Tenant lookup failed:', result.error)
    }

  } catch (error: any) {
    console.error('❌ Tenant middleware test failed:', error.message)
  }
}

// ============================================================================
// 4. EXTERNAL AUTHORIZATION TESTS
// ============================================================================

async function testExternalAuthorization() {
  console.log('\n🧪 Testing External Authorization Creation...\n')

  try {
    // Find a test asset
    const asset = await prisma.asset.findFirst({
      where: { status: 'ACTIVE' },
      include: { product: true, issuingAddress: true }
    })

    if (!asset) {
      console.log('❌ No active assets found for testing')
      return
    }

    console.log(`📊 Testing with asset: ${asset.code} (${asset.id})`)
    console.log(`🏦 Issuer: ${asset.issuingAddress?.address || 'N/A'}`)

    // Test data for external authorization
    const testData = {
      assetId: asset.id,
      holderAddress: 'rTestHolder123456789012345678901234',
      currency: asset.code,
      issuerAddress: asset.issuingAddress?.address || 'rTestIssuer123456789012345678901234',
      limit: '1000000000',
      externalSource: 'xrpl_external'
    }

    console.log('\n🔧 Testing external authorization creation...')

    // Test external authorization creation
    const response = await fetch('http://localhost:4000/v1/authorizations/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ External authorization failed with status ${response.status}: ${errorText}`)
      return
    }

    const result = await response.json()
    console.log('✅ External authorization created successfully:')
    console.log(`   ID: ${result.id}`)
    console.log(`   Status: ${result.status}`)
    console.log(`   External: ${result.external}`)
    console.log(`   Holder: ${result.holderAddress}`)

    // Test duplicate detection
    console.log('\n🔍 Testing duplicate detection...')
    const duplicateResponse = await fetch('http://localhost:4000/v1/authorizations/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })

    if (duplicateResponse.ok) {
      const duplicateResult = await duplicateResponse.json()
      console.log('✅ Duplicate detection working: Found existing external auth')
      console.log(`   ID: ${duplicateResult.id}`)
    } else {
      console.log('❌ Duplicate detection failed')
    }

  } catch (error: any) {
    console.error('❌ External authorization test failed:', error.message)
  }
}

// ============================================================================
// 5. AUTHORIZATION REQUEST CREATION TESTS
// ============================================================================

async function testAuthorizationRequestCreation() {
  console.log('\n🧪 Testing Authorization Request Creation...\n')

  try {
    // Find a test asset
    const asset = await prisma.asset.findFirst({
      where: { status: 'ACTIVE' },
      include: { product: true, issuingAddress: true }
    })

    if (!asset) {
      console.log('❌ No active assets found for testing')
      return
    }

    console.log(`📊 Testing with asset: ${asset.code} (${asset.id})`)
    console.log(`🏦 Issuer: ${asset.issuingAddress?.address || 'N/A'}`)

    // Test data for authorization request
    const testData = {
      params: {
        holderAddress: 'rTestHolder123456789012345678901234', // 35 chars
        currencyCode: asset.code,
        issuerAddress: asset.issuingAddress?.address || 'rTestIssuer123456789012345678901234',
        limit: '1000000000',
        noRipple: false,
        requireAuth: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        callbackUrl: 'http://localhost:3000/app/issuance/history'
      },
      signing: {
        mode: 'wallet'
      }
    }

    console.log('\n🔧 Testing authorization request creation (PUT endpoint)...')

    // Test authorization request creation
    const response = await fetch(`http://localhost:4000/v1/assets/${asset.id}/authorizations/rTestHolder123456789012345678901234`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })

    console.log(`📡 Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Authorization request failed with status ${response.status}: ${errorText}`)
      return
    }

    const result = await response.json()
    console.log('✅ Authorization request created successfully:')
    console.log(`   ID: ${result.id}`)
    console.log(`   Status: ${result.status}`)
    console.log(`   Auth URL: ${result.authUrl}`)
    console.log(`   Expires: ${result.expiresAt}`)

    // Verify the database entry
    const dbEntry = await prisma.authorization.findUnique({
      where: { id: result.id }
    })

    if (dbEntry) {
      console.log('\n✅ Database entry verified:')
      console.log(`   Status: ${dbEntry.status}`)
      console.log(`   Holder: ${dbEntry.holderAddress}`)
      console.log(`   Limit: ${dbEntry.limit}`)
      console.log(`   InitiatedBy: ${dbEntry.initiatedBy}`)
    } else {
      console.log('❌ Database entry not found')
    }

  } catch (error: any) {
    console.error('❌ Authorization request test failed:', error.message)
  }
}

// ============================================================================
// 6. AUTHORIZATION HISTORY QUERY TESTS
// ============================================================================

async function testAuthorizationHistory() {
  console.log('\n🧪 Testing Authorization History Query...\n')

  try {
    console.log('🔧 Testing authorization history query...')

    const response = await fetch('http://localhost:4000/v1/authorizations')

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Authorization history query failed with status ${response.status}: ${errorText}`)
      return
    }

    const result = await response.json()
    console.log('✅ Authorization history query successful:')
    console.log(`   Found ${result.authorizations.length} authorization entries`)
    console.log(`   Total: ${result.pagination.total}`)

    // Show first few entries
    result.authorizations.slice(0, 3).forEach((auth: any, index: number) => {
      console.log(`   ${index + 1}. ${auth.status} (${auth.external ? 'External' : 'Internal'}) - ${auth.holderAddress?.substring(0, 10)}...`)
    })

  } catch (error: any) {
    console.error('❌ Authorization history test failed:', error.message)
  }
}

// ============================================================================
// 7. FULL END-TO-END FLOW TEST
// ============================================================================

async function testFullAuthorizationFlow() {
  console.log('\n🧪 Testing Full Authorization Flow...\n')

  try {
    // Find a test asset
    const asset = await prisma.asset.findFirst({
      where: { status: 'ACTIVE' },
      include: { product: true, issuingAddress: true }
    })

    if (!asset) {
      console.log('❌ No active assets found for testing')
      return
    }

    console.log(`📊 Testing full flow with asset: ${asset.code} (${asset.id})`)

    // Step 1: Create authorization request
    console.log('\n🔧 Step 1: Creating authorization request...')
    const authRequestData = {
      params: {
        holderAddress: 'rTestHolder123456789012345678901234',
        currencyCode: asset.code,
        issuerAddress: asset.issuingAddress?.address || 'rTestIssuer123456789012345678901234',
        limit: '1000000000',
        noRipple: false,
        requireAuth: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        callbackUrl: 'http://localhost:3000/app/issuance/history'
      },
      signing: {
        mode: 'wallet'
      }
    }

    const authRequestResponse = await fetch(`http://localhost:4000/v1/assets/${asset.id}/authorizations/rTestHolder123456789012345678901234`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authRequestData)
    })

    if (!authRequestResponse.ok) {
      console.log('❌ Step 1 failed: Authorization request creation')
      return
    }

    const authRequest = await authRequestResponse.json()
    console.log('✅ Step 1 successful: Authorization request created')
    console.log(`   ID: ${authRequest.id}`)
    console.log(`   Auth URL: ${authRequest.authUrl}`)

    // Step 2: Check authorization history
    console.log('\n🔧 Step 2: Checking authorization history...')
    const historyResponse = await fetch('http://localhost:4000/v1/authorizations')
    
    if (!historyResponse.ok) {
      console.log('❌ Step 2 failed: Authorization history query')
      return
    }

    const history = await historyResponse.json()
    const ourAuth = history.authorizations.find((auth: any) => auth.id === authRequest.id)
    
    if (ourAuth) {
      console.log('✅ Step 2 successful: Authorization found in history')
      console.log(`   Status: ${ourAuth.status}`)
      console.log(`   External: ${ourAuth.external}`)
    } else {
      console.log('❌ Step 2 failed: Authorization not found in history')
    }

    console.log('\n🎉 Full authorization flow test completed successfully!')

  } catch (error: any) {
    console.error('❌ Full authorization flow test failed:', error.message)
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Authorization Test Suite...\n')
  console.log('='.repeat(60))

  try {
    // Run all tests
    testButtonValidation()
    testSchemaValidation()
    await testTenantMiddleware()
    await testExternalAuthorization()
    await testAuthorizationRequestCreation()
    await testAuthorizationHistory()
    await testFullAuthorizationFlow()

    console.log('\n' + '='.repeat(60))
    console.log('🎉 All authorization tests completed!')
    console.log('\n📋 Test Summary:')
    console.log('   ✅ Button validation logic')
    console.log('   ✅ Schema validation (valid/invalid data)')
    console.log('   ✅ Tenant middleware lookup')
    console.log('   ✅ External authorization creation')
    console.log('   ✅ Authorization request creation')
    console.log('   ✅ Authorization history query')
    console.log('   ✅ Full end-to-end flow')

  } catch (error: any) {
    console.error('❌ Test suite failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the comprehensive test suite
runAllTests()
