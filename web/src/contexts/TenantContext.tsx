'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface TenantContextType {
  tenant: string
  apiUrl: string
  isLoading: boolean
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<string>('default')
  const [apiUrl, setApiUrl] = useState<string>('http://localhost:4000')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Extract tenant from current host
    const host = window.location.host
    const extractedTenant = extractTenantFromHost(host)
    const extractedApiUrl = getTenantApiUrl(host)
    
    setTenant(extractedTenant)
    setApiUrl(extractedApiUrl)
    setIsLoading(false)
  }, [])

  return (
    <TenantContext.Provider value={{ tenant, apiUrl, isLoading }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

/**
 * Extract tenant subdomain from host (client-side version)
 */
function extractTenantFromHost(host: string): string {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0].toLowerCase()
  
  // Check for tenant subdomain pattern: {tenant}.app.localhost
  if (hostWithoutPort.endsWith('.app.localhost')) {
    const tenant = hostWithoutPort.replace('.app.localhost', '')
    // Validate tenant format (simple alphanumeric + hyphens)
    if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tenant) && tenant.length <= 63) {
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
    return 'default'
  }
  
  // Production fallback: if no subdomain pattern matches, default to 'default'
  return 'default'
}

/**
 * Get the API base URL based on the host
 */
function getTenantApiUrl(host: string): string {
  const tenant = extractTenantFromHost(host)
  
  // Build tenant-specific API URL
  if (host.includes('.app.localhost')) {
    // Development: use tenant subdomain for API
    return `http://${tenant}.api.localhost:4000`
  } else if (host.includes('.app.tokenops.com')) {
    // Production: use tenant subdomain for API
    return `https://${tenant}.api.tokenops.com`
  } else {
    // Fallback: use default API URL
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  }
}
