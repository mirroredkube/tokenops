# ADR-001 — v1 API & Architecture for Multi-Ledger Token Issuance Platform

**Date:** 2025-08-28 (Europe/Berlin)  
**Status:** Accepted

---

## 1) Context

We're shipping an MVP that is **enterprise-ready** but **scope-light**. Goals:

- Ledger-agnostic issuance with a clean REST API.
- Off-ledger **compliance records** (USP), with optional on-chain anchoring.
- Solid operational semantics (idempotency, async submits, stable identities).
- Plug new ledgers without changing public APIs.

---

## 2) Decision

### 2.1 API Style & Identity

- Public API is **resource-oriented REST**, versioned at `/v1`, paths in **kebab-case**.
- Assets are the central resource; every operation is **asset-scoped**.
- Persist both an internal `assetId` (UUID) **and** a portable `assetRef` (CAIP-ish), e.g.  
  `xrpl:testnet/iou:rISSUER.COMP`.

### 2.2 Core Resources & Endpoints

**Assets**
```http
POST   /v1/assets
GET    /v1/assets/{assetId}
PUT    /v1/assets/{assetId}             ; lifecycle: draft→active→paused→retired
DELETE /v1/assets/{assetId}             ; retire (soft delete)
GET    /v1/assets?ledger=&status=&limit=&cursor=
```

**Opt-Ins (Per Asset)**
```http
GET    /v1/assets/{assetId}/opt-ins/{holder}     ; check status
PUT    /v1/assets/{assetId}/opt-ins/{holder}     ; create/update (202 Accepted)
DELETE /v1/assets/{assetId}/opt-ins/{holder}     ; remove
```

**Issuances (Per Asset)**
```http
POST   /v1/assets/{assetId}/issuances            ; issue tokens (202 Accepted + Idempotency)
GET    /v1/assets/{assetId}/issuances/{issuanceId} ; get status
GET    /v1/assets/{assetId}/issuances            ; list with pagination
```

**Compliance Records (Off-Ledger)**
```http
POST   /v1/compliance-records                   ; create record (Idempotency)
GET    /v1/compliance-records/{recordId}        ; get record (redacted)
PATCH  /v1/compliance-records/{recordId}/verify ; verify/reject (Auditor/Regulator)
```

### 2.3 Operational Semantics

**Idempotency**
- Support `Idempotency-Key` header on write operations
- Store key → response for 24h window
- Replay returns original result (no duplicates)

**Async Operations**
- Use 202 Accepted for blockchain operations (opt-ins, issuances)
- GET endpoints provide final state
- Can do sync under the hood, but contract is async

**Asset Lifecycle**
- `draft` → `active` → `paused` → `retired`
- Only `draft` assets can be updated
- `DELETE` sets status to `retired` (soft delete)

**Compliance Integration**
- Compliance records tied to asset + holder pairs
- SHA256 hashing for blockchain anchoring
- Verification workflow for auditors/regulators
- Supports `GATED_BEFORE` compliance mode enforcement

### 2.4 Error Handling

**Status Codes**
- 200 OK (reads)
- 201 Created (synchronous create)
- 202 Accepted (async blockchain operations)
- 400 Bad Request (validation errors)
- 422 Unprocessable Entity (semantic errors - limit too low, compliance required)
- 502 Bad Gateway (ledger connection errors)

**Error Format**
```json
{
  "error": "Human readable message",
  "details": { /* optional context */ }
}
```

### 2.5 Data Models

**Asset**
```typescript
{
  id: string;                    // UUID
  assetRef: string;              // CAIP-19 style
  ledger: "xrpl"|"stellar"|"evm"|"solana"|"algorand"|"hedera";
  network: "mainnet"|"testnet"|"devnet";
  issuer: string;                // r... / 0x... / mint addr
  code: string;                  // "USD" / symbol
  decimals: number;
  complianceMode: "OFF"|"RECORD_ONLY"|"GATED_BEFORE";
  status: "draft"|"active"|"paused"|"retired";
  createdAt: string;
  updatedAt: string;
}
```

**Issuance**
```typescript
{
  issuanceId: string;
  assetId: string;
  assetRef: string;
  to: string;
  amount: string;
  complianceRef?: {
    recordId: string;
    sha256: string;
  };
  txId: string;
  explorer: string;
  status: "submitted"|"validated"|"failed";
  createdAt: string;
}
```

---

## 3) Consequences

### 3.1 Positive

- **Clean API design** - Resource-oriented, consistent patterns
- **Asset-centric** - Everything revolves around core business entity
- **Enterprise ready** - Idempotency, async semantics, compliance workflow
- **Multi-ledger** - CAIP-19 references, ledger adapters
- **Auditor friendly** - Compliance verification, audit trail ready

### 3.2 Trade-offs

- **In-memory storage** - MVP approach, needs database migration later
- **No RBAC yet** - Simple auth, add multi-tenancy later
- **No rate limiting** - Add for production
- **No audit trail** - Add after core workflow is stable

### 3.3 Future Considerations

- **Database migration** - Replace in-memory with PostgreSQL
- **RBAC/Multi-tenancy** - Add orgId, roles, scopes
- **Rate limiting** - 429 responses with Retry-After
- **Audit trail** - Append entries for all state changes
- **Pre-flight checks** - Optional endpoint for validation
- **Webhooks** - Notify on state changes

---

## 4) Implementation Status

**✅ Implemented**
- All core endpoints with asset-centric design
- Idempotency support (24h window)
- Async semantics (202 Accepted)
- Compliance verification workflow
- CAIP-19 asset references
- Error handling standards

**⏸️ Deferred (MVP)**
- RBAC/Multi-tenancy
- Rate limiting
- Audit trail
- Pre-flight endpoint
- Database persistence

**🚀 Ready for Production**
- Core token issuance workflow
- Compliance anchoring
- Enterprise API standards
- Multi-ledger foundation
