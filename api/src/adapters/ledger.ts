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

export interface LedgerAdapter {
  name: 'XRPL' | 'HEDERA' | string
  issueToken(p: IssueParams): Promise<{ txHash: string }>
  createTrustline(p: TrustlineParams): Promise<{ txHash?: string; alreadyExisted?: boolean }>
  getBalances(p: BalancesParams): Promise<{ xrpBalance?: string; balances: any[] }>
  getAccountLines(p: AccountLinesParams): Promise<any[]>
}
  