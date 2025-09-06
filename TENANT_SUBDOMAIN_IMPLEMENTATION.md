# Tenant Subdomain Implementation Plan

## Overview
Implementing tenant-based subdomains for multi-tenancy architecture as per architect's recommendations. This will provide clean URL structure, security isolation, and enterprise-ready features.

## Architecture Summary
- **Web Console**: `https://{tenant}.app.tokenops.com`
- **API**: `https://{tenant}.api.tokenops.com`
- **Platform Admin**: `https://platform.app.tokenops.com`, `https://platform.api.tokenops.com`
- **Public Holder Flows**: `https://{issuer-vanity-domain}/authorize/{oneTimeToken}`

## Current State
- ✅ Database reset and clean
- ✅ Organizations created: "Default Organization" and "Asset Manager 1"
- ✅ Products created for both organizations
- ✅ API server running on port 4000
- ❌ **Pending**: Tenant subdomain implementation

---

## Phase 1: Database Schema & Core Infrastructure

### Task 1.1: Enhanced Organization Model
- [ ] Add `subdomain` field to Organization model in Prisma schema
- [ ] Add `tenantId` field (separate UUID for FK relationships)
- [ ] Add unique constraints and indexes
- [ ] Create migration for new fields
- [ ] Update existing organizations with simple subdomains:
  - "Default Organization" → `default`
  - "Asset Manager 1" → `am1`

**Schema Changes:**
```prisma
model Organization {
  id              String             @id @default(cuid())
  tenantId        String             @unique @default(cuid()) // Separate UUID for FK
  subdomain       String             @unique // Lookup alias, not FK
  name            String             @unique @db.VarChar(100)
  // ... existing fields
  
  @@index([subdomain])
  @@index([tenantId])
}
```

### Task 1.2: Tenant Lookup Service
- [ ] Create `src/lib/tenantService.ts`
- [ ] Implement subdomain → organization mapping
- [ ] Add caching layer (30-60s TTL)
- [ ] Handle tenant status validation (ACTIVE/SUSPENDED)
- [ ] Add cache busting on organization updates

**Validation Rules:**
```typescript
const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/;
const RESERVED = new Set(['api','app','platform','www','status','static','cdn']);
```

---

## Phase 2: API Server Tenant Middleware

### Task 2.1: Tenant Extraction Middleware
- [ ] Create tenant extraction from Host header
- [ ] Handle `X-Forwarded-Host` for proxy support
- [ ] Validate subdomain format and reserved words
- [ ] Set `app.set('trust proxy', true)`
- [ ] Prevent host header poisoning

### Task 2.2: Tenant Validation Middleware
- [ ] Lookup tenant by subdomain
- [ ] Validate tenant status:
  - SUSPENDED → return 403
  - Unknown/mismatch → return 404
- [ ] Add uniform error responses (no information leakage)
- [ ] Add `x-tenant-id` and `x-request-id` headers

### Task 2.3: Enhanced Authentication
- [ ] Update JWT validation to check `tenant_id` claim
- [ ] Require JWT `tenant_id` to match subdomain tenant
- [ ] Return 404 on tenant mismatch (non-enumerating)
- [ ] Log both 403/404 with same generic message

---

## Phase 3: Route Updates

### Task 3.1: Remove Organization IDs from URLs
- [ ] Update products routes: `/v1/products` (tenant-scoped)
- [ ] Update assets routes: `/v1/assets` (tenant-scoped)
- [ ] Update issuances routes: `/v1/issuances` (tenant-scoped)
- [ ] Update authorizations routes: `/v1/authorizations` (tenant-scoped)

### Task 3.2: Nested Collection Routes
- [ ] `GET /v1/products/{productId}/assets`
- [ ] `POST /v1/products/{productId}/assets`
- [ ] `GET /v1/assets/{assetId}/issuances`
- [ ] `POST /v1/assets/{assetId}/issuances`

### Task 3.3: Flat Item Routes
- [ ] `GET/PATCH /v1/assets/{assetId}`
- [ ] `GET/PATCH /v1/issuances/{issuanceId}`
- [ ] Add ownership validation (item belongs to tenant)

---

## Phase 4: Web Application Updates

### Task 4.1: Next.js Tenant Middleware
- [ ] Create `middleware.ts` for tenant extraction
- [ ] Handle `.app.localhost:3000` subdomains in dev
- [ ] Set `x-tenant-subdomain` header
- [ ] Update server components to use tenant context

### Task 4.2: Frontend API Client Updates
- [ ] Update API base URL to use tenant subdomain
- [ ] Remove organization ID from API calls
- [ ] Update authentication context to include tenant
- [ ] Handle tenant-specific routing

### Task 4.3: CORS Configuration
- [ ] Whitelist exact origin pairs:
  - Dev: `^http://([a-z0-9-]+)\.app\.localhost:3000$` → `*.api.localhost:4000`
  - Prod: `https://{tenant}.app.tokenops.com` → `https://{tenant}.api.tokenops.com`
- [ ] Set `Access-Control-Allow-Credentials: true`

---

## Phase 5: Development Environment

### Task 5.1: Local Development Setup
- [ ] Configure local subdomains:
  - `http://default.app.localhost:3000` → Default Organization
  - `http://am1.app.localhost:3000` → Asset Manager 1
  - `http://default.api.localhost:4000` → Default Organization API
  - `http://am1.api.localhost:4000` → Asset Manager 1 API

### Task 5.2: DNS Configuration
- [ ] Add entries to `/etc/hosts` for local development
- [ ] Test subdomain routing
- [ ] Verify CORS between subdomains

---

## Phase 6: Security & Production Readiness

### Task 6.1: Security Hardening
- [ ] Wildcard TLS certificate (`*.api.tokenops.com`)
- [ ] HSTS headers
- [ ] Rate limiting by tenant + route
- [ ] Webhook HMAC signing with tenant_id header
- [ ] Idempotency keys for POST requests

### Task 6.2: Observability
- [ ] Add tenant context to all logs
- [ ] Include `x-tenant-id` in response headers
- [ ] Trace spans tagged with tenant
- [ ] Monitor tenant-specific metrics

### Task 6.3: Error Handling
- [ ] Uniform error responses
- [ ] No information leakage in error messages
- [ ] Proper HTTP status codes (403 vs 404)
- [ ] Generic logging messages

---

## Phase 7: Migration Strategy

### Task 7.1: Backward Compatibility
- [ ] Keep existing routes temporarily
- [ ] Add `Link` headers pointing to new subdomain routes
- [ ] Gradual migration of clients
- [ ] Deprecation timeline

### Task 7.2: Data Migration
- [ ] Update existing data with tenant context
- [ ] Verify data isolation
- [ ] Test tenant switching
- [ ] Validate foreign key relationships

---

## Testing Checklist

### API Testing
- [ ] `http://default.api.localhost:4000/v1/products` returns Default Organization products
- [ ] `http://am1.api.localhost:4000/v1/products` returns Asset Manager 1 products
- [ ] JWT with `tenant_id=am1` sent to `default.api.localhost:4000` → 404
- [ ] Suspended tenant → 403 everywhere
- [ ] Unknown subdomain → 404

### Web Testing
- [ ] `http://default.app.localhost:3000` loads Default Organization data
- [ ] `http://am1.app.localhost:3000` loads Asset Manager 1 data
- [ ] CORS works between matching subdomains
- [ ] Tenant switching changes data scope without code changes

### Security Testing
- [ ] Host header poisoning prevention
- [ ] JWT tenant validation
- [ ] Rate limiting per tenant
- [ ] Error message uniformity

---

## Success Criteria

### MVP Completion
- [ ] Tenant subdomains working for web and API
- [ ] Clean URLs without organization IDs
- [ ] Proper tenant isolation
- [ ] Security validations in place
- [ ] Local development environment working

### Production Ready
- [ ] Wildcard SSL certificates
- [ ] Monitoring and observability
- [ ] Error handling and logging
- [ ] Performance optimization
- [ ] Documentation complete

---

## Notes

### Key Design Decisions
1. **Simple Subdomains**: Use opaque, simple names (`default`, `am1`) instead of descriptive ones
2. **Separate tenantId**: Use UUID for foreign keys, subdomain for lookup only
3. **Security First**: Return 404 for unknown tenants, 403 for suspended
4. **Clean URLs**: Remove organization IDs from all paths
5. **Caching**: Short TTL with explicit cache busting

### Reserved Subdomains
- `api`, `app`, `platform`, `www`, `status`, `static`, `cdn`

### Error Handling Philosophy
- Never reveal tenant existence through error messages
- Use generic logging to avoid information leakage
- Consistent error responses across all endpoints

---

## Current Status
- **Last Updated**: 2025-09-06
- **Phase**: Planning Complete, Ready for Implementation
- **Next Step**: Begin Phase 1 - Database Schema Updates
- **Blockers**: None
- **Dependencies**: None

---

## Implementation Order
1. Database schema changes (Phase 1)
2. API middleware (Phase 2)
3. Route updates (Phase 3)
4. Web application updates (Phase 4)
5. Development environment (Phase 5)
6. Security hardening (Phase 6)
7. Migration strategy (Phase 7)
