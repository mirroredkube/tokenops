import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
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

    // For authenticated routes, we need to validate organization access
    // This will be handled by the client-side auth context
    // The API will return 404 if the user doesn't belong to the correct organization
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
