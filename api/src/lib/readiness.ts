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

  // Core required fields (all classes)
  if (!registry.jurisdiction) {
    blockers.push({ code: 'JURISDICTION_MISSING', message: 'Jurisdiction is required', hint: 'Add one or more jurisdictions in the Registry section' })
  }
  if (!registry.whitePaperRef) {
    blockers.push({ code: 'WHITEPAPER_MISSING', message: 'White Paper reference is required', hint: 'Provide a URL to the published white paper' })
  }
  if (!registry.riskAssessment) {
    blockers.push({ code: 'RISK_ASSESSMENT_MISSING', message: 'Risk assessment is required', hint: 'Summarize key risks in the Registry section' })
  }

  // ART/EMT specific
  if (assetClass === 'ART' || assetClass === 'EMT') {
    if (!registry.lei) {
      blockers.push({ code: 'LEI_MISSING', message: 'LEI code is required for ART/EMT' })
    }
    if (!registry.reserveAssets) {
      blockers.push({ code: 'RESERVE_ASSETS_MISSING', message: 'Reserve assets description is required for ART/EMT' })
    }
    if (!registry.custodian) {
      blockers.push({ code: 'CUSTODIAN_MISSING', message: 'Custodian information is required for ART/EMT' })
    }
  }

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


