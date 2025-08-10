// Convert 4+ letter ASCII currency code to 40-char hex (XRPL standard)
export function currencyToHex(code: string): string {
    const hex = Buffer.from(code, 'ascii').toString('hex').toUpperCase()
    return hex.padEnd(40, '0') // pad to 20 bytes (40 hex chars)
  }
  
  // Detect if already in hex format
  export function isHexCurrency(code: string): boolean {
    return /^[0-9A-F]{40}$/.test(code)
  }
  