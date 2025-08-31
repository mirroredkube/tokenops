# North Star & Product USP (SaaS)

## Vision
Deliver a **single, regulation-aware control plane** that lets regulated organizations design, issue, and manage tokenized assets across multiple blockchains. Compliance, policy, and documentation live at the **Product** level; on-ledger controls are applied at the **Asset** level. The standard hierarchy is **Organization → Product → Asset**.

## Positioning (One-liner)
**One policy. Any ledger. Evidence on demand.**  
A regulation-aware issuance control plane that turns complex rules (MiCA today, others tomorrow) into automated, auditable actions on XRPL, EVM, and more.

## Unique Value Propositions
1. **Policy-once, multi-ledger enforcement** — Decide compliance off-chain; enforce natively on each ledger (XRPL trustline authorization, EVM allowlists/pauses).
2. **Regulation-aware & regulation-agnostic** — MiCA + EU Travel Rule for MVP; future regimes plug in via a lightweight **Regulation Catalog** + **Policy Kernel**.
3. **Product-level grouping** — Class defaults (ART/EMT/Other), governing documents (e.g., issuer authorization, white paper), and presets live on the Product; Assets inherit and add chain specifics.
4. **Explainable decisions & evidence** — Every allow/deny/manual decision displays rationale, required evidence, and an append-only audit trail.
5. **Privacy by design** — Operational UI shows pseudonymous handles; PII resides in a separate identity vault; exports use redaction profiles.
6. **Operational automation** — Auto-approve eligible holders (trustlines/allowlists) based on KYC/KYB; queue exceptions for human review with four-eyes.
7. **Enterprise-simple** — Minimal nouns (Organization, Product, Asset, Issuer Address), clear RBAC, idempotent APIs, and evidence bundles.
8. **Extensible** — Add regimes, templates, and ledgers without public-API churn.

## Ideal Customers
- Banks/EMIs/Fintechs (CASP/VASP) issuing **EMTs/ARTs**  
- Corporates issuing **utility/loyalty** tokens  
- Tokenization providers needing multi-ledger controls with auditor-friendly posture

## Why Now
- MiCA and the EU Travel Rule require governed disclosures, authorization for certain issuers, and traceable controls.
- Ledgers expose different compliance primitives; issuers need one consistent control plane.

## North-Star Metrics (V0)
- Time from **Asset Draft → Activation**
- **Auto-approval** rate for holder onboarding
- % Assets **Audit-ready** (all Required items satisfied)
- Manual review **queue time** & **exception rate**

## MVP Outcome
A MiCA-aware issuance MVP supporting XRPL + one EVM chain, with regulation-agnostic seams for fast expansion to new jurisdictions and ledgers.
