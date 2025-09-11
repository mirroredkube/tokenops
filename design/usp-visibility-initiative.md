# This document succeeds "03_implementation_plan.md" and the major features were implemented. Rest are included in the document here:

# Regula USP Visibility Initiative  
**Subtitle:** Make the Policy Kernel the visible “magic brain” — *Policy once → Enforce per-ledger → Evidence on demand*

**Owner:** Architecture  
**Audience:** CTO, Eng, Product, Design  
**Scope:** Read-only surfaces that expose the Policy Kernel and its outputs (no new write paths / RBAC)  
**Non-Goals:** Production hardening, new regime logic, on-chain automation

---

## Executive Summary
We already have Org → Product → Asset, XRPL issuance, Compliance with RequirementInstances, regime versioning, and exports. The gap is **presentation**: the Policy Kernel (our USP) is invisible. This initiative adds **read-only views** that make the engine obvious, explainable, and auditor-ready—optimized for a 90-second investor demo.

---

## Narrative Flow (for demos)
1. **Dashboard** → “Control plane for multi-ledger issuance.”  
2. **Compliance → Policy Kernel Console** → facts, regimes, counters, explainable requirements.  
3. **Asset → Enforcement tab** → policy-to-ledger mapping (XRPL active; other adapters installed/disabled).  
4. **Issuance/Authorization** → one allowed + one blocked with rationale.  
5. **Evidence Bundle** → export manifest that closes the loop.

---

## Status Language (UX Standard)
- `REQUIRED`, `SATISFIED`, `EXCEPTION`, `AVAILABLE` → **map `AVAILABLE` to `N/A`** across UI.  
- Provide legend + tooltips (plain English + legal reference).

---

## EPIC A — Policy Kernel Console (“the brain”)

### A1 — Kernel Summary Header
**User Story**  
As a compliance lead, I want to see the **facts** and **regime versions** driving evaluation.

**Acceptance Criteria (G/W/T)**  
- **Given** an Asset is selected  
  **When** I open Kernel Console  
  **Then** I see a compact header with: `issuerCountry, assetClass, targetMarkets, ledger, distributionType, investorAudience, isCaspInvolved, transferType`.  
- **And** regime badges: `MiCA vX.Y`, `EU TFR vX.Y` with `effectiveFrom/To`.  
- **And** a counter strip: **Evaluated → Applicable → Required → Satisfied → Exceptions**.

**Notes/Risks** Info overload → collapsed details; progressive disclosure.

---

### A2 — Requirements Table (Explainable)
**User Story**  
As a reviewer, I need each requirement with status and **why** it applies.

**Acceptance Criteria (G/W/T)**  
- Columns: **Name | Status (N/A/Required/Satisfied/Exception) | Why | Regime | Article | Last Verified**.  
- Filter by status/regime; search by name.  
- **Why** shows a one-liner (e.g., *Public + Retail → Whitepaper & Withdrawal rights (MiCA Art. 6, 13)*).

**Notes/Risks** Terminology → tooltips + glossary.

---

### A3 — Exceptions Visibility
**User Story**  
As a governance owner, I must see **who/why/when** for exceptions.

**Acceptance Criteria (G/W/T)**  
- Exceptions show: reviewer, timestamp, reason, link to originating event.  
- Read-only; clearly labeled **Recorded exception (reviewed)**.

---

### A4 — Kernel Outputs Panel
**User Story**  
As an operator, I want to see **enforcement flags** emitted to adapters.

**Acceptance Criteria (G/W/T)**  
- XRPL: `RequireAuth`, `Trustline Authorization`, `Freeze capability` (+ state if known).  
- EVM/Hedera: capabilities listed as **Installed (disabled for this asset)**.  
- Each flag shows a **Why** mapping back to a requirement.

---

**Epic A DoD**  
- Console loads < **1.5s** (P95).  
- Counters accurate; statuses mapped; tooltips present.  
- Analytics: `kernel_console_viewed` with assetId, regime versions, counters.

---

## EPIC B — Enforcement Plan (per-Asset tab)

### B1 — New “Enforcement” Tab
**User Story**  
As an operator, I want a ledger-specific plan derived from policy.

**Acceptance Criteria (G/W/T)**  
- **Given** an Asset  
  **When** I open **Enforcement**  
  **Then** I see **Adapter Capability Cards** per ledger:  
  - **XRPL (Active)**: RequireAuth, Trustline Authorization, Freeze (state + short explanation).  
  - **EVM/Hedera (Installed/Disabled)**: supported controls + “Not enabled for this asset.”  
- Each capability links to the driving requirement in Kernel Console.

---

### B2 — Issuance Wizard “Policy Snapshot” (read-only)
**User Story**  
As an issuer, I want to confirm key policy signals before issuing.

**Acceptance Criteria**  
- Snapshot panel shows counters + top 3 requirements driving enforcement.  
- Link: “View full Kernel Console.” (No new inputs.)

---

**Epic B DoD**  
- XRPL asset shows live plan; EVM/Hedera appear installed/disabled.  
- Snapshot adds < **150ms** overhead.

---

## EPIC C — Evidence Bundle v1 (rebrand + manifest)

### C1 — Rebrand Export to “Evidence Bundle”
**User Story**  
As an auditor/regulator, I need an **auditable manifest**.

**Acceptance Criteria**  
- Buttons labeled **Export Evidence Bundle** (Asset + Reports).  
- Bundle includes:  
  - **Inputs (facts)**  
  - **Regime versions in force**  
  - **Requirements** (status + rationale + verification notes)  
  - **Lifecycle events** (Created, Evaluated, Activated, Authorized/Blocked)  
- JSON as primary; CSV remains as secondary.  
- README section describing fields.

---

### C2 — Integrity Hint (Optional)
**Acceptance Criteria**  
- Root includes SHA-256 of the manifest file.

---

**Epic C DoD**  
- Download < **500ms** typical; values match Kernel Console.

---

## EPIC D — Installed Modules Catalog (signals breadth)

### D1 — Regime & Adapter Catalog (read-only)
**User Story**  
As a buyer, I want to see versioned, first-class modules.

**Acceptance Criteria**  
- Dashboard strip or Settings page:  
  - **Regime packs:** name, version, effective dates, jurisdiction.  
  - **Ledger adapters:** name, version, status (Active / Installed / Disabled).  
- Items deep-link to Kernel Console with filters applied.

**Notes** Config-driven single JSON/catalog for low maintenance.

---

## EPIC E — UX/Terminology & Progressive Disclosure

### E1 — Status Language & Legend  
- Map `AVAILABLE` → **N/A** UI-wide; update legend and colors.

### E2 — Rationale Library (single source of truth)  
- Centralize one-liners used in Kernel, Enforcement, Evidence.

### E3 — Tooltips + Glossary Drawer  
- Hover tooltips (plain English + legal cite).  
- Drawer with ≥10 key terms.

### E4 — Basic/Advanced Toggle  
- Basic: condensed counters + top requirements.  
- Advanced: full table + all fields (remember per user).

**Epic E DoD**  
- Copy library exists; toggles persist; glossary populated.

---

## EPIC F — Performance & Reliability (PoC-grade)

### F1 — Summary Aggregation + Cache  
- Single summary endpoint powering A1/B2.  
- Cache hot results 60s; invalidate on asset change.

### F2 — Skeleton Loading & Timeouts  
- Skeletons on Kernel/Enforcement; friendly timeout + retry.

### F3 — Telemetry  
- Events: `kernel_console_viewed`, `evidence_exported`, `enforcement_tab_viewed` (assetId, regime versions, counters).

**Epic F DoD**  
- P95 page load < **1.5s**; zero blank screens in smoke tests.

---

## EPIC G — Demo Data & QA Scenarios

### G1 — Seed Dataset  
- Product **EURX** → Assets: **XRPL (active)**, **EVM (stub)**.  
- Compliance mix: ≥1 **Required**, ≥1 **Satisfied**, ≥1 **Exception**, several **N/A**.  
- Two holders: one pass, one fail → produces allowed + blocked events.

### G2 — Scripted Paths  
- “Happy path” and “contrast path” scripts aligned to the 90-second narrative.

**Epic G DoD**  
- Fresh env seeded in < **1 min**; scripts run end-to-end without tweaks.

---

## Delivery Plan (2 Sprints)

**Sprint 1 (USP first):**  
- A1, A2, B1, C1, E1, G1

**Sprint 2 (Polish & Risk):**  
- A3, A4, B2, C2, D1, E2–E4, F1–F3, G2

---

## Risk Register & Mitigations
| Risk | Impact | Likelihood | Mitigation |
|---|---:|---:|---|
| Information overload | High | Medium | E4 Basic/Advanced; collapsible sections; curated rationale lines |
| Terminology confusion | Medium | Medium | E1 status mapping; E3 tooltips/glossary; consistent copy lib |
| Performance regressions | High | Medium | F1 cached summary endpoint; F2 skeletons/timeouts |
| Maintenance overhead | Medium | Low | D1 config catalogs; E2 centralized copy; read-only scope |

---

## Program-Level Definition of Done
- **USP is observable**: counters, regime badges, explainable requirements, per-ledger mapping, and evidence bundle are demoable in **< 90 seconds**.  
- **Read-only** additions only—no new write paths or RBAC.  
- **Telemetry** shows usage during demo rehearsals.

---

## Glossary (mini)
- **Policy Kernel** — Evaluation engine that turns facts into requirements and enforcement flags.  
- **Regime Pack** — Versioned policy set (e.g., MiCA, EU Travel Rule).  
- **Ledger Adapter** — Mapping from enforcement flags to ledger primitives (XRPL RequireAuth, EVM allowlist, etc.).  
- **RequirementInstance** — Concrete requirement evaluated for a specific asset with status (N/A/Required/Satisfied/Exception).  
- **Evidence Bundle** — Exported manifest linking inputs → rules → decisions → events.

---

*End of document.*
