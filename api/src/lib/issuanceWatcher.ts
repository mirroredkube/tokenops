import { PrismaClient } from '@prisma/client'
import { withClient } from './xrplClient.js'
import xrpl from 'xrpl'

const prisma = new PrismaClient()

export interface LedgerTransactionStatus {
  validated: boolean
  result?: string
  ledgerIndex?: number
  message?: string
}

export class IssuanceStatusWatcher {
  /**
   * Check transaction status on XRPL
   */
  private async checkTransactionOnLedger(txId: string): Promise<LedgerTransactionStatus> {
    try {
      const response = await withClient(async (client) => {
        return await client.request({
          command: 'tx',
          transaction: txId
        })
      })

      if (response.result.validated) {
        const meta = response.result.meta as any
        return {
          validated: true,
          result: meta?.TransactionResult,
          ledgerIndex: response.result.ledger_index,
          message: meta?.TransactionResult
        }
      }

      return { validated: false }
    } catch (error) {
      console.error(`Error checking transaction ${txId}:`, error)
      return { validated: false }
    }
  }

  /**
   * Update issuance status based on ledger check
   */
  private async updateIssuanceStatus(
    issuanceId: string, 
    status: string, 
    updateData: {
      validatedAt?: Date
      validatedLedgerIndex?: number
      failureCode?: string
    }
  ) {
    try {
      await prisma.issuance.update({
        where: { id: issuanceId },
        data: {
          status,
          ...updateData,
          updatedAt: new Date()
        }
      })
      console.log(`Updated issuance ${issuanceId} to status: ${status}`)
    } catch (error) {
      console.error(`Error updating issuance ${issuanceId}:`, error)
    }
  }

  /**
   * Main watcher job - runs every 10 seconds
   * Checks issuances submitted within the last 90 seconds
   */
  async runWatcherJob() {
    try {
      const ninetySecondsAgo = new Date(Date.now() - 90 * 1000)
      
      const recentSubmittedIssuances = await prisma.issuance.findMany({
        where: {
          status: 'submitted',
          createdAt: {
            gte: ninetySecondsAgo
          },
          txId: {
            not: null
          }
        },
        select: {
          id: true,
          txId: true
        }
      })

      console.log(`Checking ${recentSubmittedIssuances.length} submitted issuances`)

      for (const issuance of recentSubmittedIssuances) {
        if (!issuance.txId) continue

        const ledgerStatus = await this.checkTransactionOnLedger(issuance.txId)

        if (ledgerStatus.validated) {
          if (ledgerStatus.result === 'tesSUCCESS') {
            await this.updateIssuanceStatus(issuance.id, 'validated', {
              validatedAt: new Date(),
              validatedLedgerIndex: ledgerStatus.ledgerIndex ? Number(ledgerStatus.ledgerIndex) : undefined
            })
          } else {
            await this.updateIssuanceStatus(issuance.id, 'failed', {
              failureCode: ledgerStatus.result
            })
          }
        }
        // If not validated, leave as 'submitted' (will be checked again or user can refresh)
      }
    } catch (error) {
      console.error('Error in issuance watcher job:', error)
    }
  }

  /**
   * Manual refresh for a specific issuance
   */
  async refreshIssuanceStatus(issuanceId: string): Promise<boolean> {
    try {
      const issuance = await prisma.issuance.findUnique({
        where: { id: issuanceId },
        select: { id: true, txId: true, status: true }
      })

      if (!issuance || !issuance.txId || issuance.status !== 'submitted') {
        return false
      }

      const ledgerStatus = await this.checkTransactionOnLedger(issuance.txId)

      if (ledgerStatus.validated) {
        if (ledgerStatus.result === 'tesSUCCESS') {
          await this.updateIssuanceStatus(issuance.id, 'validated', {
            validatedAt: new Date(),
            validatedLedgerIndex: ledgerStatus.ledgerIndex ? Number(ledgerStatus.ledgerIndex) : undefined
          })
        } else {
          await this.updateIssuanceStatus(issuance.id, 'failed', {
            failureCode: ledgerStatus.result
          })
        }
        return true
      }

      return false
    } catch (error) {
      console.error(`Error refreshing issuance ${issuanceId}:`, error)
      return false
    }
  }
}

// Export singleton instance
export const issuanceWatcher = new IssuanceStatusWatcher()
