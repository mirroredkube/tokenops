import { PrismaClient } from '@prisma/client';

export class RequirementSnapshotService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates snapshot copies of live requirement instances for an issuance
   * This implements the architect's design where issuance-linked requirements
   * are immutable snapshots of the asset's live requirements at issuance time
   */
  async createIssuanceSnapshot(assetId: string, issuanceId: string): Promise<void> {
    // Get all live requirement instances for the asset (issuanceId = null)
    const liveRequirements = await this.prisma.requirementInstance.findMany({
      where: {
        assetId,
        issuanceId: null
      },
      include: {
        requirementTemplate: true
      }
    });

    if (liveRequirements.length === 0) {
      console.log(`No live requirements found for asset ${assetId}`);
      return;
    }

    // Create snapshot copies with issuanceId set
    const snapshotPromises = liveRequirements.map(liveReq => 
      this.prisma.requirementInstance.create({
        data: {
          assetId: liveReq.assetId,
          requirementTemplateId: liveReq.requirementTemplateId,
          status: liveReq.status,
          evidenceRefs: liveReq.evidenceRefs as any,
          verifierId: liveReq.verifierId,
          verifiedAt: liveReq.verifiedAt,
          rationale: liveReq.rationale,
          exceptionReason: liveReq.exceptionReason,
          holder: liveReq.holder,
          transferAmount: liveReq.transferAmount,
          transferType: liveReq.transferType,
          issuanceId: issuanceId, // This makes it a snapshot
          createdAt: new Date(), // New timestamp for the snapshot
          updatedAt: new Date()
        }
      })
    );

    await this.prisma.$transaction(snapshotPromises);
    
    console.log(`Created ${liveRequirements.length} requirement snapshots for issuance ${issuanceId}`);
  }

  /**
   * Validates that all required requirements are satisfied before allowing issuance
   */
  async validateIssuanceRequirements(assetId: string): Promise<{
    valid: boolean;
    blockedRequirements: Array<{
      id: string;
      name: string;
      status: string;
      rationale?: string;
    }>;
  }> {
    const liveRequirements = await this.prisma.requirementInstance.findMany({
      where: {
        assetId,
        issuanceId: null,
        status: 'REQUIRED' // Only check required ones
      },
      include: {
        requirementTemplate: true
      }
    });

    const blockedRequirements = liveRequirements.filter(req => req.status !== 'SATISFIED');

    return {
      valid: blockedRequirements.length === 0,
      blockedRequirements: blockedRequirements.map(req => ({
        id: req.id,
        name: req.requirementTemplate.name,
        status: req.status,
        rationale: req.rationale || undefined
      }))
    };
  }

  /**
   * Gets the snapshot requirements for a specific issuance
   */
  async getIssuanceSnapshot(issuanceId: string) {
    return this.prisma.requirementInstance.findMany({
      where: {
        issuanceId
      },
      include: {
        requirementTemplate: {
          include: {
            regime: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }
}
