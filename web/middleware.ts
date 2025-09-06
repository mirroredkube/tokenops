import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''
  
  // Extract tenant from subdomain
  const tenant = extractTenantFromHost(host)
  
  // Create response
  const response = NextResponse.next()
  
  // Set tenant header for server components
  response.headers.set('x-tenant-subdomain', tenant)
  
  // Protect all /app routes
  if (pathname.startsWith('/app')) {
    // Check if user has auth cookie
    const authCookie = request.cookies.get('auth')
    
    if (!authCookie) {
      // Redirect to login if no auth cookie
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Validate user organization access by calling our validation endpoint
    try {
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
      console.error('User validation error in middleware:', error)
      // If validation fails, redirect to login for safety
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Allow access to login page and public routes
  return response
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
