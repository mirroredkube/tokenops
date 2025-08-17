import createClient from 'openapi-fetch'
import type { paths } from '@/types/openapi'

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
export const api = createClient<paths>({ baseUrl })

export function ensureJson<T>(text: string): T | undefined {
  if (!text.trim()) return undefined
  try { return JSON.parse(text) as T } catch { throw new Error('Invalid JSON') }
}