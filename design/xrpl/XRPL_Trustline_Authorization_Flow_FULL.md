# XRPL Trustline Authorization Flow — Full Implementation Guide (Markdown)

> **Context:** Institutional issuance platform (issuer console only). Holders are external and never share secrets with the platform. MVP ships XRPL first, but the design is **ledger‑adapter** based to extend later (EVM allowlists, etc.).  
> **Goal:** Implement holder‑initiated **TrustSet** + issuer **authorization** (RequireAuth + `tfSetfAuth`) with reliable detection, audit logging, and simple UX.

---

## 1) XRPL Model Recap (for engineers)

- **Trust line** = bilateral ledger object between **issuer** account and **holder** account for a **currency code**. Each side has a **limit** (holder’s `limit_peer` and issuer’s `limit`) and flags.
- **RequireAuth (issuer account flag)**: when enabled, holders **cannot receive/hold** the issuer’s IOU unless the issuer **authorizes** the trust line.
- **Holder creates trust line** with a `TrustSet` (Account = holder, `LimitAmount = { currency, issuer: ISSUER_ADDR, value: LIMIT }`). Usually also sets **NoRipple** on their side.
- **Issuer authorizes** with a `TrustSet` (Account = issuer, **`Flags = tfSetfAuth`**, `LimitAmount = { currency, issuer: HOLDER_ADDR, value: "0" }`). Using `"0"` is the clean pre‑auth pattern; issuer can optionally set a positive issuer‑side limit if they want an on‑chain cap.
- **Order is flexible**: issuer can pre‑authorize before holder sets the line; or authorize after holder creates it.
- **Authorization flag persists** until the trust line is **removed** (balance 0 + both limits 0). Prevent misuse with **Freeze** if needed (assuming NoFreeze not set).  
- **Reserves**: each trust line consumes **XRP reserve** from both sides; ensure issuer account has headroom before onboarding many holders.

---

## 2) Components (MVP)

- **Issuer Console (web)** — Authorization Setup form (your screenshot): Asset, Holder Address, Authorization Limit, “Send Authorization Request”, policy hints (RequireAuth/NoRipple info).
- **Public Holder Page** — One‑time link where holder connects wallet and submits holder‑side `TrustSet`. Deep link / QR to Xaman/XUMM or other wallets.
- **XRPL Adapter** — Builds/submits transactions, queries `account_lines`, streams TrustSet events, and normalizes fields.
- **Authorization Table (append‑only)** — Off‑chain audit timeline. Minimal columns:
  - `id`, `tenantId`, `assetId`, `ledger`, `currency`, `holderAddress`, `limit` (string), `status`, `initiatedBy` (`HOLDER|ISSUER|SYSTEM`), `txHash?`, `createdAt`.
  - **Statuses:** `HOLDER_REQUESTED`, `ISSUER_AUTHORIZED`, `EXTERNAL`, `LIMIT_UPDATED`, `TRUSTLINE_CLOSED`, `FROZEN`, `UNFROZEN`.

> Use **tenant subdomains** to scope everything; never store holder secrets; issuer actions require 4‑eyes where feasible.

---

## 3) Happy‑Path Flows

### 3.1 Holder‑initiated (external page)

1. **Open link** — Holder opens one‑time, expiring link. Page is pinned to `{assetId, issuerAccount, currency}`.
2. **Confirm address & limit** — Show issuer account, currency symbol/code, reserve note, and the pre‑agreed limit (or input field with a cap).
3. **Create trust line** — Page builds holder `TrustSet` and hands to wallet (deep link/QR). On success, XRPL shows an **unauthorized** line (`authorized=false`, `limit_peer=L`).
4. **Record request** — Insert Authorization row: `{ status: HOLDER_REQUESTED, limit: L, initiatedBy: HOLDER, txHash }`.
5. **Notify issuer** — Console shows pending entry.

### 3.2 Issuer authorization (console)

1. **Review** — Operator checks address, limit, KYC tier. Adjust off‑chain approved limit if needed.
2. **Build issuer TrustSet** — `Account=ISSUER_ADDR`, `Flags=tfSetfAuth`, `LimitAmount={ currency, issuer: HOLDER_ADDR, value: "0" }` (recommended).  
   _Option:_ set issuer `value` to the approved cap if you want an on‑chain limit.
3. **Sign & submit** — HSM/multisig if available. On success, ledger sets `authorized=true`.
4. **Record** — Insert `{ status: ISSUER_AUTHORIZED, limit: L, initiatedBy: ISSUER, txHash }`. Notify holder if applicable.

### 3.3 Issuer pre‑authorization (issuer first)

- Issuer runs step 3.2 **before** the holder acts. XRPL creates an authorized line (issuer side) with issuer limit (often `"0"`); holder still must set their own `limit_peer` later.  
- When the holder later sets the trust line, detection logs `LIMIT_UPDATED` (or `HOLDER_COMPLETED` if you want a distinct label).

---

## 4) Your Four Detection Cases (how to persist)

Map your screen logic to DB events. On each **sync** (poll or stream), evaluate per `(assetId, holderAddr, currency)`:

1. **Trust line exists but no local row** → **EXTERNAL**  
   - _Case 1 from you_: “setup outside platform” → insert `{ status: EXTERNAL, limit: holder_limit, initiatedBy: SYSTEM }`.

2. **Trust line exists & we already have a row and no change** → **NO‑OP**  
   - _Case 2_: “found on ledger + entry exists → proceed with closure (no update)” — keep UI calm; no new entry.

3. **Trust line exists & holder limit changed** → **LIMIT_UPDATED**  
   - _Case 3_: insert `{ status: LIMIT_UPDATED, limit: new_holder_limit, initiatedBy: HOLDER }`.

4. **Trust line didn’t exist, now exists** → **HOLDER_REQUESTED** or **ISSUER_AUTHORIZED (pre‑auth path)**  
   - _Case 4_: If `authorized=false` → insert `HOLDER_REQUESTED`. If `authorized=true` (issuer pre‑auth or external auth) → insert `ISSUER_AUTHORIZED` with `initiatedBy=SYSTEM`.

Additional: if a trust line that **used to exist** is **now missing** → insert `{ status: TRUSTLINE_CLOSED, limit: "0", initiatedBy: HOLDER }`.

---

## 5) Sync & Eventing (pseudocode)

```pseudo
function syncTrustLines(asset):
  lines = xrpl.account_lines(account=asset.issuerAccount, ledger_index="validated")
  seen = Set()

  for line in lines where line.currency == asset.currency:
    holder = line.account
    auth   = line.authorized || line.peer_authorized
    hLim   = line.limit_peer
    iLim   = line.limit
    seen.add(holder)

    last = db.lastEntry(asset.id, holder)
    if !last:
      db.insert(auth ? AUTH_BY_SYSTEM(asset, holder, hLim) : EXT_REQ(asset, holder, hLim))
      continue

    // case 2: unchanged → no-op
    // detect authorization flip
    if auth && last.status != 'ISSUER_AUTHORIZED':
      db.insert(AUTH_BY_SYSTEM(asset, holder, hLim))

    // detect holder limit change
    if last.limit != hLim:
      db.insert(LIMIT_UPDATED_BY_HOLDER(asset, holder, hLim))

    // (optional) detect issuer limit change
    if issuerLimitChanged(last, iLim):
      db.insert(LIMIT_UPDATED_BY_ISSUER(asset, holder, iLim))

  // closures
  prior = db.activeHolders(asset.id)  // latest status ∉ {TRUSTLINE_CLOSED}
  for holder in prior:
    if holder not in seen:
      db.insert(TRUSTLINE_CLOSED(asset, holder))
```

- **Realtime**: subscribe to issuer account tx stream and parse `TrustSet` from holder/issuer to trigger immediate updates; still run periodic full scans to self‑heal.

---

## 6) Authorization Table — status semantics (append‑only)

- **HOLDER_REQUESTED** — trust line exists, `authorized=false`. Usually from external page; can also be detected externally.
- **ISSUER_AUTHORIZED** — issuer `tfSetfAuth` succeeded, line authorized on ledger.
- **EXTERNAL** — trust line detected that wasn’t created via our invite flow (unauthorized). (_If you prefer, you can log these as HOLDER_REQUESTED with `initiatedBy=SYSTEM` for one fewer status._)
- **LIMIT_UPDATED** — new holder (or issuer) limit captured. Track `initiatedBy`.
- **TRUSTLINE_CLOSED** — trust line removed (balance 0 + limit 0). Likely initiated by holder.
- **FROZEN/UNFROZEN** — issuer applied/cleared freeze (optional if freeze is in scope).

> **Current state** per holder = latest entry. Keep the full history for audit and evidence bundles.

---

## 7) API contracts (MVP)

- `POST /authorization-requests` → `{ assetId, holderAddress, requestedLimit }` → `{ id, authUrl }`
- `POST /authorization-requests/{id}/holder-callback` → `{ txHash }` → log `HOLDER_REQUESTED`
- `POST /authorization-requests/{id}/authorize` → (issuer action) submit `tfSetfAuth` → log `ISSUER_AUTHORIZED`
- `GET  /authorization-requests?status=pending`
- `POST /admin/sync-trustlines?assetId=...` (optional manual reconcile)

---

## 8) UX & safety notes

- **Never** collect holder secrets. Holder signs `TrustSet` with their wallet.
- **RequireAuth guard**: don’t allow invites if issuer account lacks RequireAuth.
- **Issuer keys**: HSM/multisig; enforce 4‑eyes for authorize; role‑based access.
- **Public page hardening**: one‑time, expiring token; pin issuer account + currency; show reserve impact & limit.
- **Issuer reserve headroom**: warn if onboarding could exceed reserve capacity.
- **Copy**: display exact issuer account and currency code everywhere to prevent phishing; link to issuer’s domain/xrpl‑toml if available.

---

## 9) Decision points (you can pick now)

- **Issuer Limit on‑chain?**  
  - *Simple*: set issuer value `"0"` when authorizing; enforce off‑chain caps.  
  - *Strict*: set issuer value to approved limit to guard 3rd‑party transfers above cap.
- **External detections labeling**: either keep `EXTERNAL` or normalize to `HOLDER_REQUESTED + initiatedBy=SYSTEM`.
- **Auto‑reauthorize** after closure: policy can auto‑authorize a known KYC’d holder who re‑opens their trust line.

---

## 10) Example payloads (XRPL)

**Holder TrustSet (create/raise limit)**
```json
{
  "TransactionType": "TrustSet",
  "Account": "rHOLDER...",
  "LimitAmount": {
    "currency": "CHIMP",
    "issuer": "rISSUER...",
    "value": "1000000000"
  },
  "Flags": 0
}
```

**Issuer TrustSet (authorize, recommended)**
```json
{
  "TransactionType": "TrustSet",
  "Account": "rISSUER...",
  "LimitAmount": {
    "currency": "CHIMP",
    "issuer": "rHOLDER...",
    "value": "0"
  },
  "Flags": 65536   // tfSetfAuth
}
```

---

## 11) Sequence (ASCII)

```
Holder → Public Page → Wallet: TrustSet (holder→issuer, currency, limit=L)
Ledger ✓: trust line exists (auth=false, limit_peer=L)
Platform → DB: HOLDER_REQUESTED(L) → Notify issuer

Issuer → Console → Authorize
Platform → Ledger: TrustSet (issuer, tfSetfAuth, value=0)
Ledger ✓: authorized=true
Platform → DB: ISSUER_AUTHORIZED(L) → Notify holder
```

---

## 12) Mapping to your UI (screenshot)

- **Asset** — show network + `issuer/IOU` pair (e.g., `xrpl:testnet/…CHIMP`) and current status pill (active).
- **Holder Address** — validates XRPL classic address; optional DNS/toml name resolution later.
- **Authorization Limit** — numeric string with max per policy. Describe reserve impact.
- **Send Authorization Request** — generates holder page link (one‑time token), records an **invite** (optional), and waits for callback or ledger detection.
- **Require Authorization** — display whether issuer account has RequireAuth enabled; block flow if not.  
- **Case handling** — implement the four cases exactly as listed in §4.

---

## 13) Minimal DoD (definition of done)

- Holder can request via public page; platform logs `HOLDER_REQUESTED` on ledger success.
- Issuer can authorize from console; platform logs `ISSUER_AUTHORIZED` on ledger success.
- Sync job detects: external trustlines, limit changes, closures; logs `EXTERNAL`, `LIMIT_UPDATED`, `TRUSTLINE_CLOSED`.
- No holder secrets; HSM/multisig for issuer; RequireAuth enforced; audit trail complete.

---

## 14) Extensibility note

For EVM later: replace trustline/RequireAuth with **allowlist/pause** primitives. The **issuer flows and Authorization table** remain identical (holder request → issuer approve → on‑chain update → append log). Keep XRPL/EVM under a common **adapter interface**.

