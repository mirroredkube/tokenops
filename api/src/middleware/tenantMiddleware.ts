import { FastifyRequest, FastifyReply } from 'fastify';
import { lookupTenantBySubdomain, validateSubdomain } from '../lib/tenantService.js';

export interface TenantRequest extends FastifyRequest {
  tenant?: {
    id: string;
    tenantId: string;
    subdomain: string;
    name: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
    country: string;
    jurisdiction?: string;
  };
}

/**
 * Extracts tenant subdomain from Host header
 * Handles both direct subdomain and X-Forwarded-Host for proxy scenarios
 */
function extractSubdomainFromHost(host: string): string | null {
  if (!host) return null;

  // Remove port if present
  const hostWithoutPort = host.split(':')[0].toLowerCase();

  // Handle localhost development patterns
  if (hostWithoutPort.includes('.localhost')) {
    const parts = hostWithoutPort.split('.');
    if (parts.length >= 2) {
      return parts[0]; // e.g., "default" from "default.api.localhost"
    }
  }

  // Handle production patterns like "tenant.api.tokenops.com"
  if (hostWithoutPort.includes('.api.tokenops.com')) {
    const parts = hostWithoutPort.split('.');
    if (parts.length >= 4) {
      return parts[0]; // e.g., "tenant" from "tenant.api.tokenops.com"
    }
  }

  // Handle direct subdomain patterns like "tenant.localhost"
  if (hostWithoutPort.includes('.localhost') && !hostWithoutPort.includes('api.')) {
    const parts = hostWithoutPort.split('.');
    if (parts.length >= 2) {
      return parts[0];
    }
  }

  return null;
}

/**
 * Tenant middleware that extracts and validates tenant from subdomain
 */
export async function tenantMiddleware(request: TenantRequest, reply: FastifyReply) {
  try {
    // Extract host from request
    const host = request.headers.host || request.headers['x-forwarded-host'] as string;
    
    if (!host) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Host header is required'
      });
    }

    // Extract subdomain from host
    const subdomain = extractSubdomainFromHost(host);
    
    if (!subdomain) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid host format'
      });
    }

    // Lookup tenant by subdomain
    const lookupResult = await lookupTenantBySubdomain(subdomain);
    
    if (!lookupResult.success) {
      // Return 404 for unknown tenants to avoid enumeration attacks
      // Return 403 for suspended tenants (we know they exist but are disabled)
      const status = lookupResult.error === 'TENANT_SUSPENDED' ? 403 : 404;
      
      return reply.status(status).send({
        error: status === 403 ? 'Forbidden' : 'Not Found',
        message: 'Resource not found'
      });
    }

    // Attach tenant info to request
    request.tenant = lookupResult.tenant!;

    // Add tenant headers for observability
    reply.header('x-tenant-id', lookupResult.tenant!.tenantId);
    reply.header('x-tenant-subdomain', lookupResult.tenant!.subdomain);

  } catch (error) {
    console.error('Tenant middleware error:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred processing the request'
    });
  }
}

/**
 * Validates that JWT tenant_id matches the subdomain tenant
 */
export function validateTenantAuth(request: TenantRequest, reply: FastifyReply): boolean {
  const tenant = request.tenant;
  const jwtTenantId = (request as any).user?.tenant_id;

  if (!tenant) {
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Tenant context not found'
    });
    return false;
  }

  if (!jwtTenantId) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return false;
  }

  if (jwtTenantId !== tenant.tenantId) {
    // Return 404 to avoid revealing tenant existence
    reply.status(404).send({
      error: 'Not Found',
      message: 'Resource not found'
    });
    return false;
  }

  return true;
}

/**
 * Middleware for routes that require tenant context
 * This should be used after tenantMiddleware
 */
export function requireTenant(request: TenantRequest, reply: FastifyReply) {
  if (!request.tenant) {
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Tenant context required'
    });
  }
}

/**
 * Middleware for routes that require active tenant
 */
export function requireActiveTenant(request: TenantRequest, reply: FastifyReply) {
  if (!request.tenant) {
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Tenant context required'
    });
  }

  if (request.tenant.status !== 'ACTIVE') {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Tenant is not active'
    });
  }
}
