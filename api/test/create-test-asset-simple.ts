#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestAsset() {
  try {
    // Get the default product
    const product = await prisma.product.findFirst({
      where: { name: 'Default Product' },
      include: { organization: true }
    })
    
    if (!product) {
      console.log('❌ No default product found')
      return
    }
    
    console.log('✅ Found product:', product.name, 'in org:', product.organization.name)
    
    // Create a test issuer address
    const issuerAddress = await prisma.issuerAddress.create({
      data: {
        address: 'rTestIssuer123456789012345678901234567890',
        organizationId: product.organizationId,
        status: 'APPROVED',
        ledger: 'XRPL',
        network: 'TESTNET'
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
