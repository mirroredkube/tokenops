// Convert 4+ letter ASCII currency code to 40-char hex (XRPL standard)
export function currencyToHex(code: string): string {
    const hex = Buffer.from(code, 'ascii').toString('hex').toUpperCase()
    return hex.padEnd(40, '0') // pad to 20 bytes (40 hex chars)
  }
  
  // Detect if already in hex format
  export function isHexCurrency(code: string): boolean {
    return /^[0-9A-F]{40}$/.test(code)
  }

  
  export function hexCurrencyToAscii(hex: string): string | null {
    if (!/^[0-9A-F]{40}$/.test(hex)) return null
    // strip trailing zeros and decode
    const trimmed = hex.replace(/0+$/,'')
    try {
      return Buffer.from(trimmed, 'hex').toString('ascii')
    } catch { return null }
  }