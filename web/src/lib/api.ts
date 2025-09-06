import createClient from 'openapi-fetch'
import type { paths } from '@/types/openapi'
import { getTenantApiUrl } from './tenantApi'

// Create a fetch wrapper that always includes credentials and uses tenant-specific URL
const fetchWithCredentials = (input: Request | string, init?: RequestInit) => {
  // If input is a string and it's a relative URL, make it absolute with tenant API URL
  let url = input
  if (typeof input === 'string' && input.startsWith('/')) {
    url = `${getTenantApiUrl()}${input}`
  }
  
  return fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  })
}

export const api = createClient<paths>({ 
  baseUrl: getTenantApiUrl(),
  fetch: fetchWithCredentials
})

export function ensureJson<T>(text: string): T | undefined {
  if (!text.trim()) return undefined
  try { return JSON.parse(text) as T } catch { throw new Error('Invalid JSON') }
}

export interface UserSettings {
  timezone: string
  language: string
  theme: string
  notifications: Record<string, any>
  preferences: Record<string, any>
}

// Get user settings
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const response = await fetch(`${getTenantApiUrl()}/v1/users/me/settings`, {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch settings')
    }
    
    const data = await response.json()
    return data.settings
  } catch (error) {
    console.error('Error fetching settings:', error)
    throw error
  }
}

// Update user settings
export async function updateUserSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
  try {
    const response = await fetch(`${getTenantApiUrl()}/v1/users/me/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      throw new Error('Failed to update settings')
    }
    
    const data = await response.json()
    return data.settings
  } catch (error) {
    console.error('Error updating settings:', error)
    throw error
  }
}

// Update user profile
export async function updateUserProfile(updates: { name?: string; email?: string }): Promise<any> {
  try {
    const response = await fetch(`${getTenantApiUrl()}/v1/users/me/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      throw new Error('Failed to update profile')
    }
    
    const data = await response.json()
    return data.user
  } catch (error) {
    console.error('Error updating profile:', error)
    throw error
  }
}