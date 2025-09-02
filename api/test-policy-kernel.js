import { PrismaClient } from '@prisma/client'
import { PolicyKernel } from './src/lib/policyKernel.js'

const prisma = new PrismaClient()

async function testPolicyKernel() {
  try {
    console.log('🧪 Testing Policy Kernel...')
    
    // Test 1: Check if requirement templates exist
    const templates = await prisma.requirementTemplate.findMany({
      include: {
        regime: true
      }
    })
    
    console.log(`📋 Found ${templates.length} requirement templates:`)
    templates.forEach(t => {
      console.log(`  - ${t.id}: ${t.name} (${t.regime.name})`)
      console.log(`    Applicability: ${t.applicabilityExpr}`)
    })
    
    // Test 2: Test Policy Kernel evaluation
    const policyKernel = new PolicyKernel()
    
    const testFacts = {
      issuerCountry: 'DE',
      assetClass: 'ART',
      targetMarkets: ['EU', 'US'],
      ledger: 'XRPL',
      distributionType: 'private',
      investorAudience: 'professional',
      isCaspInvolved: true,
      transferType: 'CASP_TO_CASP'
    }
    
    console.log('\n🔍 Testing Policy Kernel with facts:', testFacts)
    
    const evaluation = await policyKernel.evaluateFacts(testFacts)
    
    console.log(`✅ Policy Kernel evaluation completed:`)
    console.log(`  - Requirements: ${evaluation.requirementInstances.length}`)
    console.log(`  - Rationale: ${evaluation.rationale.length} items`)
    console.log(`  - Enforcement Plan:`, evaluation.enforcementPlan)
    
    evaluation.requirementInstances.forEach((req, i) => {
      console.log(`  ${i + 1}. ${req.requirementTemplateId}: ${req.status}`)
    })
    
    // Test 3: Check if we can create requirement instances
    console.log('\n📝 Testing requirement instance creation...')
    
    // Find an existing asset to test with
    const asset = await prisma.asset.findFirst({
      include: {
        product: {
          include: {
            organization: true
          }
        }
      }
    })
    
    if (asset) {
      console.log(`Found asset: ${asset.code} (${asset.id})`)
      
      // Create requirement instances for this asset
      await policyKernel.createRequirementInstances(asset.id, testFacts)
      
      // Check if instances were created
      const instances = await prisma.requirementInstance.findMany({
        where: { assetId: asset.id },
        include: {
          requirementTemplate: true
        }
      })
      
      console.log(`✅ Created ${instances.length} requirement instances:`)
      instances.forEach(inst => {
        console.log(`  - ${inst.requirementTemplate.name}: ${inst.status}`)
      })
    } else {
      console.log('No assets found to test with')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPolicyKernel()
