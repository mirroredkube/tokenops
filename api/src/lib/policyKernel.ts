import { PrismaClient } from '@prisma/client'
import { AssetClass, AssetLedger } from '@prisma/client'

const prisma = new PrismaClient()

// ===== TYPES =====

export interface PolicyFacts {
  // From Organization
  issuerCountry: string
  
  // From Product
  assetClass: AssetClass
  targetMarkets: string[]
  
  // From Asset
  ledger: AssetLedger
  distributionType: 'offer' | 'admission' | 'private'
  investorAudience: 'retail' | 'professional' | 'institutional'
  isCaspInvolved: boolean
  transferType: 'CASP_TO_CASP' | 'CASP_TO_SELF_HOSTED' | 'SELF_HOSTED_TO_CASP' | 'SELF_HOSTED_TO_SELF_HOSTED'
}

export interface RequirementInstance {
  id: string
  requirementTemplateId: string
  status: 'NA' | 'REQUIRED' | 'SATISFIED' | 'EXCEPTION'
  evidenceRefs?: Record<string, any>
  verifierId?: string
  verifiedAt?: Date
  rationale?: string
  exceptionReason?: string
}

export interface EnforcementPlan {
  xrpl: {
    requireAuth: boolean
    trustlineAuthorization: boolean
    freezeControl: boolean
  }
  evm: {
    allowlistGating: boolean
    pauseControl: boolean
    mintControl: boolean
    transferControl: boolean
  }
}

export interface PolicyEvaluationResult {
  requirementInstances: RequirementInstance[]
  enforcementPlan: EnforcementPlan
  rationale: string[]
}

// ===== POLICY KERNEL =====

export class PolicyKernel {
  /**
   * Evaluates facts and produces requirement instances and enforcement plan
   */
  async evaluateFacts(facts: PolicyFacts): Promise<PolicyEvaluationResult> {
    console.log('🔍 Policy Kernel: Evaluating facts', facts)
    
    const requirementInstances: RequirementInstance[] = []
    const rationale: string[] = []
    
    // Get all active requirement templates
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
    
    console.log(`📋 Found ${templates.length} active requirement templates`)
    
    // Evaluate each template against facts
    for (const template of templates) {
      const isApplicable = this.evaluateApplicability(template.applicabilityExpr, facts)
      
      if (isApplicable) {
        const status = this.determineStatus(template, facts)
        const instanceRationale = this.generateRationale(template, facts, status)
        
        requirementInstances.push({
          id: `${template.id}-${Date.now()}`,
          requirementTemplateId: template.id,
          status,
          rationale: instanceRationale
        })
        
        rationale.push(`${template.name}: ${instanceRationale}`)
      }
    }
    
    // Generate enforcement plan
    const enforcementPlan = this.generateEnforcementPlan(requirementInstances, facts)
    
    console.log(`✅ Policy Kernel: Generated ${requirementInstances.length} requirement instances`)
    
    return {
      requirementInstances,
      enforcementPlan,
      rationale
    }
  }
  
  /**
   * Evaluates applicability expression against facts
   */
  private evaluateApplicability(expression: string, facts: PolicyFacts): boolean {
    try {
      // Simple expression evaluator - in production, use a proper expression engine
      const context = {
        assetClass: facts.assetClass,
        ledger: facts.ledger,
        investorAudience: facts.investorAudience,
        isCaspInvolved: facts.isCaspInvolved,
        transferType: facts.transferType,
        distributionType: facts.distributionType,
        issuerCountry: facts.issuerCountry,
        targetMarkets: facts.targetMarkets
      }
      
      // Replace expressions with actual values
      let evalExpression = expression
        .replace(/assetClass == 'ART'/g, `facts.assetClass === 'ART'`)
        .replace(/assetClass == 'EMT'/g, `facts.assetClass === 'EMT'`)
        .replace(/assetClass == 'OTHER'/g, `facts.assetClass === 'OTHER'`)
        .replace(/ledger == 'XRPL'/g, `facts.ledger === 'XRPL'`)
        .replace(/ledger == 'ETHEREUM'/g, `facts.ledger === 'ETHEREUM'`)
        .replace(/ledger == 'HEDERA'/g, `facts.ledger === 'HEDERA'`)
        .replace(/investorAudience == 'retail'/g, `facts.investorAudience === 'retail'`)
        .replace(/isCaspInvolved == true/g, `facts.isCaspInvolved === true`)
        .replace(/transferType == 'CASP_TO_CASP'/g, `facts.transferType === 'CASP_TO_CASP'`)
        .replace(/transferType == 'CASP_TO_SELF_HOSTED'/g, `facts.transferType === 'CASP_TO_SELF_HOSTED'`)
        .replace(/transferType == 'SELF_HOSTED_TO_CASP'/g, `facts.transferType === 'SELF_HOSTED_TO_CASP'`)
        .replace(/distributionType == 'offer'/g, `facts.distributionType === 'offer'`)
        .replace(/distributionType == 'admission'/g, `facts.distributionType === 'admission'`)
        .replace(/distributionType == 'private'/g, `facts.distributionType === 'private'`)
      
      // Evaluate the expression
      return eval(`(${evalExpression})`)
    } catch (error) {
      console.error('❌ Error evaluating applicability expression:', expression, error)
      return false
    }
  }
  
  /**
   * Determines the status of a requirement based on facts
   */
  private determineStatus(template: any, facts: PolicyFacts): 'NA' | 'REQUIRED' | 'SATISFIED' | 'EXCEPTION' {
    // For MVP, all applicable requirements are REQUIRED
    // In production, this would check existing evidence and verification status
    return 'REQUIRED'
  }
  
  /**
   * Generates human-readable rationale for requirement status
   */
  private generateRationale(template: any, facts: PolicyFacts, status: string): string {
    const assetClassText = facts.assetClass === 'ART' ? 'Asset-Referenced Token' : 
                          facts.assetClass === 'EMT' ? 'E-Money Token' : 'Utility Token'
    
    const ledgerText = facts.ledger === 'XRPL' ? 'XRPL' : 
                      facts.ledger === 'ETHEREUM' ? 'Ethereum' : 'Hedera'
    
    switch (template.id) {
      case 'mica-issuer-auth-art-emt':
        return `${assetClassText} requires issuer authorization under MiCA`
      
      case 'mica-whitepaper-art':
        return `Asset-Referenced Token requires white paper under MiCA Article 6`
      
      case 'mica-kyc-tier-art-emt':
        return `${assetClassText} requires KYC verification`
      
      case 'mica-right-of-withdrawal':
        return `Retail investors have right of withdrawal under MiCA Article 13`
      
      case 'mica-marketing-communications':
        return `${assetClassText} marketing requires compliance with MiCA`
      
      case 'travel-rule-payload':
        return `CASP-to-CASP transfers require travel rule information`
      
      case 'travel-rule-self-hosted':
        return `Self-hosted wallet transfers require enhanced due diligence`
      
      case 'xrpl-trustline-auth':
        return `${ledgerText} requires trustline authorization`
      
      case 'evm-allowlist-gating':
        return `${ledgerText} requires allowlist gating for compliance`
      
      default:
        return `Requirement ${template.name} is applicable`
    }
  }
  
  /**
   * Generates enforcement plan based on requirement instances and facts
   */
  private generateEnforcementPlan(instances: RequirementInstance[], facts: PolicyFacts): EnforcementPlan {
    const plan: EnforcementPlan = {
      xrpl: {
        requireAuth: false,
        trustlineAuthorization: false,
        freezeControl: false
      },
      evm: {
        allowlistGating: false,
        pauseControl: false,
        mintControl: false,
        transferControl: false
      }
    }
    
    // Aggregate enforcement hints from all applicable requirements
    for (const instance of instances) {
      if (instance.status === 'REQUIRED' || instance.status === 'SATISFIED') {
        // In production, this would fetch the template and its enforcement hints
        // For MVP, we'll use the template ID to determine enforcement
        this.applyEnforcementHints(instance.requirementTemplateId, plan, facts)
      }
    }
    
    return plan
  }
  
  /**
   * Applies enforcement hints from a requirement template to the enforcement plan
   */
  private applyEnforcementHints(templateId: string, plan: EnforcementPlan, facts: PolicyFacts): void {
    switch (templateId) {
      case 'mica-issuer-auth-art-emt':
        if (facts.ledger === 'XRPL') {
          plan.xrpl.requireAuth = true
          plan.xrpl.trustlineAuthorization = true
        } else {
          plan.evm.allowlistGating = true
          plan.evm.pauseControl = true
        }
        break
      
      case 'mica-whitepaper-art':
        if (facts.ledger === 'XRPL') {
          plan.xrpl.requireAuth = true
        } else {
          plan.evm.allowlistGating = true
        }
        break
      
      case 'mica-kyc-tier-art-emt':
        if (facts.ledger === 'XRPL') {
          plan.xrpl.trustlineAuthorization = true
        } else {
          plan.evm.allowlistGating = true
        }
        break
      
      case 'mica-right-of-withdrawal':
        if (facts.ledger === 'XRPL') {
          plan.xrpl.freezeControl = true
        } else {
          plan.evm.pauseControl = true
        }
        break
      
      case 'mica-marketing-communications':
        if (facts.ledger === 'XRPL') {
          plan.xrpl.requireAuth = true
        } else {
          plan.evm.allowlistGating = true
        }
        break
      
      case 'travel-rule-payload':
      case 'travel-rule-self-hosted':
        if (facts.ledger === 'XRPL') {
          plan.xrpl.requireAuth = true
        } else {
          plan.evm.allowlistGating = true
        }
        break
      
      case 'xrpl-trustline-auth':
        plan.xrpl.requireAuth = true
        plan.xrpl.trustlineAuthorization = true
        break
      
      case 'evm-allowlist-gating':
        plan.evm.allowlistGating = true
        plan.evm.pauseControl = true
        break
    }
  }
  
  /**
   * Creates requirement instances for an asset in the database
   */
  async createRequirementInstances(assetId: string, facts: PolicyFacts): Promise<void> {
    const evaluation = await this.evaluateFacts(facts)
    
    // Create requirement instances in database
    for (const instance of evaluation.requirementInstances) {
      await prisma.requirementInstance.create({
        data: {
          assetId,
          requirementTemplateId: instance.requirementTemplateId,
          status: instance.status as any,
          rationale: instance.rationale,
          // Set default values for required fields
          holder: null,
          transferAmount: null,
          transferType: null,
          issuanceId: null
        }
      })
    }
    
    console.log(`✅ Created ${evaluation.requirementInstances.length} requirement instances for asset ${assetId}`)
  }

  /**
   * Evaluates facts for an existing asset and updates requirement instances
   */
  async updateRequirementInstances(assetId: string, facts: PolicyFacts): Promise<void> {
    const evaluation = await this.evaluateFacts(facts)
    
    // Get existing requirement instances
    const existingInstances = await prisma.requirementInstance.findMany({
      where: {
        assetId,
        issuanceId: null // Only live requirements, not snapshots
      }
    })
    
    // Create a map of existing template IDs
    const existingTemplateIds = new Set(existingInstances.map(inst => inst.requirementTemplateId))
    
    // Create new instances for new requirements
    for (const instance of evaluation.requirementInstances) {
      if (!existingTemplateIds.has(instance.requirementTemplateId)) {
        await prisma.requirementInstance.create({
          data: {
            assetId,
            requirementTemplateId: instance.requirementTemplateId,
            status: instance.status as any,
            rationale: instance.rationale,
            holder: null,
            transferAmount: null,
            transferType: null,
            issuanceId: null
          }
        })
      }
    }
    
    console.log(`✅ Updated requirement instances for asset ${assetId}`)
  }
}

export const policyKernel = new PolicyKernel()
