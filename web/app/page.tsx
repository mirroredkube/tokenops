// app/page.tsx
import Link from 'next/link'

function TopStrip() {
  return (
    <div className="w-full bg-neutral-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2 text-sm">
        {/* Brand (logo placeholder) */}
        <a href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="inline-block h-4 w-4 rounded-sm bg-emerald-400" />
          <span>TokenOps</span>
        </a>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <a
            href="#get-started"
            className="rounded-md bg-emerald-500 px-3 py-1.5 font-medium text-neutral-900 hover:bg-emerald-400"
          >
            Get started
          </a>
          <a
            href="mailto:hello@example.com?subject=TokenOps%20Demo"
            className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20"
          >
            Contact us
          </a>
        </div>
      </div>
    </div>
  )
}

function Section({
  id,
  title,
  kicker,
  children,
}: {
  id?: string
  title?: string
  kicker?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-6 py-16">
      {kicker && <p className="mb-2 text-sm font-medium tracking-wider text-neutral-500">{kicker}</p>}
      {title && <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">{title}</h2>}
      <div className="mt-6 text-neutral-600">{children}</div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="text-3xl font-semibold text-neutral-900">{value}</div>
      <div className="mt-1 text-sm text-neutral-500">{label}</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-base font-medium text-neutral-900">{title}</h3>
      <div className="mt-3 text-sm leading-6 text-neutral-600">{children}</div>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-white">
      <TopStrip />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[880px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.10),rgba(99,102,241,0.08),transparent_70%)] blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            XRPL first • Ledger-agnostic by design
          </span>

          {/* New headline (no "TokenOps" here) */}
          <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight text-neutral-900">
            Compliance-Grade Tokenization, Delivered as an API
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-7 text-neutral-600">
            MiCA-aware controls, audit trails, and role-based access. XRPL first, ledger-agnostic by design.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/app/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-black px-5 py-3 text-white shadow hover:bg-neutral-900"
            >
              Open Dashboard
            </Link>
            <a
              href={(process.env.NEXT_PUBLIC_API_URL ?? '') + '/docs'}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border px-5 py-3 text-neutral-900 hover:bg-neutral-50"
            >
              API Docs
            </a>
            <a href="#get-started" className="rounded-xl border px-5 py-3 text-neutral-900 hover:bg-neutral-50">
              Get started
            </a>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat value="API-first" label="Built for engineers & auditors" />
            <Stat value="MiCA-aware" label="Compliance-framed metadata" />
            <Stat value="XRPL" label="Low-cost, fast settlement" />
            <Stat value="Pluggable" label="Swap in new ledgers" />
          </div>
        </div>
      </section>

      {/* PRODUCT OVERVIEW */}
      <Section id="product" kicker="Why TokenOps" title="Built for regulated teams—B2B by default">
        <div className="grid gap-6 md:grid-cols-3">
          <Card title="Risk offloading">
            Abstract the chain behind a stable API and dashboard with auditability. Avoid ledger quirks and vendor risk.
          </Card>
          <Card title="Faster pilots">
            Stand up a compliant testnet pilot quickly. Provision an issuer, create trust lines, attach jurisdiction & KYC
            flags.
          </Card>
          <Card title="Compliance-framed">
            Metadata, access controls and exports mapped to MiCA-style reviews and regulator expectations.
          </Card>
        </div>
      </Section>

      {/* FEATURES */}
      <Section kicker="Capabilities" title="Core in the MVP; extensible for enterprise">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Token issuance">
            Issue fungible tokens with structured metadata (ISIN/internal IDs, classification, jurisdiction, KYC flags).
            Explorer links & tx hashes included.
          </Card>
          <Card title="Access control">
            Dashboard roles (admin / issuer / viewer) and API keys. Enable collaboration without losing control.
          </Card>
          <Card title="Audit & reporting">
            Export CSV/JSON of token events and metadata. Ready for internal audits and regulator requests.
          </Card>
          <Card title="Ledger adapters">
            Start on XRPL for speed and cost. Add Hedera or others via the adapter seam—no product rewrites.
          </Card>
          <Card title="Balances & trust lines">
            View holders, trust limits and balances with issuer/currency filters for ops and support.
          </Card>
          <Card title="API + UI together">Swagger to validate quickly, dashboard for non-technical stakeholders.</Card>
        </div>
      </Section>

      {/* MODULE PLACEHOLDERS */}
      <Section id="modules" kicker="Modules" title="Roadmap & placeholders">
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="#" className="block rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md">
            <div className="font-medium text-neutral-900">Tokenization</div>
            <p className="mt-1 text-sm text-neutral-600">Issuance, burn, controls.</p>
          </Link>
          <Link href="#" className="block rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md">
            <div className="font-medium text-neutral-900">Compliance</div>
            <p className="mt-1 text-sm text-neutral-600">KYC/AML flags, attestations.</p>
          </Link>
          <Link href="#" className="block rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md">
            <div className="font-medium text-neutral-900">Reporting</div>
            <p className="mt-1 text-sm text-neutral-600">Exports, dashboards, alerts.</p>
          </Link>
          <Link href="#" className="block rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md">
            <div className="font-medium text-neutral-900">Organizations</div>
            <p className="mt-1 text-sm text-neutral-600">Workspaces, roles, invitations.</p>
          </Link>
          <Link href="#" className="block rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md">
            <div className="font-medium text-neutral-900">API Keys</div>
            <p className="mt-1 text-sm text-neutral-600">Key management, rotation, scopes.</p>
          </Link>
          <Link href="#" className="block rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md">
            <div className="font-medium text-neutral-900">Environments</div>
            <p className="mt-1 text-sm text-neutral-600">Testnet/Mainnet, adapters.</p>
          </Link>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section kicker="How it works" title="From idea to pilot in four steps">
        <ol className="grid gap-4 md:grid-cols-4">
          <li className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Step 1</div>
            <div className="mt-1 font-medium text-neutral-900">Connect issuer</div>
            <p className="mt-2 text-sm">Configure your issuer account and workspace. No mainnet funds required for pilots.</p>
          </li>
          <li className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Step 2</div>
            <div className="mt-1 font-medium text-neutral-900">Create trust lines</div>
            <p className="mt-2 text-sm">Establish holder limits and policies. Add KYC/AML flags as needed.</p>
          </li>
          <li className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Step 3</div>
            <div className="mt-1 font-medium text-neutral-900">Issue tokens</div>
            <p className="mt-2 text-sm">Mint tokens with structured metadata. Instant hashes & explorer links.</p>
          </li>
          <li className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Step 4</div>
            <div className="mt-1 font-medium text-neutral-900">Monitor & export</div>
            <p className="mt-2 text-sm">Track balances and events, export audit-ready CSV/JSON.</p>
          </li>
        </ol>
      </Section>

      {/* ARCHITECTURE */}
      <Section kicker="Architecture" title="A clean separation of concerns">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <pre className="whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-xs leading-6 text-neutral-700">
{`Your SaaS Dashboard / API
          │
          ▼
   Ledger Adapter Layer   ← XRPL now, Hedera next
          │
          ▼
   Token Engine (issue, revoke, report)
          │
          ▼
   Compliance Module (KYC, audit logs)`}
              </pre>
            </div>
            <div className="text-sm">
              <p className="mb-3">Middleware between conservative institutions and evolving ledgers:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Abstract chain quirks behind a stable API.</li>
                <li>Keep compliance and identity off-chain, where it belongs.</li>
                <li>Swap or add ledgers without changing product flows.</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section id="get-started" kicker="Get started" title="Open the dashboard or request a demo">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-black px-5 py-3 text-white shadow hover:bg-neutral-900"
          >
            Open Dashboard
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={(process.env.NEXT_PUBLIC_API_URL ?? '') + '/docs'}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border px-5 py-3 text-neutral-900 hover:bg-neutral-50"
          >
            View API Docs
          </a>
          <a
            href="mailto:hello@example.com?subject=TokenOps%20Demo"
            className="rounded-xl border px-5 py-3 text-neutral-900 hover:bg-neutral-50"
          >
            Request a Demo
          </a>
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          MVP focus: XRPL. Roadmap: Hedera adapter, role-based admin, API keys, audit exports.
        </p>
      </Section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="font-medium text-neutral-900">TokenOps</div>
            <nav className="flex flex-wrap gap-4">
              <Link
                href="/app/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Dashboard
              </Link>
              <a
                href={(process.env.NEXT_PUBLIC_API_URL ?? '') + '/docs'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                API Docs
              </a>
              <a href="#get-started" className="hover:underline">
                Get started
              </a>
              <a href="mailto:hello@example.com?subject=TokenOps%20Demo" className="hover:underline">
                Contact
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  )
}
