import { NextRequest, NextResponse } from 'next/server'

/**
 * Extract tenant subdomain from host header
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
    return 'http://localhost:4000'
  }
}

export async function GET(request: NextRequest) {
  try {
    const host = request.headers.get('host') || ''
    const authCookie = request.cookies.get('auth')
    
    if (!authCookie) {
      return NextResponse.json({ valid: false, reason: 'no_auth_cookie' })
    }
    
    // Get the tenant from the host
    const tenant = extractTenantFromHost(host)
    const apiUrl = getTenantApiUrl(host)
    
    // Validate user with the API
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        'Cookie': `auth=${authCookie.value}`,
        'Host': host
      }
    })
    
    if (response.status === 404) {
      return NextResponse.json({ valid: false, reason: 'wrong_organization' })
    }
    
    if (!response.ok) {
      return NextResponse.json({ valid: false, reason: 'auth_failed' })
    }
    
    return NextResponse.json({ valid: true })
    
  } catch (error) {
    console.error('User validation error:', error)
    return NextResponse.json({ valid: false, reason: 'server_error' })
  }
}
