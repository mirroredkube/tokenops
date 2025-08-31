# Architecture Design Document (v2) — Organization → Product → Asset

## Scope
Deliver a MiCA-aware issuance platform with **XRPL + one EVM chain** in MVP, using an explicit **Organization → Product → Asset** hierarchy. Keep a light **regulation-agnostic layer** (Regulation Catalog + Policy Kernel) so future jurisdictions slot in without schema churn.

## Why Product (clarity, finance, and future-proofing)
- **Clarity:** Groups multiple chain deployments of the same branded token line under one container.
- **Finance/compliance:** Aggregate supply, reserves, authorizations, and documents at the Product level.
- **Future-proof:** If terms materially change, you can later introduce an optional **Series** beneath Product without migrations that break the MVP.

## Core Concepts & Relationships
- **Organization** — The legal entity (issuer/CASP/VASP). Owns users/roles, policies, issuer addresses, products, and evidence.
- **Product** — A branded issuance line under an Organization (e.g., “EURX”). Holds class defaults (ART/EMT/Other), policy presets, documents (authorization, white paper), and aggregated reporting.
- **Asset** — One token **on one ledger** (e.g., “EURX on XRPL”). Inherits from Product; overrides chain-specific settings (issuing address, adapter flags). Fields: ledger, symbol, issuing_address (approved), status (draft/active/paused/retired).
- **Issuer Address** — Organization-owned ledger account with states: Pending → Approved → Suspended → Revoked; allowed-use tags (ART/EMT/Title II).
- **Identity Map** — `public address ↔ handle` (pseudonym) with link to KYC/KYB result reference (PII kept in a separate vault).
- **Events** — Append-only audit trail: who/what/when with org_id/product_id/asset_id and rationale.
- **(Optional later) Series** — A time/terms-bound slice within a Product. Not required for MVP.

### Entity Diagram (textual)
- Organization (1) ── has many ──> Product (N)
- Product (1) ── has many ──> Asset (N)
- Organization (1) ── has many ──> Issuer Address (N)
- Asset (N) ── uses ──> Issuer Address (1) [must be Approved and belong to same Organization]
- Organization (1) ── has many ──> Users (N) with Roles (RBAC)
- Asset (1) ── has many ──> RequirementInstance (N) (from Regulation Catalog)

## Regulation-Agnostic Layer
- **Regime** — A regulation set (MiCA, EU Travel Rule) with versions/effective dates.
- **RequirementTemplate** — Smallest checkable unit with applicability (facts-based), required fields, enforcement hints.
- **RequirementInstance** — Instantiated per Asset with status (N/A/Required/Satisfied/Exception), evidence refs, verifier, rationale.
- **Policy Kernel** — Evaluates **facts** (issuer region, target markets, asset class at Product, distribution scope, investor audience, is CASP involved, transfer type, ledger) → outputs applicable requirements and an enforcement plan.

## Roles & RBAC (Minimal)
- **Platform:** Admin, Compliance Officer, Auditor (read-only)
- **Organization:** Issuer Admin, Compliance Reviewer, Operator, Viewer
- **4-eyes** on critical actions: issuer address approval, compliance verification, de-authorize/freeze.

## Enforcement Model
- **Off-chain decisions** (Policy Kernel) → **On-chain/edge enforcement** via adapters.
- **XRPL Adapter:** Set `RequireAuth`; holders open trustlines; **issuer approves** after policy passes; freeze/de-authorize supported.
- **EVM Adapter:** Allowlist gating for mint/transfer; pause control; avoid complex transfer hooks in MVP.

## Key Flows
1. **Create Product** — Choose class (ART/EMT/Other), set policy presets (KYC tier, sanctions posture), attach core documents (authorization/white paper).
2. **Approve Issuer Address** — Proof of control → compliance review → Approved; Organization-level.
3. **Create Asset** — Under a Product, choose ledger + Approved issuing address; Policy Kernel instantiates requirements; attach any chain-specific evidence; activate when satisfied.
4. **Onboard Holder** — KYC/KYB pass → address Eligible (Identity Map).
5. **Access Control** — XRPL trustline + issuer authorization; EVM allowlist gate.
6. **Issuance & Lifecycle** — Mint/transfer per policy; events logged; pause/freeze supported.
7. **Reporting** — By Organization/Product/Asset; handles by default; role-based reveal to legal names. Product rollups show cross-ledger supply and status.

## Data Boundaries
- **Operational DB:** organizations, products, assets, events, issuer addresses, requirement instances (no raw PII).
- **Identity Vault:** PII/KYC proofs (separate store, KMS); linked by surrogate key.

## Non-Functional Requirements
- **Privacy:** purpose-based data collection; pseudonymous default views; export redaction profiles.
- **Auditability:** every decision/event carries actor/time/rationale.
- **Extensibility:** add regimes/templates/adapters without schema changes; optionally add Series later.
- **Resilience:** reversible controls (suspend address, de-authorize trustline, pause asset).

## Glossary
- **ART** — Asset-Referenced Token (MiCA)  
- **EMT** — E-Money Token (MiCA)  
- **CASP/VASP** — Crypto-Asset Service Provider / Virtual Asset Service Provider  
- **Travel Rule** — EU Regulation 2023/1113 (fund/crypto transfer information)
