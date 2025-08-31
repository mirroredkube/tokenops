# Implementation Plan for CTO — Organization → Product → Asset (Tasks & Sequencing)

> **No code in this document.** Each task has an ID, goal, scope, dependencies, acceptance criteria (AC), and deliverables (DL).

## EPIC A — Core Domain & RBAC

### A-001. Model: Organization & Users
- **Goal:** Establish tenant boundary and user roles.
- **Scope:** Entities (Organization, User, Membership, Role), org-scoped auth.
- **Dependencies:** none
- **AC:**
  - Users see only their Organization’s data.
  - Platform roles can switch across Organizations.
- **DL:** Schema, seeded roles, Organization switcher UI.

### A-002. Model: Issuer Address Registry
- **Goal:** Approve addresses with 4-eyes.
- **Scope:** Address states; allowed-use tags (ART/EMT/Title II); proof-of-control challenge.
- **Dependencies:** A-001
- **AC:**
  - Only **Approved** addresses appear when creating an Asset.
  - Full audit on approvals (who/when/rationale).
- **DL:** Address management UI, state transitions, events.

### A-003. Model: Product
- **Goal:** Group multiple chain deployments and compliance artifacts.
- **Scope:** Fields: name, class default (ART/EMT/Other), policy preset defaults, documents (authorization / white paper refs), status.
- **Dependencies:** A-001
- **AC:**
  - Product created with class defaults & policy preset.
  - Documents attached at Product level are visible to all child Assets.
- **DL:** Create/Edit Product UI, validations.

### A-004. Model: Asset (under Product)
- **Goal:** Define a token on a single ledger.
- **Scope:** Fields: product_id, ledger, symbol, issuing_address_id (Approved, same Organization), status (draft/active/paused/retired). Inherit policy/documents from Product; allow chain-specific overrides if needed.
- **Dependencies:** A-002, A-003
- **AC:**
  - Asset can be Draft/Active/Paused/Retired.
  - Selecting Product auto-loads class & policy presets.
- **DL:** Create/Edit Asset UI; validations (address must be Approved).

### A-005. RBAC & 4-Eyes
- **Goal:** Protect critical actions.
- **Scope:** Server checks for issuer address approval, compliance verification, and de-authorize/freeze (no self-approval).
- **Dependencies:** A-001/A-002/A-003/A-004
- **AC:** Self-approval attempts are blocked with explicit error.
- **DL:** Policy middleware + tests.

### A-006. Events & Audit Trail
- **Goal:** Immutable event log.
- **Scope:** Event entity; emit on product creation, address approvals, asset activation, trustline/allowlist decisions.
- **Dependencies:** A-001..A-005
- **AC:** Per-asset and per-product event streams exportable (CSV).
- **DL:** Event writer, viewer, and export.

---

## EPIC B — Regulation-Aware MVP (MiCA/TFR) with Kernel

### B-001. Regime & Requirement Templates (seed)
- **Goal:** Catalog v0 for MiCA + EU Travel Rule.
- **Scope:** Entities: Regime, RequirementTemplate; seed ~10 templates (issuer authorization (ART/EMT), white paper (Art. 6), marketing comms, right of withdrawal (Art. 13), KYC tier by class, Travel-Rule flag, XRPL trustline auth hint, EVM allowlist hint).
- **Dependencies:** A-004
- **AC:** Templates visible in admin and versionable.
- **DL:** Seed data + admin viewer.

### B-002. Policy Kernel v0
- **Goal:** Evaluate applicability from facts.
- **Scope:** Inputs: issuer_country (Organization), target_markets (Product/Asset), asset_class (from Product), distribution_type, investor_audience, is_casp_involved, transfer_type, ledger (Asset).
- **Dependencies:** B-001
- **AC:** Kernel returns RequirementInstances (per Asset) + an enforcement plan (flags) with rationale.
- **DL:** Kernel service + unit tests (scenario matrix).

### B-003. Adaptive “Region & Scope” UI
- **Goal:** Show only relevant requirements/fields.
- **Scope:** In Create/Edit Asset: region/scope inputs; dynamic checklist with fields/evidence slots; clear blockers.
- **Dependencies:** B-002
- **AC:** Changing class/scope re-evaluates instantly; activation blocked until Required → Satisfied.
- **DL:** UI flow + state persistence.

### B-004. Compliance Verification
- **Goal:** Human 4-eyes verification of requirements.
- **Scope:** Mark RequirementInstance as Verified; attach evidence; Platform co-ack for ART/EMT (toggle).
- **Dependencies:** B-003, A-005
- **AC:** Verified items unlock activation; audit includes verifier and timestamp.
- **DL:** Verification UI + events.

---

## EPIC C — Ledger Adapters (XRPL + EVM)

### C-001. XRPL Adapter v1
- **Goal:** Enforce access via trustlines.
- **Scope:** Ensure issuing account has `RequireAuth`; detect holder trustline; auto-approve when Kernel says ALLOW; support de-authorize/freeze.
- **Dependencies:** A-004, B-002
- **AC:** KYC-passed holder trustline auto-authorized; non-eligible lands in manual queue; all actions logged.
- **DL:** Adapter service, configuration, runbook.

### C-002. EVM Adapter v1
- **Goal:** Gate mint/transfer by allowlist.
- **Scope:** Maintain per-Asset allowlists; block mint/transfer to non-eligible; pause control.
- **Dependencies:** A-004, B-002
- **AC:** Mint to non-eligible is blocked with clear reason and event; pause prevents new mints.
- **DL:** Adapter service, configuration, runbook.

### C-003. Trustline/Allowlist Queue
- **Goal:** Human review for exceptions at scale.
- **Scope:** Queue with filters; approve/reject with reason; bulk actions; sampling for QA.
- **Dependencies:** C-001/C-002
- **AC:** Manual decisions update eligibility and emit events; sampling report available.
- **DL:** Queue UI + analytics.

---

## EPIC D — Identity & Privacy

### D-001. Identity Map (Handles)
- **Goal:** Pseudonymous operational UI.
- **Scope:** Map `address → handle`; link to KYC/KYB result reference only; PII stays in identity vault.
- **Dependencies:** A-004
- **AC:** Ops screens show handle + “Verified” pill; real names only for permitted roles.
- **DL:** Identity Map table + role-based reveal checks.

### D-002. Exports & Redaction Profiles
- **Goal:** Safe reporting.
- **Scope:** Export profiles: Regulatory vs Business Ops; PII redaction by default; purpose tagging.
- **Dependencies:** D-001, A-006
- **AC:** Exports reflect chosen profile; audit logs note purpose.
- **DL:** Export endpoints + templates.

---

## EPIC E — Operations & Reporting

### E-001. Dashboards
- **Goal:** Operational visibility.
- **Scope:** Metrics: time-to-activation, auto-approval rate, exception volume, active holders, supply (basic), with rollups at Product and Asset levels.
- **Dependencies:** A-006, C-001/C-002
- **AC:** Dashboards per Organization/Product/Asset; filters by status/time.
- **DL:** Screens + saved views.

### E-002. Evidence Bundle Export
- **Goal:** Auditor-ready package.
- **Scope:** Export requirements + evidence refs + key events for an Asset (and roll up at Product).
- **Dependencies:** B-004, A-006
- **AC:** Single bundle produced (ZIP/PDF links later) with manifest and Product context.
- **DL:** Export + manifest.

---

## EPIC F — i18n & Copy (DE/EN, MiCA Terms)

### F-001. MiCA-Native Labels
- **Goal:** Consistent terminology.
- **Scope:** Use ART/EMT/Other; Issuer vs Offeror/Person seeking admission; Article references (6/13) in help text.
- **Dependencies:** A-003, B-001
- **AC:** UI/help use harmonized terms; German strings present.
- **DL:** Content review checklist + i18n keys.

---

## EPIC G — Regulation-Agnostic Hooks

### G-001. Regime Versioning & Drift Notices
- **Goal:** Prepare for rule updates.
- **Scope:** `effective_from/to` on Regime; re-evaluate assets on change; delta banner and tasks.
- **Dependencies:** B-001/B-002
- **AC:** Changing regime version creates new RequirementInstances as needed; assets show “policy drift” until resolved.
- **DL:** Version switch + reevaluation job.

---

## Sequencing (Safe Order)
1) A-001 → A-006 (Org, addresses, **Product**, Asset, RBAC, events)  
2) B-001 → B-004 (Regime templates, Kernel, adaptive UI, verification)  
3) C-001/C-002/C-003 (XRPL, EVM, queue)  
4) D-001/D-002 (identity & exports)  
5) E-001/E-002 (dashboards & evidence)  
6) F-001 (copy/i18n)  
7) G-001 (versioning & drift)

## Definitions of Done (DoD)
- **Model/Service:** schema+migrations, unit tests for key paths, events emitted, basic docs.
- **UI:** validations, empty/error states, role checks, i18n keys, accessibility basics.
- **Adapter:** sandbox-tested against ledger, feature flags, documented rollback.
- **Policy/Kernel:** scenario tests (matrix), rationale strings verified, requirements render correctly.
- **Security/Privacy:** role-based gating verified, PII confined to vault, exports pass redaction.

## Weekly Reporting Template (CTO → Architect)
- **Task IDs:** (e.g., C-001, B-002)  
- **Status:** Green / Amber / Red  
- **Shipped:** bullets + screen refs  
- **Decisions:** 1–3 bullets (with rationale)  
- **Metrics:** time-to-activation (median), auto-approval %, exceptions opened/closed  
- **Blockers/Risks:** owner, mitigation  
- **Next Up:** exact Task IDs planned
