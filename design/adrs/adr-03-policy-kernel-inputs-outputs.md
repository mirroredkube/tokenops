# ADR-004 — Policy Kernel Inputs & Outputs and Adapter Mapping

**Status:** Accepted  
**Date:** 2025-09-13 (UTC)  
**Owners:** Architecture / Platform Team  
**Stakeholders:** CTO, Product, Compliance, Ledger Adapter Maintainers

---

## 1. Context

Regula’s USP is the **Policy Kernel**: *policy once → enforce per-ledger → evidence on demand*.  
There was ambiguity around **who provides which inputs** and **what the “policy output” is**, especially as ledger adapters appear on both sides of the diagram (inputs and outputs). We also clarified that **Product is a light container**, while **Asset is the core unit** across ledgers.

This ADR fixes the mental model and the UI/UX contract without requiring new engine logic.

---

## 2. Decision

### 2.1 Roles & Responsibilities

**Platform builders (Regula team):**
- Install & version **Regime plug‑ins** (e.g., MiCA, EU Travel Rule).  
- Install **Ledger adapters** and publish their **capability catalogs** (e.g., XRPL: RequireAuth, Trustline Freeze; EVM: Allowlist, Pause; Hedera: KYC, Pause).  
- Maintain mapping logic from **abstract enforcement intents** → **ledger controls** inside adapters.  
- Keep compatibility matrices and capability availability up to date (e.g., Clawback amendment).

**Platform users (Issuers):**
- Provide **asset facts / regime inputs** at Asset creation: asset class, distribution type, investor audience, target markets, CASP involved, transfer type, etc.  
- Select the **target ledger** (the ledger this Asset actually lives on).  
- Do **not** pick ledger controls directly; they operate via the generated **Enforcement Plan** (apply/ready states).

**Policy Kernel:**
- Consumes **three inputs**: (1) Asset facts, (2) Regime plug‑ins, (3) Adapter capability catalogs.  
- Produces **two kinds of outputs**:
  1) **Universal policy outputs** — the *obligations* (Evaluated Requirements with status & rationale; evidence obligations; regime versions; counters).  
  2) **Enforcement outputs** — ledger‑agnostic *intents* mapped by adapters to **ledger‑specific controls**, forming the **Adapter Enforcement Plan** for the **target ledger** and **Preview** for non-target ledgers.

### 2.2 Execution Semantics

- **Target ledger only** is actionable (controls can be **Applied** or **Ready**).  
- **Non‑target ledgers** show **Preview** (mapping exists but is not executed).  
- **Authorizations** are **ledger state at Asset–Holder scope** (e.g., XRPL trustline authorization, Hedera token KYC, EVM allowlist). Issuances store a **snapshot** of that state in `complianceRef` but do not own the authorization.

### 2.3 UI Surfaces (contract)

- **Inputs row**  
  - *Regime Plugins (inputs)* with name/version/effective dates.  
  - *Ledger Adapters (capability catalogs, inputs)* grouped by: Compliance, Freeze/Emergency, Security, Rippling, Operational, Recovery. Chips show **Scope** (Account/Trustline), **Actor** (Issuer/Holder), and caveats (**Advisory**, **Irreversible**, **Amendment required**).

- **Policy Kernel core**  
  - *Evaluation Pipeline counters:* **Evaluated → Applicable → Required → Satisfied → Exceptions**.  
  - *Evaluated Requirements table:* **Name | Status (N/A/Required/Satisfied/Exception) | Why | Regime | Article | Last Verified** (UI maps legacy `AVAILABLE` → **N/A**).

- **Policy Outputs (ledger‑specific)**  
  - *Adapter Enforcement Plan:* per adapter card. The **target ledger** is expanded and uses states **Applied / Ready / Unavailable**; **non‑target** cards are collapsed **Preview**.  
  - *Evidence Bundle Export* lives on the **target ledger** card and includes regimes + adapter version + counters + requirement states + control states + key events + manifest hash/version.

---

## 3. Rationale

- Keeps issuers **ledger‑agnostic**: they provide regulatory facts; the system chooses controls.  
- Makes adapters **dual‑role** explicit: publish **capabilities in**; accept **intents out**.  
- Aligns with ledger reality: authorization is **Asset–Holder** state (not issuance-scoped).  
- Preserves “policy once” story across XRPL/EVM/Hedera while being audit‑ready.

---

## 4. Alternatives Considered

1. **Issuers pick ledger controls directly**  
   - *Rejected:* couples business users to ledger semantics; breaks “policy once”.

2. **Authorization modeled as Issuance‑scoped**  
   - *Rejected:* contradicts XRPL/Hedera/EVM patterns (authorization/allowlist/KYC is per holder per asset). Duplicates facts.

3. **Product as compliance source**  
   - *Rejected:* enforcement & applicability are per‑Asset (per ledger). Product remains a light container for grouping/brand/reporting.

---

## 5. Consequences

### Positive
- Clear responsibility boundaries; simpler issuer UX.  
- Scales to new ledgers: add a capability catalog + mapping only.  
- Strong explainability: requirements + mapped controls with “why” lines.  
- Auditability via Evidence Bundle.

### Negative / Trade‑offs
- Requires ongoing maintenance of **capability catalogs** and **mapping** per adapter.  
- Some obligations may be **Unavailable** on certain ledgers; UX must show off‑chain obligations remain.

---

## 6. Definitions

**Capability catalog (adapter input):** list of native controls an adapter can operate (scope, actor, caveats).  
**Enforcement intent:** abstract action emitted by the kernel (e.g., *gate holder eligibility*, *emergency stop*).  
**Adapter Enforcement Plan:** mapping of intents → controls per adapter, with state (**Applied/Ready/Preview/Unavailable**).  
**Policy outputs (universal):** Evaluated Requirements + evidence obligations + counters.

---

## 7. Data Model Impact (PoC / MVP)

- **No new core tables required.** Use existing: `Regime`, `RequirementTemplate`, `RequirementInstance`.  
- UI maps legacy status `AVAILABLE` to **N/A**.  
- **Issuance** continues to store a **snapshot** in `complianceRef` (evaluatedAt, regimes, requirement states, manifest hash/version, optional authorization snapshot).

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Info overload in console | Progressive disclosure; collapse non‑target adapters; concise “why” lines |
| Performance of summary aggregation | Cache kernel summary; skeleton loaders; reuse single summary endpoint |
| Adapter capability drift vs docs | Version badges; nightly capability check; show “Unavailable (Amendment required)” where applicable (e.g., Clawback) |
| Misinterpreting advisory items (e.g., Disallow XRP) | Mark **Advisory**; exclude from compliance counters |

---

## 9. Acceptance Criteria

- Changing issuer facts (e.g., **Audience Retail → Professional**) updates **requirements** and **enforcement plan** deterministically.  
- Switching the **target ledger** keeps **requirements** intact but swaps the **mapped controls** (XRPL RequireAuth → EVM Allowlist, Freeze → Pause).  
- Target adapter card shows **Applied/Ready/Unavailable** states with clear “why”; non‑target adapters show **Preview**.  
- Evidence Bundle contains regimes, adapter version, counters, requirements, control states, and manifest hash/version.

---

## 10. Sequence Diagram (text)

```
Issuer (facts) ─────────────┐
                            │
Regime plug-ins (versions) ─┼──► Policy Kernel ──► Universal Outputs (requirements/evidence)
                            │
Adapter capability catalogs ┘                 └──► Enforcement Intents
                                             
Enforcement Intents ─► Adapter Mapping (per ledger) ─► Adapter Enforcement Plan
                                           │
                                           ├── Target ledger: Apply/Ready (execute/ready)
                                           └── Other ledgers: Preview (no execution)
```

---

## 11. UI Glossary (chips)

- **Applied** — control is active on the target ledger.  
- **Ready** — supported and available to apply on the target ledger.  
- **Preview** — mapping exists for non‑target ledgers; not active here.  
- **Unavailable** — adapter/ledger cannot enforce this; obligation remains off‑chain.  
- **Account / Trustline** (scope), **Issuer / Holder** (actor), **Advisory**, **Irreversible**, **Amendment required**.

---

## 12. Open Questions

- Do we expose an “Advanced mode” for power users to manually toggle certain controls (still guided by policy)?  
- How do we surface regime version drift (“pack updated — re‑evaluate recommended”)?  
- What is the minimum adapter telemetry we store to evidence that a control was applied (txid, timestamp)?

---

## 13. References

- Internal: “Regula USP Visibility Initiative” design doc; “Policy Kernel Console” spec; “Adapter capability catalog” notes.
- Public: XRPL account & trust line flags (for internal adapter authors, not exposed in UI).

