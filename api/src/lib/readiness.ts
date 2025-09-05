import prisma from '../db/client.js'

type ReadinessBlocker = {
  code: string
  message: string
  hint?: string
}

type ReadinessResult = {
  ok: boolean
  blockers: ReadinessBlocker[]
  facts: Record<string, any>
}

export async function computeAssetReadiness(assetId: string): Promise<ReadinessResult> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      issuingAddress: true,
      product: true
    }
  })

  const blockers: ReadinessBlocker[] = []

  if (!asset) {
    return { ok: false, blockers: [{ code: 'ASSET_NOT_FOUND', message: 'Asset not found' }], facts: {} }
  }

  const registry = (asset.registry || {}) as Record<string, any>
  const controls = (asset.controls || {}) as Record<string, any>
  const assetClass = asset.assetClass

  // Issuer address must be approved
  if (!asset.issuingAddress || asset.issuingAddress.status !== 'APPROVED') {
    blockers.push({ code: 'ISSUER_NOT_APPROVED', message: 'Issuing address must be registered and approved' })
  }

  // Basic ledger control sanity (XRPL)
  if (asset.ledger === 'XRPL' && asset.complianceMode === 'GATED_BEFORE') {
    if (!controls.requireAuth) {
      blockers.push({ code: 'XRPL_REQUIRE_AUTH_DISABLED', message: 'XRPL Require Authorization should be enabled when using GATED_BEFORE' })
    }
  }

  const facts = {
    assetId: asset.id,
    assetClass,
    ledger: asset.ledger,
    complianceMode: asset.complianceMode,
    issuerApproved: !!asset.issuingAddress && asset.issuingAddress.status === 'APPROVED',
    registry
  }

  return { ok: blockers.length === 0, blockers, facts }
}


