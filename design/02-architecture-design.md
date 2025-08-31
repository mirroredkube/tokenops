# Architecture Design Document — Organization → Product → Asset

## Scope
Deliver a MiCA-aware issuance platform for **XRPL + one EVM chain** in MVP. Build a light **regulation-agnostic layer** (Regulation Catalog + Policy Kernel) so future jurisdictions and ledgers slot in without schema/API churn.

## Why Product
- **Clarity:** Group multiple chain deployments of the same branded token under one container.
- **Finance/compliance:** Aggregate supply, reserves, authorizations, and documents at the Product level.
- **Future-proof:** If terms materially change, introduce an optional **Series** under Product later (not in MVP).

## Core Concepts & Relationships
- **Organization** — Legal entity (issuer/CASP/VASP). Owns users/roles, issuer addresses, products, policies, and evidence.
- **Product** — Branded issuance line (e.g., “EURX”). Holds class defaults (ART/EMT/Other), policy presets, governing documents, and default target markets.
- **Asset** — One token **on one ledger** (e.g., “EURX on XRPL”). Inherits from Product; overrides chain-specific settings (issuing address, adapter flags). Fields: ledger, symbol, issuing_address (approved), status (draft/active/paused/retired).
- **Issuer Address** — Organization-owned ledger account with states: Pending → Approved → Suspended → Revoked; allowed-use tags (ART/EMT/Title II).
- **Identity Map** — `public address ↔ handle` (pseudonym) with link to KYC/KYB result reference (PII kept in a separate vault).
- **Events** — Append-only audit trail: who/what/when with org_id/product_id/asset_id and rationale.

**Diagram (textual):**
- Organization (1) → Product (N) → Asset (N)  
- Organization (1) → Issuer Address (N); Asset (N) uses Issuer Address (1, Approved, same Org)  
- Organization (1) → Users (N) with Roles (RBAC)  
- Asset (1) → RequirementInstance (N) (from Regulation Catalog)

## Regulation-Agnostic Layer
- **Regime** — A regulation set (MiCA, EU Travel Rule) with versions/effective dates.
- **RequirementTemplate** — Smallest checkable unit with applicability (facts-based), required fields, and enforcement hints.
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
3. **Create Asset** — Under a Product, choose ledger + Approved issuing address; Policy Kernel instantiates requirements; attach chain-specific evidence; activate when satisfied.
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
