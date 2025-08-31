# ADR-002 — Regulation-Agnostic Compliance Layer **with Organization → Product → Asset**

**Date:** 2025-08-31 (Europe/Berlin)  
**Status:** Accepted (supersedes ADR-002 v1, 2025-08-31)  
**Relates to:** ADR-001 — v1 API & Architecture for Multi-Ledger Token Issuance Platform

---

## 1) Context

We need an MVP that is MiCA-aware today **and** extensible to other jurisdictions, while supporting multi-ledger issuance. Native controls differ per ledger (e.g., XRPL trustline authorization vs EVM allowlists), and regulatory requirements differ per region (MiCA, EU Travel Rule now; others later).

To anchor accountability, evidence, and policy defaults in a business-friendly way, we standardize the domain hierarchy as **Organization → Product → Asset**:

- **Organization** = tenant (legal entity: issuer/CASP/VASP).  
- **Product** = branded issuance line under an Organization (e.g., “EURX”), the home for class defaults and governing documents.  
- **Asset** = chain-specific instance of a Product (e.g., “EURX on XRPL”).

This keeps compliance artifacts and policies stable at the Product level while letting each Asset apply per-ledger controls.

---

## 2) Decision

Adopt a **Regulation-Agnostic Compliance Layer** (Regulation Catalog + Policy Kernel) and formalize the **Organization → Product → Asset** hierarchy.

- The **Policy Kernel** evaluates **facts** and produces per-**Asset** RequirementInstances and an **Enforcement Plan**.  
- **Product** holds class defaults (ART/EMT/Other), policy presets, and governing documents (e.g., ART/EMT issuer authorization, Title II white paper).  
- **Asset** inherits Product defaults and applies ledger-specific configuration (issuing address, adapter flags).

### 2.1 Core Concepts

- **Regime** — Named regulation set (e.g., *EU: MiCA*, *EU: Travel Rule*), versioned with effective dates.  
- **RequirementTemplate** — Smallest checkable item (e.g., *Issuer authorization (ART/EMT)*, *Crypto-asset white paper (Art. 6)*, *Trustline authorization required*, *Travel-Rule payload*). Includes:  
  - `applicability_expr` (facts → boolean),  
  - `data_points` (fields to collect),  
  - `enforcement_hints` (adapter guidance),  
  - `version` and effective dates.  
- **RequirementInstance** — Template instantiated **per Asset** with `status`: **N/A | Required | Satisfied | Exception**, evidence refs, verifier, rationale.  
- **Policy Kernel** — Evaluates **facts** to produce:  
  - Applicable **RequirementInstances** (per Asset),  
  - An **Enforcement Plan** (e.g., XRPL `RequireAuth`, EVM allowlist),  
  - Human-readable **rationales** for explainability.

### 2.2 Facts (inputs to the Kernel)

- From **Organization**: `issuer_country` (and defaults).  
- From **Product**: `asset_class` (ART | EMT | Other), governing documents (authorization / white paper), default `target_markets`.  
- From **Asset**: `ledger`, `issuing_address`, `distribution_type` (offer/admission/private), `investor_audience` (retail/professional/institutional), `is_casp_involved`, `transfer_type` (CASP↔CASP / CASP↔self-hosted), overrides of target markets if any.

### 2.3 Evaluation & Gating

- On **Create/Update Asset**, the Kernel evaluates facts → builds applicable **RequirementInstances** and an **Enforcement Plan**.  
- An **Asset** can be **Activated** only when all **Required** items are **Satisfied** (with 4-eyes verification where configured).  
- Decisions are **explainable** (short rationale strings). Product-level documents satisfy Asset-level requirements unless overridden.

### 2.4 Enforcement Mapping (adapters)

- **XRPL**: Set/verify `RequireAuth`; holders open trustlines; platform **authorizes** trustlines automatically when requirements (e.g., KYC pass) are satisfied; support de-authorize/freeze on policy change.  
- **EVM**: Enforce at the edge with **allowlists** for mint/transfer and a **pause** control; no complex transfer hooks in MVP.  
- Later: **Stellar** (AUTH_REQUIRED/AUTH_REVOCABLE), **Algorand** (clawback/freeze), **Solana** (mint/freeze authorities).

### 2.5 UI/UX

- **Create Product**: choose class (ART/EMT/Other), set policy presets, attach governing documents (authorization, white paper), set default target markets.  
- **Create Asset (under Product)**: choose ledger and **Approved** issuing address; provide scope fields; Kernel renders only relevant requirements and fields; show **Enforcement Summary** (“XRPL: RequireAuth + trustline authorization; EVM: allowlist gating”).

### 2.6 Versioning & Drift

- **Regimes** and **RequirementTemplates** are versioned with `effective_from/to`.  
- When versions change, the Kernel **re-evaluates Assets** and opens new RequirementInstances as needed.  
- Show a **Policy Drift** banner with delta and tasks to regain compliance. Product-level document versions are tracked and propagated to child Assets.

### 2.7 Data Boundaries & Privacy

- **Operational DB**: Organizations, Products, Assets, Issuer Addresses, RequirementInstances, Events (no raw PII).  
- **Identity Vault**: PII/KYC proofs (separate store, KMS), linked via surrogate keys.  
- Exports use **redaction profiles** (Regulatory vs Business Ops).

### 2.8 Compatibility with ADR-001 (API)

- Public API remains **asset-centric** and stable. Introducing **Product** is **additive**: client flows (create asset) reference `product_id`.  
- No breaking changes to issuance endpoints; compliance rejections return clear `422` with rationale if Required items are unmet.  
- Optional read-only endpoints for requirement status may be added later.

---

## 3) Alternatives Considered

1. **Tag-only grouping instead of Product**  
   - *Rejected*: weak place to attach class defaults and governing documents; poor aggregation and audit semantics.  
2. **Hard-coding MiCA checks in service code**  
   - *Rejected*: tight coupling; costly for rule changes and multi-region expansion.  
3. **Heavy rules DSL now**  
   - *Rejected*: overkill for MVP; we start with simple expressions and grow as needed.  
4. **On-chain compliance controls everywhere**  
   - *Rejected*: inconsistent feasibility across ledgers; adds friction; worse operator UX.  
5. **Region-specific schemas**  
   - *Rejected*: schema churn; harms portability and speed.

---

## 4) Consequences

### 4.1 Positive
- **Clear hierarchy**: Organization → Product → Asset aligns compliance docs and policies to the right level.  
- **Regulation-agnostic**: add or revise regimes without schema/API churn.  
- **Operator-friendly**: only relevant fields appear; clear blockers with rationale.  
- **Consistent enforcement** across ledgers via adapters.  
- **Audit-ready**: per-requirement evidence and 4-eyes verification, with events.

### 4.2 Trade-offs
- Slightly more model surface (Product).  
- Requires disciplined, testable applicability expressions and document versioning at Product.

### 4.3 Risks & Mitigations
- **Rule drift vs code** — Version regimes and schedule re-evaluation; surface drift banners and tasks.  
- **Over-collection** — Purpose-bound fields tied to requirements; default redaction.  
- **Adapter divergence** — Maintain a capability matrix per ledger; integration tests per enforcement hint.

---

## 5) Implementation Notes (links to plan)

- Add **Product** as a first-class entity; Assets belong to Products; Issuer Addresses remain Organization-scoped.  
- Seed regimes and ~10 RequirementTemplates (MiCA + EU Travel Rule).  
- Build **Policy Kernel v0**; evaluate facts and produce Asset RequirementInstances + Enforcement Plan.  
- Add **Create Product** step (class defaults, documents, presets) and **Create Asset under Product** with dynamic checklist.  
- Wire **XRPL** (RequireAuth + trustline authorization) and **EVM** (allowlist + pause) to consume enforcement hints.  
- Emit events for changes; support 4-eyes verification.  
- See Implementation Plan tasks: **A-003 (Product), A-004 (Asset), B-001, B-002, B-003, B-004, C-001, C-002**.

---

## 6) Rollout / Migration

- No breaking API changes; add Product references in UI and internal APIs.  
- For any pre-existing Assets (if any), create a **Default Product** per Organization and reparent Assets.  
- Run the Kernel in **advisory mode** for existing drafts to surface gaps; enable **activation gating** after backfill/verification.  
- Document operator playbooks mapping enforcement hints to ledger actions.

---

## 7) Open Questions

- Do we need **Series** (terms/vintages) in near term, or keep as future option?  
- Which non-EU regimes to prioritize next (UK, SG, CH)?  
- When to expose read-only compliance states via public API?

---

## 8) Decision Outcome

Adopt the **Regulation-Agnostic Compliance Layer** and the **Organization → Product → Asset** hierarchy as the standard model for selecting requirements, collecting data, and driving ledger-specific enforcement. This preserves ADR-001’s API stability and enables rapid multi-jurisdiction, multi-ledger expansion.
