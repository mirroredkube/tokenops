// app/page.tsx
import Link from 'next/link'
import CapabilitiesPager from './components/CapabilitiesPager'
import { ArchitectureDiagram } from "./components/ArchitectureDiagram";
import { CookieConsent } from "./components/CookieConsent";
import { CookieSettingsLink } from './components/FooterLink';

const BRAND = 'Regula'

function TopStrip() {
  return (
    <div className="w-full bg-neutral-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
        {/* Brand (SVG file + larger wordmark) */}
        <a href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
          <img
            src="/brand/logo.svg"
            width={28}
            height={28}
            alt="Regula logo"
            className="h-7 w-7 md:h-8 md:w-8"
          />
          <span className="text-2xl md:text-3xl leading-none">Regula</span>
        </a>

        {/* Header CTAs (kept custom for dark header) */}
        <div className="flex items-center gap-3 text-sm">
          <a
            href="#get-started"
            className="rounded-md bg-emerald-500 px-3 py-1.5 font-medium text-neutral-900 hover:bg-emerald-400 transition-colors"
          >
            Get started
          </a>
          <a
            href="mailto:hello@example.com?subject=Regula%20Demo"
            className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20 transition-colors"
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-base font-medium text-neutral-900">{title}</h3>
      <div className="mt-3 text-sm leading-6 text-neutral-600">{children}</div>
    </div>
  )
}

/* ---------- USP Icons + Tile ---------- */
function IconCode({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18L3 12l6-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconShield({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 2.3V11c0 4.8-3.1 9.2-7 10-3.9-.8-7-5.2-7-10V5.3L12 3z" strokeLinejoin="round" />
      <path d="M8.5 12.5l2.3 2.3 4.7-4.7" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}
function IconPluggable({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 8l3 3m7-7l-3 3M7 16l3-3m7 7l-3-3" strokeLinecap="round" />
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  )
}
function Feature({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-emerald-50 p-3">{icon}</div>
        <div>
          <div className="text-xl font-semibold text-neutral-900">{title}</div>
          <div className="mt-1 text-sm text-neutral-600">{subtitle}</div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Product Overview Icons ---------- */
function IconLayers({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l8 4-8 4-8-4 8-4Z" strokeLinejoin="round" />
      <path d="M4 11l8 4 8-4" strokeLinejoin="round" />
      <path d="M4 15l8 4 8-4" strokeLinejoin="round" />
    </svg>
  )
}
function IconRocket({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3c3.5 0 7 2.8 7 7 0 1.6-.6 3.2-1.7 4.3l-2.6 2.6-4.6-4.6 2.6-2.6A6 6 0 0 0 12 3Z" strokeLinejoin="round" />
      <path d="M9.1 12.9 5 17l1.1 1.1 4.1-4.1" strokeLinecap="round" />
      <path d="M7 21s1.5-3 4-3 4 3 4 3" strokeLinecap="round" />
    </svg>
  )
}
function IconShieldCheck({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 2.3V11c0 4.8-3.1 9.2-7 10-3.9-.8-7-5.2-7-10V5.3L12 3z" strokeLinejoin="round" />
      <path d="M8.5 12.5l2.3 2.3 4.7-4.7" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

/* ---------- Polished product card with button variants ---------- */
function ShowcaseCard({
  icon,
  title,
  children,
  href,
  cta = 'Learn more',
  variant = 'outline',
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  href?: string
  cta?: string
  variant?: 'primary' | 'outline'
}) {
  const btnClass = variant === 'primary' ? 'btn btn-primary' : 'btn btn-outline'
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* header banner with big icon */}
      <div className="relative h-20 w-full overflow-hidden rounded-t-xl bg-gradient-to-r from-emerald-50 to-blue-50 mb-4">
        <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="h-7 w-7 text-emerald-600">{icon}</div>
        </div>
      </div>

      {/* body */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{children}</p>

        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className={`${btnClass} mt-4`}>
            {cta}
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 5h8m0 0v8m0-8L5 15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}

/* ---------- Use Case Icons ---------- */
function IconBuilding({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 21h18" strokeLinejoin="round" />
      <path d="M5 21V7l8-4v18" strokeLinejoin="round" />
      <path d="M19 21V11l-6-4" strokeLinejoin="round" />
      <path d="M9 9h.01" strokeLinecap="round" />
      <path d="M9 13h.01" strokeLinecap="round" />
      <path d="M9 17h.01" strokeLinecap="round" />
    </svg>
  )
}
function IconTrendingUp({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 7l-8.5 8.5-5-5L2 17" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconGlobe({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" strokeLinejoin="round" />
      <path d="M2 12h20" strokeLinejoin="round" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinejoin="round" />
    </svg>
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
            Ledger-agnostic • Adapter-based • MiCA-ready
          </span>

          {/* Punchline */}
          <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight text-neutral-900">
            Compliance-Grade Tokenization, Delivered as an API
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-7 text-neutral-600">
            Issue and govern tokens with built-in compliance controls, audit trails, and role-based access. 
            Multi-ledger support with XRPL, Hedera, and Ethereum adapters. Enterprise-ready from day one.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/app/dashboard"
              className="btn btn-primary"
            >
              Try {BRAND}
            </Link>
            <a
              href={(process.env.NEXT_PUBLIC_API_URL ?? "") + "/docs"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              API Documentation
            </a>
            <a
              href="mailto:hello@example.com?subject=Regula%20Demo"
              className="btn btn-outline"
            >
              Request Demo
            </a>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Feature
              icon={<IconCode className="h-8 w-8 text-emerald-600" />}
              title="API-first"
              subtitle="Built for engineers & auditors"
            />
            <Feature
              icon={<IconShield className="h-8 w-8 text-emerald-600" />}
              title="MiCA-aware"
              subtitle="Compliance-framed metadata"
            />
            <Feature
              icon={<IconPluggable className="h-8 w-8 text-emerald-600" />}
              title="Multi-ledger"
              subtitle="XRPL, Hedera, Ethereum"
            />
          </div>
        </div>
      </section>

      {/* PRODUCT OVERVIEW */}
      <Section
        id="product"
        kicker={`Why ${BRAND}`}
        title="Built for asset managers, banks & fintechs"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <ShowcaseCard
            icon={<IconLayers className="h-full w-full" />}
            title="Reduce protocol risk"
            href="#get-started"
            cta="Explore the API"
            variant="primary"
          >
            Standardize on one API and dashboard while we handle ledger quirks,
            node health, and upgrades. Focus on your business logic, not blockchain complexity.
          </ShowcaseCard>

          <ShowcaseCard
            icon={<IconRocket className="h-full w-full" />}
            title="Launch pilots fast"
            href="#get-started"
            cta="Start a pilot"
            variant="primary"
          >
            Spin up a compliant testnet pilot in days: provision issuers, set
            limits, and attach jurisdiction & KYC flags. No mainnet funds required.
          </ShowcaseCard>

          <ShowcaseCard
            icon={<IconShieldCheck className="h-full w-full" />}
            title="Compliance-ready by design"
            href={(process.env.NEXT_PUBLIC_API_URL ?? "") + "/docs"}
            cta="View docs"
            variant="primary"
          >
            Roles, metadata, and exports aligned to MiCA-style reviews—with
            audit logs and evidence on tap. Built for regulatory scrutiny.
          </ShowcaseCard>
        </div>
      </Section>

      {/* USE CASES */}
      <Section kicker="Use Cases" title="Tokenization for every asset class">
        <div className="grid gap-6 md:grid-cols-3">
          <Card title="Real Estate Tokens">
            Fractional ownership of properties with automated compliance checks, 
            investor limits, and regulatory reporting. Support for REITs and 
            property-backed securities.
          </Card>
          <Card title="Commodity-Backed Tokens">
            Gold, silver, and other precious metals with real-time price feeds, 
            custody verification, and settlement automation. Perfect for 
            institutional investors.
          </Card>
          <Card title="Carbon Credits">
            Environmental assets with provenance tracking, retirement verification, 
            and regulatory compliance. Built for carbon markets and ESG initiatives.
          </Card>
          <Card title="Private Equity">
            Fund tokens with investor accreditation, transfer restrictions, and 
            automated distributions. Streamline capital calls and distributions.
          </Card>
          <Card title="Trade Finance">
            Invoice and receivables financing with automated settlement, 
            risk scoring, and regulatory reporting. Reduce settlement times 
            from weeks to minutes.
          </Card>
          <Card title="Stablecoins & CBDCs">
            Fiat-backed tokens with reserve verification, redemption mechanisms, 
            and regulatory oversight. Built for central banks and fintechs.
          </Card>
        </div>
      </Section>

      {/* FEATURES */}
      {/* CAPABILITIES – stacked showcase */}
      <CapabilitiesPager />

      {/* TECHNICAL SPECS */}
      <Section kicker="Technical Specifications" title="Enterprise-grade infrastructure">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Supported Ledgers</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">X</div>
                <div>
                  <div className="font-medium text-neutral-900">XRPL (XRP Ledger)</div>
                  <div className="text-sm text-neutral-600">Production ready with trustline management</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">H</div>
                <div>
                  <div className="font-medium text-neutral-900">Hedera</div>
                  <div className="text-sm text-neutral-600">Coming Q1 2024 - Enterprise DLT</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white text-xs font-bold">E</div>
                <div>
                  <div className="font-medium text-neutral-900">Ethereum</div>
                  <div className="text-sm text-neutral-600">Coming Q2 2024 - ERC-20 & ERC-1400</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Compliance Features</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-neutral-700">MiCA-compliant metadata structure</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-neutral-700">Role-based access control (RBAC)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-neutral-700">Audit trail with immutable logs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-neutral-700">KYC/AML flag management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-neutral-700">Regulatory reporting exports</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-neutral-700">Transfer restrictions & limits</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section kicker="How it works" title="From idea to pilot in four steps">
        <ol className="grid gap-4 md:grid-cols-4">
          <li className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Step 1</div>
            <div className="mt-1 font-medium text-neutral-900">
              Connect issuer
            </div>
            <p className="mt-2 text-sm">
              Configure your issuer account and workspace. No mainnet funds
              required for pilots. Multi-tenant support for organizations.
            </p>
          </li>
          <li className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Step 2</div>
            <div className="mt-1 font-medium text-neutral-900">
              Create trust lines
            </div>
            <p className="mt-2 text-sm">
              Establish holder limits and policies. Add KYC/AML flags as needed.
              Set transfer restrictions and compliance rules.
            </p>
          </li>
          <li className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Step 3</div>
            <div className="mt-1 font-medium text-neutral-900">
              Issue tokens
            </div>
            <p className="mt-2 text-sm">
              Mint tokens with structured metadata. Instant hashes & explorer
              links. Real-time balance tracking and event monitoring.
            </p>
          </li>
          <li className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Step 4</div>
            <div className="mt-1 font-medium text-neutral-900">
              Monitor & export
            </div>
            <p className="mt-2 text-sm">
              Track balances and events, export audit-ready CSV/JSON.
              Real-time alerts and regulatory reporting dashboards.
            </p>
          </li>
        </ol>
      </Section>

      {/* ARCHITECTURE */}
      <Section kicker="Architecture" title="A clean separation of concerns">
        <ArchitectureDiagram />
      </Section>

      {/* CTA */}
      <Section
        id="get-started"
        kicker="Get started"
        title="Open the dashboard or request a demo"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Open Dashboard
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={(process.env.NEXT_PUBLIC_API_URL ?? "") + "/docs"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            View API Docs
          </a>
          <a
            href="mailto:hello@example.com?subject=Regula%20Demo"
            className="btn btn-outline"
          >
            Request a Demo
          </a>
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          Currently supporting XRPL with Hedera and Ethereum adapters coming soon. 
          Enterprise features: role-based admin, API keys, audit exports, and multi-tenant support.
        </p>
      </Section>
      <CookieConsent />

      {/* FOOTER */}
      <footer className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="font-medium text-neutral-900">{BRAND}</div>
            <nav className="flex flex-wrap gap-4">
              <div className="flex gap-4 text-sm text-neutral-500">
                <a href="/privacy" className="hover:underline">
                  Privacy Policy
                </a>
                <a href="/terms" className="hover:underline">
                  Terms of Service
                </a>
                <CookieSettingsLink /> 
              </div>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
