import { PrismaClient } from '@prisma/client'
import { PolicyKernel, PolicyFacts } from '../lib/policyKernel'

const prisma = new PrismaClient()

describe('Compliance Layer Tests', () => {
  let policyKernel: PolicyKernel

  beforeAll(() => {
    policyKernel = new PolicyKernel()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Policy Kernel', () => {
    test('should evaluate ART token facts correctly', async () => {
      const facts: PolicyFacts = {
        issuerCountry: 'US',
        assetClass: 'ART',
        targetMarkets: ['US', 'EU'],
        ledger: 'XRPL',
        distributionType: 'private',
        investorAudience: 'professional',
        isCaspInvolved: true,
        transferType: 'CASP_TO_CASP'
      }

      const result = await policyKernel.evaluateFacts(facts)

      expect(result.requirementInstances).toBeDefined()
      expect(result.requirementInstances.length).toBeGreaterThan(0)
      expect(result.enforcementPlan).toBeDefined()
      expect(result.enforcementPlan.xrpl).toBeDefined()
      expect(result.enforcementPlan.evm).toBeDefined()
      expect(result.rationale).toBeDefined()
      expect(result.rationale.length).toBeGreaterThan(0)

      // Check that ART-specific requirements are present
      const artRequirements = result.requirementInstances.filter(
        (instance: any) => instance.requirementTemplateId.includes('art')
      )
      expect(artRequirements.length).toBeGreaterThan(0)
    })

    test('should evaluate EMT token facts correctly', async () => {
      const facts: PolicyFacts = {
        issuerCountry: 'EU',
        assetClass: 'EMT',
        targetMarkets: ['EU'],
        ledger: 'ETHEREUM',
        distributionType: 'offer',
        investorAudience: 'retail',
        isCaspInvolved: true,
        transferType: 'CASP_TO_CASP'
      }

      const result = await policyKernel.evaluateFacts(facts)

      expect(result.requirementInstances).toBeDefined()
      expect(result.requirementInstances.length).toBeGreaterThan(0)
      expect(result.enforcementPlan).toBeDefined()

      // Check that EMT-specific requirements are present
      const emtRequirements = result.requirementInstances.filter(
        (instance: any) => instance.requirementTemplateId.includes('emt')
      )
      expect(emtRequirements.length).toBeGreaterThan(0)
    })

    test('should generate XRPL enforcement plan for XRPL assets', async () => {
      const facts: PolicyFacts = {
        issuerCountry: 'US',
        assetClass: 'ART',
        targetMarkets: ['US'],
        ledger: 'XRPL',
        distributionType: 'private',
        investorAudience: 'professional',
        isCaspInvolved: true,
        transferType: 'CASP_TO_CASP'
      }

      const result = await policyKernel.evaluateFacts(facts)

      expect(result.enforcementPlan.xrpl.requireAuth).toBe(true)
      expect(result.enforcementPlan.xrpl.trustlineAuthorization).toBe(true)
    })

    test('should generate EVM enforcement plan for EVM assets', async () => {
      const facts: PolicyFacts = {
        issuerCountry: 'EU',
        assetClass: 'EMT',
        targetMarkets: ['EU'],
        ledger: 'ETHEREUM',
        distributionType: 'offer',
        investorAudience: 'retail',
        isCaspInvolved: true,
        transferType: 'CASP_TO_CASP'
      }

      const result = await policyKernel.evaluateFacts(facts)

      expect(result.enforcementPlan.evm.allowlistGating).toBe(true)
      expect(result.enforcementPlan.evm.pauseControl).toBe(true)
    })

    test('should handle travel rule requirements for CASP transfers', async () => {
      const facts: PolicyFacts = {
        issuerCountry: 'US',
        assetClass: 'ART',
        targetMarkets: ['US'],
        ledger: 'XRPL',
        distributionType: 'private',
        investorAudience: 'professional',
        isCaspInvolved: true,
        transferType: 'CASP_TO_CASP'
      }

      const result = await policyKernel.evaluateFacts(facts)

      const travelRuleRequirements = result.requirementInstances.filter(
        (instance: any) => instance.requirementTemplateId.includes('travel-rule')
      )
      expect(travelRuleRequirements.length).toBeGreaterThan(0)
    })

    test('should handle self-hosted wallet requirements', async () => {
      const facts: PolicyFacts = {
        issuerCountry: 'US',
        assetClass: 'OTHER',
        targetMarkets: ['US'],
        ledger: 'HEDERA',
        distributionType: 'private',
        investorAudience: 'institutional',
        isCaspInvolved: true,
        transferType: 'CASP_TO_SELF_HOSTED'
      }

      const result = await policyKernel.evaluateFacts(facts)

      const selfHostedRequirements = result.requirementInstances.filter(
        (instance: any) => instance.requirementTemplateId.includes('self-hosted')
      )
      expect(selfHostedRequirements.length).toBeGreaterThan(0)
    })
  })

  describe('Requirement Templates', () => {
    test('should fetch active requirement templates', async () => {
      const templates = await prisma.requirementTemplate.findMany({
        where: {
          effectiveFrom: { lte: new Date() },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: new Date() } }
          ]
        },
        include: {
          regime: true
        }
      })

      expect(templates).toBeDefined()
      expect(templates.length).toBeGreaterThan(0)

      // Check that templates have required fields
      templates.forEach((template: any) => {
        expect(template.id).toBeDefined()
        expect(template.name).toBeDefined()
        expect(template.applicabilityExpr).toBeDefined()
        expect(template.regime).toBeDefined()
        expect(template.regime.id).toBeDefined()
        expect(template.regime.name).toBeDefined()
      })
    })

    test('should have MiCA regime templates', async () => {
      const micaTemplates = await prisma.requirementTemplate.findMany({
        where: {
          regime: {
            id: 'mica-eu-v1'
          }
        }
      })

      expect(micaTemplates.length).toBeGreaterThan(0)

      // Check for specific MiCA requirements
      const templateIds = micaTemplates.map((t: any) => t.id)
      expect(templateIds).toContain('mica-issuer-auth-art-emt')
      expect(templateIds).toContain('mica-whitepaper-art')
      expect(templateIds).toContain('mica-kyc-tier-art-emt')
    })

    test('should have Travel Rule regime templates', async () => {
      const travelRuleTemplates = await prisma.requirementTemplate.findMany({
        where: {
          regime: {
            id: 'travel-rule-eu-v1'
          }
        }
      })

      expect(travelRuleTemplates.length).toBeGreaterThan(0)

      // Check for specific Travel Rule requirements
      const templateIds = travelRuleTemplates.map((t: any) => t.id)
      expect(templateIds).toContain('travel-rule-payload')
      expect(templateIds).toContain('travel-rule-self-hosted')
    })
  })

  describe('Requirement Instances', () => {
    test('should create requirement instances for asset', async () => {
      // Get an existing asset
      const asset = await prisma.asset.findFirst({
        include: {
          product: {
            include: {
              organization: true
            }
          }
        }
      })

      if (!asset) {
        console.log('No assets found, skipping test')
        return
      }

      const facts: PolicyFacts = {
        issuerCountry: asset.product.organization.country,
        assetClass: asset.product.assetClass,
        targetMarkets: asset.product.targetMarkets || [],
        ledger: asset.ledger,
        distributionType: 'private',
        investorAudience: 'professional',
        isCaspInvolved: true,
        transferType: 'CASP_TO_CASP'
      }

      await policyKernel.createRequirementInstances(asset.id, facts)

      // Verify instances were created
      const instances = await prisma.requirementInstance.findMany({
        where: { assetId: asset.id },
        include: {
          requirementTemplate: true
        }
      })

      expect(instances.length).toBeGreaterThan(0)

      instances.forEach((instance: any) => {
        expect(instance.id).toBeDefined()
        expect(instance.status).toBeDefined()
        expect(instance.rationale).toBeDefined()
        expect(instance.requirementTemplate).toBeDefined()
        expect(instance.requirementTemplate.id).toBeDefined()
      })
    })
  })
})
