import xrpl, { Client, Wallet } from 'xrpl'
import { withClient } from '../lib/xrplClient.js'
import { currencyToHex, isHexCurrency, hexCurrencyToAscii } from '../utils/currency.js'
import type { LedgerAdapter, IssueParams, TrustlineParams, BalancesParams, AccountLinesParams, AssetRef, PrereqStatus, SignIntent, TxResult } from './ledger.js'

const normalize = (code: string) => {
  const up = code.trim().toUpperCase()
  if (up === 'XRP') throw new Error('Use native XRP for XRP; issuance is for IOUs.')
  if (up.length === 3 || isHexCurrency(up)) return up
  return currencyToHex(up)
}

export const xrplAdapter: LedgerAdapter = {
  name: 'XRPL',
  id: 'xrpl',
  supportsAuthorization: false,

  // Legacy methods (backward compatibility)
  async issueToken({ currencyCode, amount, destination, metadata }: IssueParams) {
    const seed = process.env.ISSUER_SEED || process.env.ISSUER_SECRET
    if (!seed) throw new Error('Missing ISSUER_SEED')
    const wallet = Wallet.fromSeed(seed)
    const currency = normalize(currencyCode)

    return await withClient(async (client: Client) => {
      const prepared = await client.autofill({
        TransactionType: 'Payment',
        Account: wallet.address,
        Destination: destination,
        Amount: { currency, value: amount, issuer: wallet.address },
        Memos: metadata ? [{ Memo: { MemoData: Buffer.from(JSON.stringify(metadata)).toString('hex').toUpperCase() } }] : undefined,
      })
      const signed = wallet.sign(prepared)
      const res = await client.submitAndWait(signed.tx_blob)
      const ok = ((res.result as any)?.engine_result || (res.result as any)?.meta?.TransactionResult) === 'tesSUCCESS'
      if (!ok) throw new Error((res.result as any)?.engine_result ?? 'submit_failed')
      return { txHash: signed.hash }
    })
  },

  async createTrustline({ currencyCode, limit, holderSecret }: TrustlineParams) {
    const issuer =
      process.env.ISSUER_ADDRESS
      || (process.env.ISSUER_SEED && Wallet.fromSeed(process.env.ISSUER_SEED).address)
      || (process.env.ISSUER_SECRET && Wallet.fromSeed(process.env.ISSUER_SECRET).address)
    if (!issuer) throw new Error('Missing ISSUER_ADDRESS/SEED')
    const holder = Wallet.fromSeed(holderSecret)
    const currency = normalize(currencyCode)

    return await withClient(async (client: Client) => {
      const lines = await client.request({ command: 'account_lines', account: holder.address, ledger_index: 'validated', peer: issuer } as any)
      const existing = ((lines.result as any).lines || []).find((l: any) => l.currency === currency)
      if (existing && Number(existing.limit) >= Number(limit)) return { alreadyExisted: true, txHash: undefined }

      const prepared = await client.autofill({
        TransactionType: 'TrustSet',
        Account: holder.address,
        LimitAmount: { currency, issuer, value: limit },
      })
      const signed = holder.sign(prepared)
      const res = await client.submitAndWait(signed.tx_blob)
      const ok = ((res.result as any)?.engine_result || (res.result as any)?.meta?.TransactionResult) === 'tesSUCCESS'
      if (!ok) throw new Error((res.result as any)?.engine_result ?? 'submit_failed')
      return { alreadyExisted: false, txHash: signed.hash }
    })
  },

  async getBalances({ account, issuer, currency }: BalancesParams) {
    return await withClient(async (client: Client) => {
      const info = await client.request({ command: 'account_info', account, ledger_index: 'validated' })
      const xrpBalance = xrpl.dropsToXrp(info.result.account_data.Balance)
      const lines = await client.request({ command: 'account_lines', account, ledger_index: 'validated' } as any)

      const norm = (c?: string) => {
        if (!c) return { ascii: undefined, hex: undefined }
        const up = c.toUpperCase()
        if (up === 'XRP') return { ascii: 'XRP', hex: undefined }
        if (isHexCurrency(up)) return { ascii: undefined, hex: up }
        return up.length === 3 ? { ascii: up, hex: undefined } : { ascii: undefined, hex: currencyToHex(up) }
      }
      const { ascii, hex } = norm(currency)

      const balances = ((lines.result as any).lines || [])
        .filter((l: any) => (!issuer || l.account === issuer) && (!ascii || l.currency === ascii) && (!hex || l.currency === hex))
        .map((l: any) => ({
          currency: isHexCurrency(l.currency) ? hexCurrencyToAscii(l.currency) : l.currency,
          currencyHex: isHexCurrency(l.currency) ? l.currency : currencyToHex(l.currency),
          issuer: l.account,
          balance: l.balance,
          limit: l.limit,
          frozen: !!l.freeze || !!l.frozen,
          noRipple: !!l.no_ripple,
          qualityIn: l.quality_in,
          qualityOut: l.quality_out,
        }))

      return { xrpBalance: xrpBalance.toString(), balances }
    })
  },

  async getAccountLines({ account, peer, ledger_index = 'validated' }: AccountLinesParams) {
    return await withClient(async (client: Client) => {
      const resp = await client.request({ 
        command: 'account_lines', 
        account, 
        peer, 
        ledger_index 
      } as any)
      
      return (resp.result as any).lines || []
    })
  },

  // New ledger-agnostic methods
  async checkPrereq({ holder, asset }: { holder: string; asset: AssetRef }): Promise<PrereqStatus> {
    if (asset.ledger !== 'xrpl') {
      return { ok: false, reason: 'Unsupported ledger', fix: 'UNKNOWN' }
    }

    return await withClient(async (client: Client) => {
      const lines = await client.request({
        command: "account_lines",
        account: holder,
        peer: asset.issuer,
        ledger_index: "validated",
      })
      
      const line = (lines.result as any).lines.find((l: any) => {
        const lineCurrency = l.currency?.toUpperCase()
        
        if (isHexCurrency(asset.code)) {
          return lineCurrency === asset.code
        } else {
          return lineCurrency === asset.code || lineCurrency === currencyToHex(asset.code)
        }
      })
      
      if (!line) {
        return { ok: false, reason: "No trustline", fix: "PREREQ_SIGN" }
      }
      
      if (Number(line.limit) <= 0) {
        return { ok: false, reason: "Limit too low", fix: "LIMIT_TOO_LOW" }
      }
      
      return { 
        ok: true, 
        details: { 
          limit: line.limit, 
          balance: line.balance,
          currency: line.currency,
          issuer: line.account
        } 
      }
    })
  },

  async requestPrereqSetup({ holder, asset }: { holder: string; asset: AssetRef }): Promise<SignIntent> {
    if (asset.ledger !== 'xrpl') {
      throw new Error('Unsupported ledger')
    }

    const currency = normalize(asset.code)
    const tx = {
      TransactionType: "TrustSet",
      Account: holder,
      LimitAmount: { 
        currency: currency, 
        issuer: asset.issuer, 
        value: "1000000000" // Default limit, could be made configurable
      },
    }
    
    return { kind: "WALLET_POPUP", tx }
  },

  async issue({ to, asset, amount, memoHex }: { to: string; asset: AssetRef; amount: string; memoHex?: string }): Promise<TxResult> {
    if (asset.ledger !== 'xrpl') {
      throw new Error('Unsupported ledger')
    }

    const seed = process.env.ISSUER_SEED || process.env.ISSUER_SECRET
    if (!seed) throw new Error('Missing ISSUER_SEED')
    const wallet = Wallet.fromSeed(seed)
    const currency = normalize(asset.code)

    return await withClient(async (client: Client) => {
      const prepared = await client.autofill({
        TransactionType: 'Payment',
        Account: wallet.address,
        Destination: to,
        Amount: { 
          currency: currency, 
          value: amount, 
          issuer: wallet.address 
        },
        Memos: memoHex ? [{ Memo: { MemoData: Buffer.from(memoHex, 'utf8').toString('hex').toUpperCase() } }] : undefined,
      })
      const signed = wallet.sign(prepared)
      const res = await client.submitAndWait(signed.tx_blob)
      const ok = ((res.result as any)?.engine_result || (res.result as any)?.meta?.TransactionResult) === 'tesSUCCESS'
      if (!ok) throw new Error((res.result as any)?.engine_result ?? 'submit_failed')
      return { txid: signed.hash }
    })
  },

  explorerTxUrl(txid: string): string {
    return `https://livenet.xrpl.org/transactions/${txid}`
  },

  // New method to get account info for RequireAuth checking
  async getAccountInfo(account: string): Promise<any> {
    return await withClient(async (client: Client) => {
      const response = await client.request({
        command: 'account_info',
        account: account,
        ledger_index: 'validated'
      })
      return response.result.account_data
    })
  },

  // New method to get transaction details
  async getTransaction(txHash: string): Promise<any> {
    return await withClient(async (client: Client) => {
      const response = await client.request({
        command: 'tx',
        transaction: txHash
      })
      return response.result
    })
  },

  // New method to create issuer authorization TrustSet
  async authorizeTrustline({ holderAddress, currency, issuerAddress, issuerLimit = "0" }: {
    holderAddress: string
    currency: string
    issuerAddress: string
    issuerLimit?: string
  }): Promise<TxResult> {
    const seed = process.env.ISSUER_SEED || process.env.ISSUER_SECRET
    if (!seed) throw new Error('Missing ISSUER_SEED')
    const wallet = Wallet.fromSeed(seed)
    const currencyHex = normalize(currency)

    return await withClient(async (client: Client) => {
      const prepared = await client.autofill({
        TransactionType: 'TrustSet',
        Account: wallet.address,
        LimitAmount: {
          currency: currencyHex,
          issuer: holderAddress,
          value: issuerLimit
        },
        Flags: 65536 // tfSetfAuth
      })
      const signed = wallet.sign(prepared)
      const res = await client.submitAndWait(signed.tx_blob)
      const ok = ((res.result as any)?.engine_result || (res.result as any)?.meta?.TransactionResult) === 'tesSUCCESS'
      if (!ok) throw new Error((res.result as any)?.engine_result ?? 'submit_failed')
      return { txid: signed.hash }
    })
  }
}
