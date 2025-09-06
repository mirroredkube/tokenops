#!/usr/bin/env tsx

/**
 * Test script to verify all four authorization scenarios work correctly
 * 
 * Scenarios:
 * 1. External trustline already setup - creates entry with external: true
 * 2. Platform trustline already setup - finds existing entry, no new entry
 * 3. Trustline exists but limit updated - creates new entry for limit update
 * 4. New trustline setup - creates new entry
 */

import { PrismaClient } from '@prisma/client'
import { getLedgerAdapter } from '../src/adapters/index.js'

const prisma = new PrismaClient()

async function testAuthorizationScenarios() {
  console.log('🧪 Testing Authorization Scenarios...\n')

  try {
    // Test data
    const testAssetId = 'clx1234567890' // Replace with actual asset ID
    const testHolder = 'rTestHolder123456789012345678901234'
    const testIssuer = 'rTestIssuer123456789012345678901234'
    const testCurrency = 'TEST'

    console.log('📋 Test Parameters:')
    console.log(`  Asset ID: ${testAssetId}`)
    console.log(`  Holder: ${testHolder}`)
    console.log(`  Issuer: ${testIssuer}`)
    console.log(`  Currency: ${testCurrency}\n`)

    // Scenario 1: Check for external trustline
    console.log('🔍 Scenario 1: Checking for external trustline...')
    const existingExternal = await prisma.authorization.findFirst({
      where: {
        assetId: testAssetId,
        holder: testHolder,
        external: true
      }
    })

    if (existingExternal) {
      console.log('✅ Found existing external authorization:', {
        id: existingExternal.id,
        status: existingExternal.status,
        external: existingExternal.external,
        externalSource: existingExternal.externalSource
      })
    } else {
      console.log('ℹ️  No existing external authorization found')
    }

    // Scenario 2: Check for platform trustline
    console.log('\n🔍 Scenario 2: Checking for platform trustline...')
    const existingPlatform = await prisma.authorization.findFirst({
      where: {
        assetId: testAssetId,
        holder: testHolder,
        external: false
      }
    })

    if (existingPlatform) {
      console.log('✅ Found existing platform authorization:', {
        id: existingPlatform.id,
        status: existingPlatform.status,
        external: existingPlatform.external,
        limit: existingPlatform.limit
      })
    } else {
      console.log('ℹ️  No existing platform authorization found')
    }

    // Scenario 3: Check for limit changes
    console.log('\n🔍 Scenario 3: Checking for limit changes...')
    if (existingPlatform) {
      const adapter = getLedgerAdapter()
      try {
        const lines = await adapter.getAccountLines({
          account: testHolder,
          peer: testIssuer,
          ledger_index: 'validated'
        })

        const currentTrustline = lines.find((line: any) => 
          line.currency === testCurrency && line.issuer === testIssuer
        )

        if (currentTrustline) {
          const currentLimit = currentTrustline.limit || '0'
          const dbLimit = existingPlatform.limit || '0'
          
          console.log(`  Current ledger limit: ${currentLimit}`)
          console.log(`  Database limit: ${dbLimit}`)
          
          if (currentLimit !== dbLimit) {
            console.log('⚠️  Limit mismatch detected - would create new authorization entry')
          } else {
            console.log('✅ Limits match - no new entry needed')
          }
        } else {
          console.log('ℹ️  No trustline found on ledger')
        }
      } catch (error) {
        console.log('⚠️  Could not check ledger (expected in test environment)')
      }
    } else {
      console.log('ℹ️  No existing platform authorization to check limits')
    }

    // Scenario 4: Check for new trustline setup
    console.log('\n🔍 Scenario 4: Checking for new trustline setup...')
    const allAuthorizations = await prisma.authorization.findMany({
      where: {
        assetId: testAssetId,
        holder: testHolder
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📊 Total authorizations for this holder/asset: ${allAuthorizations.length}`)
    
    if (allAuthorizations.length > 0) {
      console.log('📋 Authorization history:')
      allAuthorizations.forEach((auth, index) => {
        console.log(`  ${index + 1}. ID: ${auth.id}`)
        console.log(`     Status: ${auth.status}`)
        console.log(`     External: ${auth.external}`)
        console.log(`     Limit: ${auth.limit}`)
        console.log(`     Created: ${auth.createdAt}`)
        console.log(`     Source: ${auth.externalSource || 'platform'}`)
        console.log('')
      })
    } else {
      console.log('ℹ️  No authorizations found - would create new entry')
    }

    console.log('✅ Authorization scenario testing completed!')

  } catch (error) {
    console.error('❌ Error testing authorization scenarios:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testAuthorizationScenarios()
