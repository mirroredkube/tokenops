# ADR-001 — v1 API & Architecture for Multi-Ledger Token Issuance Platform

**Date:** 2025-08-28 (Europe/Berlin)  
**Status:** Accepted

---

## 1) Context

We’re shipping an MVP that is **enterprise-ready** but **scope-light**. Goals:

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
