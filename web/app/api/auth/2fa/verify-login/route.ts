import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract tenant subdomain from host header
 */
function extractTenantFromHost(host: string): string {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0].toLowerCase();
  
  // Check for tenant subdomain pattern: {tenant}.app.localhost
  if (hostWithoutPort.endsWith('.app.localhost')) {
    const tenant = hostWithoutPort.replace('.app.localhost', '');
    // Validate tenant format (simple alphanumeric + hyphens)
    if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tenant) && tenant.length <= 63) {
      return tenant;
    }
  }
  
  // Check for production pattern: {tenant}.app.tokenops.com
  if (hostWithoutPort.endsWith('.app.tokenops.com')) {
    const tenant = hostWithoutPort.replace('.app.tokenops.com', '');
    if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tenant) && tenant.length <= 63) {
      return tenant;
    }
  }
  
  // Development fallback: plain localhost defaults to 'default' tenant
  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    return 'default';
  }
  
  // Production fallback: if no subdomain pattern matches, default to 'default'
  return 'default';
}

/**
 * Get the API base URL based on the host
 */
function getTenantApiUrl(host: string): string {
  const tenant = extractTenantFromHost(host);
  
  // Build tenant-specific API URL
  if (host.includes('.app.localhost')) {
    // Development: use tenant subdomain for API
    return `http://${tenant}.api.localhost:4000`;
  } else if (host.includes('.app.tokenops.com')) {
    // Production: use tenant subdomain for API
    return `https://${tenant}.api.tokenops.com`;
  } else {
    // Fallback: use default API URL
    return process.env.API_BASE || 'http://localhost:4000';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Missing verification code' }, { status: 400 });
    }

    // Forward the request to the backend with cookies
    const cookies = request.headers.get('cookie') || '';
    const host = request.headers.get('host') || '';
    const tenant = extractTenantFromHost(host);
    const apiUrl = getTenantApiUrl(host);
    const response = await fetch(`${apiUrl}/auth/2fa/verify-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (response.ok) {
      // Set the auth cookie from the backend response
      const setCookieHeader = response.headers.get('Set-Cookie');
      const responseHeaders = new Headers();
      
      if (setCookieHeader) {
        responseHeaders.set('Set-Cookie', setCookieHeader);
      }
      
      return NextResponse.json(data, { 
        status: 200,
        headers: responseHeaders
      });
    } else {
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
