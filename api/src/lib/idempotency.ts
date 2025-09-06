import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Idempotency key system to prevent duplicate operations
 */

export interface IdempotencyResult<T = any> {
  isDuplicate: boolean
  result?: T
  key: string
}

/**
 * Generate idempotency key from request data
 */
export function generateIdempotencyKey(operation: string, data: any): string {
  const dataString = JSON.stringify({ operation, data })
  return crypto.createHash('sha256').update(dataString).digest('hex')
}

/**
 * Check if operation is duplicate and store result
 */
export async function checkIdempotency<T>(
  key: string,
  operation: () => Promise<T>
): Promise<IdempotencyResult<T>> {
  try {
    // Check if we already have a result for this key
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key }
    })
    
    if (existing) {
      return {
        isDuplicate: true,
        result: existing.result as T,
        key
      }
    }
    
    // Execute operation
    const result = await operation()
    
    // Store result for future duplicate checks
    await prisma.idempotencyKey.create({
      data: {
        key,
        result: result as any,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })
    
    return {
      isDuplicate: false,
      result,
      key
    }
  } catch (error) {
    console.error('Idempotency check error:', error)
    throw error
  }
}

/**
 * Clean up expired idempotency keys
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<void> {
  try {
    await prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
  } catch (error) {
    console.error('Error cleaning up expired idempotency keys:', error)
  }
}
