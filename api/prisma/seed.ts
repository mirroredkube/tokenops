import { PrismaClient, AssetClass } from '@prisma/client'

const prisma = new PrismaClient()

// Environment-based configuration
const SEED_CONFIG = {
  // Organization settings
  defaultOrgName: process.env.DEFAULT_ORG_NAME || 'Default Organization',
  defaultOrgCountry: process.env.DEFAULT_ORG_COUNTRY || 'US',
  defaultOrgJurisdiction: process.env.DEFAULT_ORG_JURISDICTION || 'US',
  
  // Regulatory settings
  enableRegulatoryData: process.env.ENABLE_REGULATORY_DATA !== 'false', // Default: true
  enableRequirementTemplates: process.env.ENABLE_REQUIREMENT_TEMPLATES !== 'false', // Default: true
  
  // Development settings
  enableDevData: process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_DATA === 'true'
}

async function main() {
  console.log('🌱 Starting database seed...')
  console.log('📋 Configuration:', {
    defaultOrgName: SEED_CONFIG.defaultOrgName,
    defaultOrgCountry: SEED_CONFIG.defaultOrgCountry,
    enableRegulatoryData: SEED_CONFIG.enableRegulatoryData,
    enableRequirementTemplates: SEED_CONFIG.enableRequirementTemplates,
    enableDevData: SEED_CONFIG.enableDevData
  })

  try {
    // ===== SEED REGULATORY REGIMES =====
    if (SEED_CONFIG.enableRegulatoryData) {
      console.log('📋 Seeding regulatory regimes...')

      const micaRegime = await prisma.regime.upsert({
        where: { id: 'mica-eu-v1' },
        update: {},
        create: {
          id: 'mica-eu-v1',
          name: 'EU: MiCA',
          version: '1.0',
          effectiveFrom: new Date('2024-12-30'), // MiCA effective date
          description: 'Markets in Crypto-Assets Regulation (EU) 2023/1114',
          metadata: {
            jurisdiction: 'EU',
            scope: 'Crypto-asset service providers and issuers',
            authority: 'European Securities and Markets Authority (ESMA)'
          }
        }
      })

      const travelRuleRegime = await prisma.regime.upsert({
        where: { id: 'travel-rule-eu-v1' },
        update: {},
        create: {
          id: 'travel-rule-eu-v1',
          name: 'EU: Travel Rule',
          version: '1.0',
          effectiveFrom: new Date('2024-12-30'), // EU Travel Rule effective date
          description: 'Regulation (EU) 2023/1113 on information accompanying transfers of funds and certain crypto-assets',
          metadata: {
            jurisdiction: 'EU',
            scope: 'Crypto-asset transfers',
            authority: 'European Banking Authority (EBA)'
          }
        }
      })

      console.log('✅ Regimes seeded:', { mica: micaRegime.id, travelRule: travelRuleRegime.id })

      // ===== SEED REQUIREMENT TEMPLATES =====
      if (SEED_CONFIG.enableRequirementTemplates) {
        console.log('📝 Seeding requirement templates...')

        const requirementTemplates = [
          // MiCA Requirements
          {
            id: 'mica-issuer-auth-art-emt',
            regimeId: micaRegime.id,
            name: 'Issuer Authorization (ART/EMT)',
            description: 'Authorization to issue Asset-Referenced Tokens or E-Money Tokens under MiCA',
            applicabilityExpr: "assetClass == 'ART' || assetClass == 'EMT'",
            dataPoints: ['authorizationDocument', 'authorityName', 'authorizationDate'],
            enforcementHints: {
              xrpl: { requireAuth: true, trustlineAuthorization: true },
              evm: { allowlistGating: true, pauseControl: true }
            },
            version: '1.0',
            effectiveFrom: new Date('2024-12-30')
          },
          {
            id: 'mica-whitepaper-art',
            regimeId: micaRegime.id,
            name: 'Crypto-Asset White Paper (ART)',
            description: 'White paper requirement for Asset-Referenced Tokens under MiCA Article 6',
            applicabilityExpr: "assetClass == 'ART'",
            dataPoints: ['whitePaperUrl', 'whitePaperHash', 'issuerName', 'issuerAddress'],
            enforcementHints: {
              xrpl: { requireAuth: true },
              evm: { allowlistGating: true }
            },
            version: '1.0',
            effectiveFrom: new Date('2024-12-30')
          },
          {
            id: 'mica-kyc-tier-art-emt',
            regimeId: micaRegime.id,
            name: 'KYC Requirements by Asset Class',
            description: 'Know Your Customer requirements based on asset class',
            applicabilityExpr: "assetClass == 'ART' || assetClass == 'EMT'",
            dataPoints: ['kycTier', 'kycProvider', 'kycPolicy'],
            enforcementHints: {
              xrpl: { trustlineAuthorization: true },
              evm: { allowlistGating: true }
            },
            version: '1.0',
            effectiveFrom: new Date('2024-12-30')
          },
          {
            id: 'mica-right-of-withdrawal',
            regimeId: micaRegime.id,
            name: 'Right of Withdrawal (Art. 13)',
            description: 'Right of withdrawal for retail investors under MiCA Article 13',
            applicabilityExpr: "assetClass == 'ART' && investorAudience == 'retail'",
            dataPoints: ['withdrawalPeriod', 'withdrawalTerms', 'refundPolicy'],
            enforcementHints: {
              xrpl: { freezeControl: true },
              evm: { pauseControl: true }
            },
            version: '1.0',
            effectiveFrom: new Date('2024-12-30')
          },
          {
            id: 'mica-marketing-communications',
            regimeId: micaRegime.id,
            name: 'Marketing Communications',
            description: 'Requirements for marketing communications under MiCA',
            applicabilityExpr: "assetClass == 'ART' || assetClass == 'EMT'",
            dataPoints: ['marketingPolicy', 'communicationGuidelines'],
            enforcementHints: {
              xrpl: { requireAuth: true },
              evm: { allowlistGating: true }
            },
            version: '1.0',
            effectiveFrom: new Date('2024-12-30')
          },

          // EU Travel Rule Requirements
          {
            id: 'travel-rule-payload',
            regimeId: travelRuleRegime.id,
            name: 'Travel Rule Information Payload',
            description: 'Required information for crypto-asset transfers under EU Travel Rule',
            applicabilityExpr: "isCaspInvolved == true && transferType == 'CASP_TO_CASP'",
            dataPoints: ['originatorName', 'originatorAddress', 'beneficiaryName', 'beneficiaryAddress', 'transferAmount'],
            enforcementHints: {
              xrpl: { requireAuth: true },
              evm: { allowlistGating: true }
            },
            version: '1.0',
            effectiveFrom: new Date('2024-12-30')
          },
          {
            id: 'travel-rule-self-hosted',
            regimeId: travelRuleRegime.id,
            name: 'Self-Hosted Wallet Transfers',
            description: 'Requirements for transfers involving self-hosted wallets',
            applicabilityExpr: "transferType == 'CASP_TO_SELF_HOSTED' || transferType == 'SELF_HOSTED_TO_CASP'",
            dataPoints: ['walletAddress', 'transferAmount', 'riskAssessment'],
            enforcementHints: {
              xrpl: { requireAuth: true },
              evm: { allowlistGating: true }
            },
            version: '1.0',
            effectiveFrom: new Date('2024-12-30')
          },

          // Ledger-Specific Requirements
          {
            id: 'xrpl-trustline-auth',
            regimeId: micaRegime.id,
            name: 'XRPL Trustline Authorization',
            description: 'Trustline authorization requirement for XRPL assets',
            applicabilityExpr: "ledger == 'XRPL'",
            dataPoints: ['trustlineLimit', 'authorizationPolicy'],
            enforcementHints: {
              xrpl: { requireAuth: true, trustlineAuthorization: true }
            },
            version: '1.0',
            effectiveFrom: new Date('2024-12-30')
          },
          {
            id: 'evm-allowlist-gating',
            regimeId: micaRegime.id,
            name: 'EVM Allowlist Gating',
            description: 'Allowlist gating requirement for EVM assets',
            applicabilityExpr: "ledger == 'ETHEREUM' || ledger == 'HEDERA'",
            dataPoints: ['allowlistPolicy', 'mintControl', 'transferControl'],
            enforcementHints: {
              evm: { allowlistGating: true, pauseControl: true }
            },
            version: '1.0',
            effectiveFrom: new Date('2024-12-30')
          }
        ]

        for (const template of requirementTemplates) {
          await prisma.requirementTemplate.upsert({
            where: { id: template.id },
            update: {},
            create: template
          })
        }

        console.log(`✅ ${requirementTemplates.length} requirement templates seeded`)
      }
    }

    // ===== SEED DEFAULT ORGANIZATION =====
    console.log('🏢 Checking for default organization...')
    
    const defaultOrg = await prisma.organization.findFirst({
      where: { name: SEED_CONFIG.defaultOrgName }
    })

    if (!defaultOrg) {
      console.log('🏢 Creating default organization...')
      await prisma.organization.create({
        data: {
          name: SEED_CONFIG.defaultOrgName,
          legalName: SEED_CONFIG.defaultOrgName,
          country: SEED_CONFIG.defaultOrgCountry,
          jurisdiction: SEED_CONFIG.defaultOrgJurisdiction,
          status: 'ACTIVE'
        }
      })
      console.log('✅ Default organization created')
    } else {
      console.log('✅ Default organization already exists')
    }

    // ===== SEED DEVELOPMENT DATA (optional) =====
    if (SEED_CONFIG.enableDevData) {
      console.log('🧪 Seeding development data...')
      
      // Create a sample product for the default organization
      const defaultOrg = await prisma.organization.findFirst({
        where: { name: SEED_CONFIG.defaultOrgName }
      })

      if (defaultOrg) {
                 const sampleProduct = await prisma.product.upsert({
           where: { 
             id: 'sample-product-id' // Using a fixed ID for upsert
           },
           update: {},
           create: {
             id: 'sample-product-id',
             organizationId: defaultOrg.id,
             name: 'Sample Product',
             assetClass: AssetClass.OTHER,
             policyPresets: ['mica-kyc-tier-art-emt'],
             documents: ['sample-whitepaper.pdf'],
             targetMarkets: ['US', 'EU'],
             status: 'ACTIVE'
           }
         })
        console.log('✅ Sample product created:', sampleProduct.name)
      }
    }

    console.log('✅ Database seed completed successfully!')
    
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
