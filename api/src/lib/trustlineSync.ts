import { PrismaClient, AuthorizationStatus, AuthorizationInitiator } from '@prisma/client'
import { getLedgerAdapter } from '../adapters/index.js'

const prisma = new PrismaClient()

/**
 * Trustline sync service that detects external changes, limit updates, and closures
 * Implements the sync logic from the architect's pseudocode
 */

export interface SyncResult {
  processed: number
  external: number
  authorized: number
  limitUpdated: number
  closed: number
  errors: string[]
}

/**
 * Sync trustlines for a specific asset
 */
export async function syncTrustlines(assetId: string): Promise<SyncResult> {
  const result: SyncResult = {
    processed: 0,
    external: 0,
    authorized: 0,
    limitUpdated: 0,
    closed: 0,
    errors: []
  }

  try {
    // Get asset info
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        issuingAddress: true,
        product: true
      }
    })

    if (!asset || !asset.issuingAddress) {
      result.errors.push('Asset or issuing address not found')
      return result
    }

    const adapter = getLedgerAdapter()
    
    // Get all trustlines for this issuer
    const lines = await adapter.getAccountLines({
      account: asset.issuingAddress.address,
      peer: '', // Get all trustlines (empty string means all)
      ledger_index: 'validated'
    })

    const seen = new Set<string>()

    // Process each trustline
    for (const line of lines) {
      if (line.currency !== asset.code) continue

      const holder = line.account
      const auth = line.authorized || line.peer_authorized
      const hLim = line.limit_peer
      const iLim = line.limit

      seen.add(holder)
      result.processed++

      try {
        // Get latest authorization entry for this holder
        const last = await prisma.authorization.findFirst({
          where: {
            assetId: asset.id,
            holderAddress: holder
          },
          orderBy: { createdAt: 'desc' }
        })

        if (!last) {
          // No local row - create EXTERNAL or ISSUER_AUTHORIZED entry
          await prisma.authorization.create({
            data: {
              tenantId: asset.product.organizationId,
              assetId: asset.id,
              ledger: `${asset.ledger}-${asset.network}`,
              currency: asset.code,
              holderAddress: holder,
              limit: hLim,
              status: auth ? AuthorizationStatus.ISSUER_AUTHORIZED : AuthorizationStatus.EXTERNAL,
              initiatedBy: AuthorizationInitiator.SYSTEM,
              txHash: null
            }
          })
          
          if (auth) {
            result.authorized++
          } else {
            result.external++
          }
          continue
        }

        // Check for authorization flip
        if (auth && last.status !== AuthorizationStatus.ISSUER_AUTHORIZED) {
          await prisma.authorization.create({
            data: {
              tenantId: asset.product.organizationId,
              assetId: asset.id,
              ledger: `${asset.ledger}-${asset.network}`,
              currency: asset.code,
              holderAddress: holder,
              limit: hLim,
              status: AuthorizationStatus.ISSUER_AUTHORIZED,
              initiatedBy: AuthorizationInitiator.SYSTEM,
              txHash: null
            }
          })
          result.authorized++
        }

        // Check for holder limit change
        if (last.limit !== hLim) {
          await prisma.authorization.create({
            data: {
              tenantId: asset.product.organizationId,
              assetId: asset.id,
              ledger: `${asset.ledger}-${asset.network}`,
              currency: asset.code,
              holderAddress: holder,
              limit: hLim,
              status: AuthorizationStatus.LIMIT_UPDATED,
              initiatedBy: AuthorizationInitiator.HOLDER,
              txHash: null
            }
          })
          result.limitUpdated++
        }

      } catch (error: any) {
        result.errors.push(`Error processing holder ${holder}: ${error.message}`)
      }
    }

    // Check for closures - holders that were active but not in current trustlines
    const priorActive = await prisma.authorization.findMany({
      where: {
        assetId: asset.id,
        status: {
          notIn: [AuthorizationStatus.TRUSTLINE_CLOSED]
        }
      },
      select: { holderAddress: true },
      distinct: ['holderAddress']
    })

    for (const prior of priorActive) {
      if (!seen.has(prior.holderAddress)) {
        await prisma.authorization.create({
          data: {
            tenantId: asset.product.organizationId,
            assetId: asset.id,
            ledger: `${asset.ledger}-${asset.network}`,
            currency: asset.code,
            holderAddress: prior.holderAddress,
            limit: "0",
            status: AuthorizationStatus.TRUSTLINE_CLOSED,
            initiatedBy: AuthorizationInitiator.HOLDER,
            txHash: null
          }
        })
        result.closed++
      }
    }

  } catch (error: any) {
    result.errors.push(`Sync error: ${error.message}`)
  }

  return result
}

/**
 * Sync all assets for a tenant
 */
export async function syncAllTrustlines(tenantId: string): Promise<SyncResult> {
  const assets = await prisma.asset.findMany({
    where: {
      product: {
        organizationId: tenantId
      },
      status: 'ACTIVE'
    },
    include: {
      issuingAddress: true,
      product: true
    }
  })

  const totalResult: SyncResult = {
    processed: 0,
    external: 0,
    authorized: 0,
    limitUpdated: 0,
    closed: 0,
    errors: []
  }

  for (const asset of assets) {
    const result = await syncTrustlines(asset.id)
    
    totalResult.processed += result.processed
    totalResult.external += result.external
    totalResult.authorized += result.authorized
    totalResult.limitUpdated += result.limitUpdated
    totalResult.closed += result.closed
    totalResult.errors.push(...result.errors)
  }

  return totalResult
}
