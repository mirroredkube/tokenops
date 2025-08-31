import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

export interface ComplianceManifest {
  org_id: string;
  product_id: string;
  asset_id: string;
  regime_versions: Array<{
    name: string;
    version: string;
  }>;
  requirements_snapshot: Array<{
    requirement_instance_id: string;
    requirement_template_id: string;
    status: string;
    evidence_digest?: string;
    rationale?: string;
  }>;
  enforcement_plan: {
    ledger: string;
    network: string;
    compliance_mode: string;
    gating_enabled: boolean;
  };
  issuance_facts: {
    amount: string;
    holder: string;
    purpose?: string;
    isin?: string;
    legal_issuer?: string;
    jurisdiction?: string;
    mica_class?: string;
    kyc_requirement?: string;
    transfer_restrictions?: string;
    max_transfer_amount?: string;
    expiration_date?: string;
    tranche_series?: string;
    references?: string[];
  };
  approved_by?: string;
  verified_by?: string;
  timestamp: string;
  manifest_version: string;
}

export class ComplianceManifestBuilder {
  constructor(private prisma: PrismaClient) {}

  async buildManifest(
    issuanceId: string,
    issuanceFacts: Record<string, any>
  ): Promise<ComplianceManifest> {
    const issuance = await this.prisma.issuance.findUnique({
      where: { id: issuanceId },
      include: {
        asset: {
          include: {
            product: {
              include: {
                organization: true
              }
            }
          }
        },
        requirementInstances: {
          include: {
            requirementTemplate: {
              include: {
                regime: true
              }
            }
          }
        }
      }
    });

    if (!issuance) {
      throw new Error(`Issuance ${issuanceId} not found`);
    }

    // Get unique regimes from requirement templates
    const regimeVersions = Array.from(
      new Set(
        issuance.requirementInstances.map(ri => 
          `${ri.requirementTemplate.regime.name}:${ri.requirementTemplate.regime.version}`
        )
      )
    ).map(rv => {
      const [name, version] = rv.split(':');
      return { name, version };
    });

    // Build requirements snapshot
    const requirementsSnapshot = issuance.requirementInstances.map(ri => ({
      requirement_instance_id: ri.id,
      requirement_template_id: ri.requirementTemplateId,
      status: ri.status,
      evidence_digest: this.computeEvidenceDigest(ri.evidenceRefs),
      rationale: ri.rationale || undefined
    }));

    // Build enforcement plan
    const enforcementPlan = {
      ledger: issuance.asset.ledger,
      network: issuance.asset.network,
      compliance_mode: issuance.asset.complianceMode,
      gating_enabled: issuance.asset.complianceMode !== 'OFF'
    };

    // Build issuance facts
    const facts = {
      amount: issuance.amount,
              holder: (issuance as any).holder,
      ...issuanceFacts
    };

    const manifest: ComplianceManifest = {
      org_id: issuance.asset.product.organization.id,
      product_id: issuance.asset.product.id,
      asset_id: issuance.asset.id,
      regime_versions: regimeVersions,
      requirements_snapshot: requirementsSnapshot,
      enforcement_plan: enforcementPlan,
      issuance_facts: facts,
      timestamp: new Date().toISOString(),
      manifest_version: '1.0'
    };

    return manifest;
  }

  private computeEvidenceDigest(evidenceRefs: any): string | undefined {
    if (!evidenceRefs || typeof evidenceRefs !== 'object') {
      return undefined;
    }

    // Create a deterministic string representation
    const evidenceString = JSON.stringify(evidenceRefs, Object.keys(evidenceRefs).sort());
    return createHash('sha256').update(evidenceString).digest('hex');
  }

  generateManifestHash(manifest: ComplianceManifest): string {
    // Canonicalize the JSON (RFC 8785 / JCS)
    const canonicalized = this.canonicalizeJSON(manifest);
    return createHash('sha256').update(canonicalized).digest('hex');
  }

  private canonicalizeJSON(obj: any): string {
    // Simple canonicalization - sort keys and use consistent formatting
    return JSON.stringify(obj, Object.keys(obj).sort());
  }
}
