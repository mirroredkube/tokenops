import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Reserved subdomains that cannot be used by tenants
const RESERVED_SUBDOMAINS = new Set([
  'api', 'app', 'platform', 'www', 'status', 'static', 'cdn', 'admin', 'support'
]);

// Subdomain validation regex (DNS label format, 1-63 chars)
const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export interface TenantInfo {
  id: string;
  tenantId: string;
  subdomain: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  country: string;
  jurisdiction?: string;
}

export interface TenantLookupResult {
  success: boolean;
  tenant?: TenantInfo;
  error?: 'INVALID_SUBDOMAIN' | 'RESERVED_SUBDOMAIN' | 'TENANT_NOT_FOUND' | 'TENANT_SUSPENDED' | 'DATABASE_ERROR';
}

// Simple in-memory cache with TTL
const tenantCache = new Map<string, { tenant: TenantInfo; expires: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Validates subdomain format and checks if it's reserved
 */
export function validateSubdomain(subdomain: string): { valid: boolean; error?: 'INVALID_FORMAT' | 'RESERVED' } {
  if (!subdomain || typeof subdomain !== 'string') {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  const normalized = subdomain.toLowerCase().trim();
  
  if (!SUBDOMAIN_REGEX.test(normalized)) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  if (RESERVED_SUBDOMAINS.has(normalized)) {
    return { valid: false, error: 'RESERVED' };
  }

  return { valid: true };
}

/**
 * Looks up tenant by subdomain with caching
 */
export async function lookupTenantBySubdomain(subdomain: string): Promise<TenantLookupResult> {
  try {
    // Validate subdomain format
    const validation = validateSubdomain(subdomain);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error === 'RESERVED' ? 'RESERVED_SUBDOMAIN' : 'INVALID_SUBDOMAIN'
      };
    }

    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // Check cache first
    const cached = tenantCache.get(normalizedSubdomain);
    if (cached && cached.expires > Date.now()) {
      return { success: true, tenant: cached.tenant };
    }

    // Query database
    const organization = await prisma.organization.findUnique({
      where: { subdomain: normalizedSubdomain },
      select: {
        id: true,
        tenantId: true,
        subdomain: true,
        name: true,
        status: true,
        country: true,
        jurisdiction: true
      }
    });

    if (!organization) {
      return { success: false, error: 'TENANT_NOT_FOUND' };
    }

    if (organization.status === 'SUSPENDED') {
      return { success: false, error: 'TENANT_SUSPENDED' };
    }

    const tenant: TenantInfo = {
      id: organization.id,
      tenantId: organization.tenantId,
      subdomain: organization.subdomain,
      name: organization.name,
      status: organization.status as 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
      country: organization.country,
      jurisdiction: organization.jurisdiction || undefined
    };

    // Cache the result
    tenantCache.set(normalizedSubdomain, {
      tenant,
      expires: Date.now() + CACHE_TTL
    });

    return { success: true, tenant };

  } catch (error) {
    console.error('Error looking up tenant by subdomain:', error);
    return { success: false, error: 'DATABASE_ERROR' };
  }
}

/**
 * Looks up tenant by tenantId (for JWT validation)
 */
export async function lookupTenantById(tenantId: string): Promise<TenantLookupResult> {
  try {
    if (!tenantId || typeof tenantId !== 'string') {
      return { success: false, error: 'TENANT_NOT_FOUND' };
    }

    const organization = await prisma.organization.findUnique({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        subdomain: true,
        name: true,
        status: true,
        country: true,
        jurisdiction: true
      }
    });

    if (!organization) {
      return { success: false, error: 'TENANT_NOT_FOUND' };
    }

    if (organization.status === 'SUSPENDED') {
      return { success: false, error: 'TENANT_SUSPENDED' };
    }

    const tenant: TenantInfo = {
      id: organization.id,
      tenantId: organization.tenantId,
      subdomain: organization.subdomain,
      name: organization.name,
      status: organization.status as 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
      country: organization.country,
      jurisdiction: organization.jurisdiction || undefined
    };

    return { success: true, tenant };

  } catch (error) {
    console.error('Error looking up tenant by ID:', error);
    return { success: false, error: 'DATABASE_ERROR' };
  }
}

/**
 * Clears tenant cache (useful for testing or when tenant data changes)
 */
export function clearTenantCache(subdomain?: string): void {
  if (subdomain) {
    tenantCache.delete(subdomain.toLowerCase().trim());
  } else {
    tenantCache.clear();
  }
}

/**
 * Gets cache statistics for monitoring
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: tenantCache.size,
    entries: Array.from(tenantCache.keys())
  };
}
