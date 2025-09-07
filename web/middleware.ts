import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Get the API base URL based on the current tenant subdomain
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

/**
 * Extract tenant subdomain from host header
 * Examples:
 * - "default.app.localhost:3000" → "default"
 * - "am1.app.localhost:3000" → "am1"
 * - "localhost:3000" → "default" (fallback)
 * - "127.0.0.1:3000" → "default" (fallback)
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''
  
  // Extract tenant from subdomain
  const tenant = extractTenantFromHost(host)
  
  // Create response
  const response = NextResponse.next()
  
  // Set tenant header for server components
  response.headers.set('x-tenant-subdomain', tenant)
  
  // Allow public access to authorization routes
  if (pathname.startsWith('/auth/authorize/')) {
    return response
  }

  // Protect all /app routes - but allow access when API has AUTH_MODE=off
  if (pathname.startsWith('/app')) {
    // Check if API server has authentication enabled by testing the /auth/me endpoint
    try {
      const apiUrl = getTenantApiUrl(host)
      const authTestResponse = await fetch(`${apiUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Host': host
        }
      })
      
      // If the API returns 200 without auth, it means AUTH_MODE=off
      if (authTestResponse.status === 200) {
        // API has AUTH_MODE=off - allow access without authentication
        return response
      }
      
      // API has authentication enabled - check for auth cookie
      const authCookie = request.cookies.get('auth')
      
      if (!authCookie) {
        // Redirect to login if no auth cookie
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
      }

      // Validate user organization access by calling our validation endpoint
      const validationUrl = new URL('/api/validate-user', request.url)
      const validationResponse = await fetch(validationUrl, {
        headers: {
          'Cookie': request.headers.get('cookie') || '',
          'Host': host
        }
      })
      
      if (validationResponse.ok) {
        const validation = await validationResponse.json()
        if (!validation.valid) {
          if (validation.reason === 'wrong_organization') {
            // User doesn't belong to this organization - redirect to login with error message
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('error', 'organization_mismatch')
            return NextResponse.redirect(loginUrl)
          } else {
            // Other auth issues - redirect to login
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('error', 'auth_failed')
            return NextResponse.redirect(loginUrl)
          }
        }
      } else {
        // Validation failed - redirect to login
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
      }
    } catch (error) {
      console.error('Auth mode detection error in middleware:', error)
      // If we can't determine auth mode, allow access for development
      return response
    }
  }

  // Allow access to login page and public routes
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|brand|media).*)',
  ],
}
