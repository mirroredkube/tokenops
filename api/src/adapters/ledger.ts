// A minimal interface your routes can code against.
export type IssueParams = {
    currencyCode: string; amount: string; destination: string; metadata?: Record<string, any>
  }
  export type TrustlineParams = {
    currencyCode: string; limit: string; holderSecret: string
  }
  export type BalancesParams = {
  account: string; issuer?: string; currency?: string
}

export type AccountLinesParams = {
  account: string; peer: string; ledger_index?: string
}

// New ledger-agnostic types
export type AssetRef = { 
  ledger: string; 
  issuer: string; 
  code: string; 
  decimals?: number; 
  id?: string 
}

export type PrereqStatus =
  | { ok: true; details: Record<string, any> }
  | { ok: false; reason: string; fix: "PREREQ_SIGN" | "INSUFFICIENT_RESERVE" | "LIMIT_TOO_LOW" | "UNKNOWN" }

export type SignIntent = { kind: "WALLET_POPUP"; tx: any }

export type TxResult = { txid: string }

export interface LedgerAdapter {
  name: 'XRPL' | 'HEDERA' | string
  
  // Legacy methods (for backward compatibility)
  issueToken(p: IssueParams): Promise<{ txHash: string }>
  createTrustline(p: TrustlineParams): Promise<{ txHash?: string; alreadyExisted?: boolean }>
  getBalances(p: BalancesParams): Promise<{ xrpBalance?: string; balances: any[] }>
  getAccountLines(p: AccountLinesParams): Promise<any[]>
  
  // New ledger-agnostic methods (optional for backward compatibility)
  id?: string
  
  // Prereq: trustline / associate / ATA / none
  checkPrereq?(p: { holder: string; asset: AssetRef }): Promise<PrereqStatus>
  requestPrereqSetup?(p: { holder: string; asset: AssetRef }): Promise<SignIntent>
  
  // Optional (used later for GATED_BEFORE)
  supportsAuthorization?: boolean
  authorize?(p: { holder: string; asset: AssetRef }): Promise<TxResult>
  
  issue?(p: {
    to: string; asset: AssetRef; amount: string; memoHex?: string;
  }): Promise<TxResult>
  
  explorerTxUrl?(txid: string): string
}
  