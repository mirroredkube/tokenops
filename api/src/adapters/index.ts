import { xrplAdapter } from './xrpl.js'
import type { LedgerAdapter } from './ledger.js'

export function getLedgerAdapter(): LedgerAdapter {
  const name = (process.env.LEDGER || 'XRPL').toUpperCase()
  switch (name) {
    case 'XRPL': return xrplAdapter
    // case 'HEDERA': return hederaAdapter
    default: return xrplAdapter
  }
}
