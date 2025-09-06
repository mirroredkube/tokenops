import { getLedgerAdapter } from '../adapters/index.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Check if issuer account has RequireAuth enabled
 * This is a critical security check before allowing authorization flows
 */

export interface RequireAuthCheckResult {
  hasRequireAuth: boolean
  accountInfo?: any
  error?: string
}

/**
 * Check if an issuer account has RequireAuth enabled
 */
export async function checkRequireAuth(issuerAddress: string): Promise<RequireAuthCheckResult> {
  try {
    const adapter = getLedgerAdapter()
    
    // Get account info from XRPL
    const accountInfo = await adapter.getAccountInfo?.(issuerAddress)
    
    if (!accountInfo) {
      return {
        hasRequireAuth: false,
        error: 'Account not found on ledger'
      }
    }
    
    // Check if RequireAuth flag is set
    const hasRequireAuth = accountInfo.Flags && (accountInfo.Flags & 0x00010000) !== 0
    
    return {
      hasRequireAuth,
      accountInfo
    }
  } catch (error: any) {
    console.error('Error checking RequireAuth:', error)
    return {
      hasRequireAuth: false,
      error: error.message || 'Failed to check RequireAuth status'
    }
  }
}

/**
 * Validate that an asset's issuer has RequireAuth enabled
 */
export async function validateAssetRequireAuth(assetId: string): Promise<RequireAuthCheckResult> {
  try {
    // Get asset and its issuer address
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        issuingAddress: true
      }
    })
    
    if (!asset) {
      return {
        hasRequireAuth: false,
        error: 'Asset not found'
      }
    }
    
    if (!asset.issuingAddress) {
      return {
        hasRequireAuth: false,
        error: 'Asset has no issuing address configured'
      }
    }
    
    return await checkRequireAuth(asset.issuingAddress.address)
  } catch (error: any) {
    console.error('Error validating asset RequireAuth:', error)
    return {
      hasRequireAuth: false,
      error: error.message || 'Failed to validate asset RequireAuth'
    }
  }
}

/**
 * Get user-friendly error message for RequireAuth issues
 */
export function getRequireAuthErrorMessage(result: RequireAuthCheckResult): string {
  if (result.hasRequireAuth) {
    return 'RequireAuth is properly configured'
  }
  
  if (result.error) {
    return `RequireAuth check failed: ${result.error}`
  }
  
  return 'RequireAuth is not enabled on the issuer account. Please enable RequireAuth before allowing authorization requests.'
}
