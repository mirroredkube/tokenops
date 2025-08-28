// ---------- Shared Asset Types and Storage ----------
export type Asset = {
  id: string;
  assetRef: string;
  ledger: "xrpl"|"hedera"|"ethereum";
  network: "mainnet"|"testnet"|"devnet";
  issuer: string;
  code: string;
  decimals: number;
  complianceMode: "OFF"|"RECORD_ONLY"|"GATED_BEFORE";
  controls?: {
    requireAuth?: boolean;
    freeze?: boolean;
    clawback?: boolean;
    transferFeeBps?: number;
  };
  registry?: {
    isin?: string;
    lei?: string;
    micaClass?: string;
    jurisdiction?: string;
  };
  metadata?: Record<string, any>;
  status: "draft"|"active"|"paused"|"retired";
  createdAt: string;
  updatedAt: string;
}

// ---------- In-Memory Storage (MVP) ----------
// TODO: Replace with database
export const assets = new Map<string, Asset>()
export const issuances = new Map<string, any>()

// ---------- Idempotency Storage (MVP) ----------
// TODO: Replace with Redis/database
export const idempotencyStore = new Map<string, { response: any; timestamp: number }>()

// ---------- Idempotency Helper ----------
export function checkIdempotency(idempotencyKey: string | undefined): any | null {
  if (!idempotencyKey) return null
  
  const stored = idempotencyStore.get(idempotencyKey)
  if (!stored) return null
  
  // Check if within 24h window
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000
  if (now - stored.timestamp > twentyFourHours) {
    idempotencyStore.delete(idempotencyKey)
    return null
  }
  
  return stored.response
}

export function storeIdempotency(idempotencyKey: string, response: any): void {
  idempotencyStore.set(idempotencyKey, {
    response,
    timestamp: Date.now()
  })
}

// ---------- Asset Validation Middleware ----------
export async function validateAsset(assetId: string): Promise<Asset> {
  const asset = assets.get(assetId)
  if (!asset) {
    throw new Error('Asset not found')
  }
  if (asset.status !== 'active') {
    throw new Error(`Asset is ${asset.status}, must be active`)
  }
  return asset
}

// ---------- Helper Functions ----------
export function generateAssetRef(ledger: string, network: string, issuer: string, code: string): string {
  switch (ledger) {
    case 'xrpl':
      return `xrpl:${network}/iou:${issuer}.${code}`
    case 'hedera':
      return `hedera:${network}/hts:${issuer}`
    case 'ethereum':
      return `eip155:${network === 'mainnet' ? '1' : '11155111'}/erc20:${issuer}`
    default:
      throw new Error(`Unsupported ledger: ${ledger}`)
  }
}

export function generateAssetId(): string {
  return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateIssuanceId(): string {
  return `iss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
