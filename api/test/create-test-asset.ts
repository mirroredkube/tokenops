#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestAsset() {
  try {
    // Get the default organization
    const org = await prisma.organization.findFirst()
    if (!org) {
      console.log('❌ No organization found')
      return
    }
    
    console.log('✅ Found organization:', org.name)
    
    // Create a test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        organizationId: org.id,
        status: 'ACTIVE'
      }
    })
    
    console.log('✅ Created test product:', product.id)
    
    // Create a test issuer address
    const issuerAddress = await prisma.issuerAddress.create({
      data: {
        address: 'rTestIssuer123456789012345678901234567890',
        organizationId: org.id,
        status: 'ACTIVE',
        ledger: 'XRPL'
      }
    })
    
    console.log('✅ Created test issuer address:', issuerAddress.id)
    
    // Create a test asset
    const asset = await prisma.asset.create({
      data: {
        assetRef: 'TEST-ASSET-001',
        ledger: 'XRPL',
        network: 'TESTNET',
        code: 'TEST',
        decimals: 6,
        complianceMode: 'RECORD_ONLY',
        status: 'ACTIVE',
        productId: product.id,
        issuingAddressId: issuerAddress.id,
        assetClass: 'OTHER'
      }
    })
    
    console.log('✅ Created test asset:', asset.id, asset.code)
    console.log('✅ Asset ledger:', `${asset.ledger}-${asset.network}`)
    console.log('✅ Asset tenant ID:', product.organizationId)
    
  } catch (error) {
    console.error('❌ Error creating test asset:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestAsset()
