import crypto from 'crypto'

/**
 * One-time token system for secure authorization requests
 * Never stores raw tokens - only hashes for security
 */

export interface OneTimeTokenData {
  tokenHash: string
  expiresAt: Date
  consumedAt?: Date
}

/**
 * Generate a secure one-time token
 */
export function generateOneTimeToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a token for secure storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Verify a token against its hash
 */
export function verifyToken(token: string, hash: string): boolean {
  return hashToken(token) === hash
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

/**
 * Check if token is consumed
 */
export function isTokenConsumed(consumedAt?: Date): boolean {
  return consumedAt !== null && consumedAt !== undefined
}

/**
 * Generate expiration time (default: 24 hours)
 */
export function generateExpirationTime(hours: number = 24): Date {
  const now = new Date()
  now.setHours(now.getHours() + hours)
  return now
}

/**
 * Create a secure authorization URL
 */
export function createAuthUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/authorize/${token}`
}
