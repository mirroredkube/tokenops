# XRPL Adapter — Capability Catalog & Enforcement Plan (Design Note)
**Status:** Draft (aligns with ADR-004)  
**Owner:** Architecture  
**Audience:** CTO, Adapter Maintainers, Product/Design  
**Scope:** XRPL-specific capabilities (inputs) and Enforcement Plan (outputs) for the Policy Kernel Console

---

## 1) Purpose
Make XRPL controls **clear, accurate, and “complex but obvious”** in the Policy Kernel Console by:
- Showing what the XRPL adapter **supports** (capability catalog — *inputs* to the kernel).  
- Showing what the Policy Kernel **asks to enforce** (mapped controls — *outputs*), with consistent states.  
- Encoding **scope** (Account vs Trustline), **actor** (Issuer vs Holder), and any **caveats** (Advisory, Irreversible, Amendment required).

This document implements the mental model in **ADR-004**: Issuer provides **facts**; adapters publish **capabilities**; the kernel emits **requirements & intents** which are mapped to **ledger-specific controls**.

---

## 2) Capability Catalog (XRPL) — *Adapter Inputs*
Groupings & labels for the “Ledger Adapters (inputs)” strip. Each chip includes micro-badges for **Scope** and **Actor**.

### Compliance
- **RequireAuth** *(Account · Issuer)* — Account requires trustline authorization before holder can receive/hold IOUs.  
- **Authorized Trustline** *(Trustline · Issuer)* — Per-holder authorization toggle (used with RequireAuth).  
- **Require Destination Tag** *(Account · Issuer)* — Inbound payments must include a destination tag.

### Freeze / Emergency
- **Global Freeze** *(Account · Issuer)* — Freeze all trustlines for this issuer’s IOUs (holders typically can redeem to issuer only).  
- **Trustline Freeze** *(Trustline · Issuer/Holder)* — Freeze a specific trustline leg.  
- **No Freeze** *(Account · Issuer · Irreversible)* — Permanently waive ability to freeze (cannot be undone).

### Security
- **Disable Master** *(Account · Issuer)* — Disable master key; operate via RegularKey / multisig.

### Rippling
- **DefaultRipple** *(Account · Issuer)* — Default rippling policy for **new** trustlines (line may override).  
- **NoRipple** *(Trustline · Issuer/Holder)* — Disable rippling on this trustline leg.

### Operational
- **TransferRate** *(Account · Issuer)* — Gateway-style fee on routed (rippling) payments.  
- **TickSize** *(Account · Issuer)* — Order-book price precision for offers on this IOU.  
- **Trustline Limit** *(Trustline · Holder)* — Holder-set credit cap; issuer cannot force the holder’s limit.

### Recovery
- **Clawback** *(Trustline op · Issuer · Amendment required / opt-in)* — Issuer may recover IOUs if amendment is enabled and account/line opted in.

### De-emphasize / Move out of “controls”
- **Disallow XRP** — *Advisory* (non-enforced hint some wallets respect).  
- **Disallow Trust Line** — No native block; rely on RequireAuth + monitoring.  
- **Account Freeze** — Use **Global Freeze** instead (account-level emergency).  
- **Credentials (XLS-40 etc.)** — Off-ledger attestations/integrations, not L1 controls.

> **Legend:**  
> **Scope:** ▢ Account ▢ Trustline · **Actor:** ▢ Issuer ▢ Holder · ⚠ *Advisory* · ⛓ *Irreversible* · 🧩 *Amendment required*

---

## 3) Enforcement Plan (XRPL) — *Policy Outputs*
Card for the **target ledger** in “Adapter Enforcement Plan”. Use consistent state chips:

- **Applied** — control is active and effective on the target ledger.  
- **Ready** — supported and available to apply (supported by adapter, currently off).  
- **Unavailable** — not supported on this ledger/adapter (or amendment not enabled).  
- **Preview** — mapping exists for non-target ledgers; not active here (card collapsed by default).

### Example — XRPL (Active)
| Control | State | Why (from policy) | Notes |
|---|---|---|---|
| RequireAuth | **Applied / Ready** | *Retail + Public* → gate eligibility before receipt | Account-level |
| Authorized Trustline | **Per-holder** (N authorized · M pending) | *Gate eligibility* | Trustline-level; link to Holders |
| Global Freeze | **Ready** | *Emergency posture* | Account-level |
| Trustline Freeze | **Ready** | *Surgical emergency control* | Trustline-level |
| No Freeze | **Applied** (if set) | *Issuer pledge* | ⛓ Irreversible; hide other freeze toggles |
| Require Destination Tag | **Applied / Ready** | *Reconciliation / custody operations* | Account-level |
| TransferRate | **Applied / Ready** | *Operational fee policy* | Account-level |
| TickSize | **Applied / Ready** | *Pricing precision* | Account-level |
| DefaultRipple | **Applied / Ready** | *Default treasury policy* | Account-level; use NoRipple counts |
| NoRipple (per line) | **Per-line** (X lines) | *Treasury isolation* | Trustline-level; show counts |
| Clawback | **Ready / Unavailable (Amendment required)** | *Recovery obligation* | 🧩 Requires amendment & opt-in |

**Cross-linking:**  
- Clicking a control highlights the **requirement(s)** that drive it (scroll to the row in “Evaluated Requirements”).  
- Clicking a requirement scrolls to the **mapped control(s)** in this card.

**Evidence CTA:**  
- Button on the XRPL card: **Export Evidence Bundle** → includes regime versions, adapter version, counters, requirements with status/rationale, control states, and key events (with manifest hash/version).

---

## 4) Interactions & Precedence (XRPL semantics)
- **RequireAuth ↔ Authorized Trustline:** RequireAuth enforces **authorization before receipt**; authorization is **per holder**.  
- **No Freeze ↔ Freeze:** If **No Freeze** is set, freeze controls are **not available**; show a permanent pledge badge.  
- **Global vs Trustline Freeze:** Global affects all lines; Trustline isolates a specific holder.  
- **DefaultRipple vs NoRipple:** Default applies to new lines; each trustline may set **NoRipple** independently.  
- **Clawback vs Freeze:** Different purposes — Freeze stops movement; **Clawback** recovers funds (if amendment/opt-in allow).  
- **Trustline Limit:** Holder’s cap; issuer cannot force it (show as informational and counts).

---

## 5) UI Layout (Policy Kernel Console)

### A. Inputs row (top)
- **Regime Plugins (inputs):** badges with name · version · effective dates.  
- **Ledger Adapters (capability catalogs, inputs):** XRPL card with grouped chips (Compliance, Freeze/Emergency, Security, Rippling, Operational, Recovery). Chips display **Scope/Actor/Caveats** micro-badges.

### B. Kernel core (middle)
- **Evaluation Pipeline** counters: *Evaluated → Applicable → Required → Satisfied → Exceptions* + provenance line (“Evaluated 09:46 · MiCA v1.0 · XRPL adapter v1”).  
- **Evaluated Requirements** table (search, filter by regime/status):  
  *Name | Status (N/A/Required/Satisfied/Exception) | Why | Regime | Article | Last Verified*.  
  UI maps legacy `AVAILABLE → N/A`.

### C. Policy Outputs (bottom)
- **Adapter Enforcement Plan:** XRPL (Active) expanded with the table above; EVM/Hedera collapsed as **Preview**.  
- **Evidence Bundle** CTA on XRPL card.

---

## 6) Copy Library (drop-in strings)

**Section titles**  
- *Regime Plugins (inputs)* — “Regulatory requirements (inputs)”  
- *Ledger Adapters (inputs)* — “Available capabilities (inputs)”  
- *Policy Outputs* — “Adapter Enforcement Plan — Policy Kernel outputs translated to ledger-specific actions”

**State chips:** **Applied** · **Ready** · **Preview** · **Unavailable**

**One-liners**  
- RequireAuth — “Account requires authorization before holder can receive/hold this IOU.”  
- Authorized Trustline — “Per-holder authorization for this IOU (required when RequireAuth is on).”  
- Global Freeze — “Emergency stop for all trustlines of this IOU; holders can typically redeem to issuer only.”  
- Trustline Freeze — “Freeze a specific holder’s line; movement limited to redemption.”  
- No Freeze — “Issuer permanently waives ability to freeze (irreversible).”  
- Require Destination Tag — “Inbound payments must include a destination tag.”  
- Disable Master — “Disable master key; use RegularKey / multisig.”  
- DefaultRipple — “Default rippling behavior for new trustlines.”  
- NoRipple (per line) — “Disable rippling on this trustline leg.”  
- TransferRate — “Gateway fee for routed (rippling) payments.”  
- TickSize — “Order book price precision for offers in this IOU.”  
- Trustline Limit — “Holder-set credit cap on their side of the line.”  
- Clawback — “Issuer may recover IOUs if amendment and opt-in are enabled.”

---

## 7) Acceptance Criteria
- Capability catalog shows **Scope/Actor/Caveats** correctly; de-emphasized items removed from controls list.  
- Enforcement Plan uses **Applied/Ready/Preview/Unavailable** consistently and cross-links with requirements.  
- XRPL card shows **RequireAuth** state, **Authorized holders count**, **NoRipple counts**, **Freeze** posture, **Dest Tag**, **TransferRate/TickSize** states, and **Clawback** availability.  
- Evidence Bundle export includes regime & adapter versions, counters, requirement states, and XRPL control states.

---

## 8) Notes for Builders
- Keep the adapter’s capability catalog versioned; surface amendment-dependent features (e.g., Clawback) as **Unavailable (Amendment required)** until detected.  
- Authorization is **Asset–Holder** ledger state; issuances store a **snapshot** in `complianceRef` but do not own authorization.  
- For counts (authorized holders, NoRipple lines), fetch via adapter or cache in a thin table if needed for performance.

