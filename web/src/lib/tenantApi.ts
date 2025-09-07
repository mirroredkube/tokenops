import createClient from 'openapi-fetch'
import type { paths } from '@/types/openapi'

/**
 * Get the API base URL based on the current tenant subdomain
 * This function should be called from client-side components
 */
export function getTenantApiUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  }
  
  // Client-side: extract tenant from current host
  const host = window.location.host
  const tenant = extractTenantFromHost(host)
  
  console.log('DEBUG: getTenantApiUrl - host:', host, 'tenant:', tenant)
  
  // Build tenant-specific API URL
  if (host.includes('.app.localhost')) {
    // Development: use tenant subdomain for API
    const apiUrl = `http://${tenant}.api.localhost:4000`
    console.log('DEBUG: getTenantApiUrl - returning:', apiUrl)
    return apiUrl
  } else if (host.includes('.app.tokenops.com')) {
    // Production: use tenant subdomain for API
    return `https://${tenant}.api.tokenops.com`
  } else {
    // Fallback: use default API URL
    const fallbackUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    console.log('DEBUG: getTenantApiUrl - fallback:', fallbackUrl)
    return fallbackUrl
  }
}

/**
 * Extract tenant subdomain from host (client-side version)
 */
function extractTenantFromHost(host: string): string {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0].toLowerCase()
  
  console.log('DEBUG: extractTenantFromHost - host:', host, 'hostWithoutPort:', hostWithoutPort)
  
  // Check for tenant subdomain pattern: {tenant}.app.localhost
  if (hostWithoutPort.endsWith('.app.localhost')) {
    const tenant = hostWithoutPort.replace('.app.localhost', '')
    console.log('DEBUG: extractTenantFromHost - extracted tenant:', tenant)
    // Validate tenant format (simple alphanumeric + hyphens)
    if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tenant) && tenant.length <= 63) {
      console.log('DEBUG: extractTenantFromHost - returning tenant:', tenant)
      return tenant
    }
  }
  
  // Check for production pattern: {tenant}.app.tokenops.com
  if (hostWithoutPort.endsWith('.app.tokenops.com')) {
    const tenant = hostWithoutPort.replace('.app.tokenops.com', '')
    if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tenant) && tenant.length <= 63) {
      return tenant
    }
  }
  
  // Development fallback: plain localhost defaults to 'default' tenant
  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    console.log('DEBUG: extractTenantFromHost - fallback to default (localhost)')
    return 'default'
  }
  
  // Production fallback: if no subdomain pattern matches, default to 'default'
  console.log('DEBUG: extractTenantFromHost - fallback to default (no match)')
  return 'default'
}

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

// Create tenant-aware API client
export const tenantApi = createClient<paths>({ 
  baseUrl: getTenantApiUrl(),
  fetch: fetchWithCredentials
})

// Export the base URL getter for use in other components
export { getTenantApiUrl as getApiUrl }
