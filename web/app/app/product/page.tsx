import Link from 'next/link'
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  BarChart3, 
  Users, 
  Key, 
  Settings,
  CheckCircle,
  Play,
  ExternalLink
} from 'lucide-react'

const BRAND = 'Regula'

function TopStrip() {
  return (
    <div className="w-full bg-neutral-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
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

        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/app/dashboard"
            className="rounded-md bg-emerald-500 px-3 py-1.5 font-medium text-neutral-900 hover:bg-emerald-400"
          >
            Open Dashboard
          </Link>
          <a
            href="mailto:hello@example.com?subject=Regula%20Demo"
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

function FeatureCard({
  icon,
  title,
  description,
  href,
  cta = 'Learn more',
}: {
  icon: React.ReactNode
  title: string
  description: string
  href?: string
  cta?: string
}) {
  return (
    <div className="group relative rounded-[20px] p-[1px] bg-gradient-to-br from-emerald-200/70 via-transparent to-indigo-200/70 transition-shadow duration-300 hover:shadow-xl">
      <div className="relative rounded-[19px] bg-white">
        <div className="card-glow relative h-20 w-full overflow-hidden rounded-t-[19px] bg-neutral-50">
          <div className="absolute inset-0 opacity-[.35] blur-2xl" />
          <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="h-7 w-7 text-emerald-600 motion-safe:animate-float">{icon}</div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>

          {href && (
            <Link href={href} className="btn btn-outline mt-4">
              {cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ number, label, icon }: { number: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center">
        <div className="p-2 bg-emerald-100 rounded-lg">
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-semibold">{number}</p>
        </div>
      </div>
    </div>
  )
}

export default function ProductPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-white">
      <TopStrip />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[880px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.10),rgba(99,102,241,0.08),transparent_70%)] blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Live Product • Ready to Use
          </span>

          <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight text-neutral-900">
            Token Issuance Platform
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-7 text-neutral-600">
            Issue tokens across multiple blockchains with built-in compliance controls, 
            real-time monitoring, and comprehensive audit trails.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/app/dashboard"
              className="btn btn-primary"
            >
              Open Dashboard
            </Link>
            <Link
              href="/app/issuance"
              className="btn btn-outline"
            >
              Issue Your First Token
            </Link>
            <a
              href={(process.env.NEXT_PUBLIC_API_URL ?? "") + "/docs"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              API Documentation
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* QUICK STATS */}
      <Section title="Platform Overview">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            number="3" 
            label="Supported Ledgers" 
            icon={<Shield className="h-6 w-6 text-emerald-600" />} 
          />
          <StatCard 
            number="100%" 
            label="Uptime" 
            icon={<Zap className="h-6 w-6 text-emerald-600" />} 
          />
          <StatCard 
            number="24/7" 
            label="Monitoring" 
            icon={<BarChart3 className="h-6 w-6 text-emerald-600" />} 
          />
        </div>
      </Section>

      {/* FEATURES */}
      <Section kicker="Features" title="Everything you need to issue tokens">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Shield className="h-full w-full" />}
            title="Multi-Ledger Support"
            description="Issue tokens on XRPL, Hedera, and Ethereum with a unified API. More ledgers coming soon."
            href="/app/issuance"
            cta="Try Issuance"
          />

          <FeatureCard
            icon={<BarChart3 className="h-full w-full" />}
            title="Real-time Dashboard"
            description="Monitor token issuances, balances, and transactions in real-time with comprehensive analytics."
            href="/app/dashboard"
            cta="View Dashboard"
          />

          <FeatureCard
            icon={<Users className="h-full w-full" />}
            title="Trustline Management"
            description="Create and manage trustlines for XRPL tokens with automated compliance checks."
            href="/app/trustlines"
            cta="Manage Trustlines"
          />

          <FeatureCard
            icon={<Key className="h-full w-full" />}
            title="API-First Design"
            description="RESTful APIs for programmatic access. Perfect for integrations and automation."
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`}
            cta="View API Docs"
          />

          <FeatureCard
            icon={<Settings className="h-full w-full" />}
            title="Compliance Ready"
            description="Built-in metadata support, audit trails, and export capabilities for regulatory compliance."
            href="/app/dashboard"
            cta="Explore Features"
          />

          <FeatureCard
            icon={<CheckCircle className="h-full w-full" />}
            title="Production Ready"
            description="Enterprise-grade infrastructure with monitoring, logging, and support for production deployments."
            href="/app/dashboard"
            cta="Get Started"
          />
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section kicker="How it works" title="From idea to token in minutes">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-emerald-600 font-semibold">1</span>
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Select Ledger</h3>
            <p className="text-sm text-neutral-600">Choose your target blockchain platform</p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-emerald-600 font-semibold">2</span>
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Setup Trustline</h3>
            <p className="text-sm text-neutral-600">Establish holder limits and policies</p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-emerald-600 font-semibold">3</span>
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Issue Token</h3>
            <p className="text-sm text-neutral-600">Mint tokens with metadata and compliance flags</p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-emerald-600 font-semibold">4</span>
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Monitor & Export</h3>
            <p className="text-sm text-neutral-600">Track activity and export audit-ready reports</p>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section
        id="get-started"
        kicker="Get started"
        title="Ready to issue your first token?"
      >
        <div className="text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <Link
              href="/app/dashboard"
              className="btn btn-primary"
            >
              Open Dashboard
            </Link>
            <Link
              href="/app/issuance"
              className="btn btn-outline"
            >
              Start Issuing
            </Link>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              API Documentation
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <p className="text-sm text-neutral-500">
            No registration required. Start issuing tokens immediately with our demo environment.
          </p>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="font-medium text-neutral-900">{BRAND}</div>
            <nav className="flex flex-wrap gap-4">
              <div className="flex gap-4 text-sm text-neutral-500">
                <a href="/privacy" className="hover:underline">Privacy Policy</a>
                <a href="/terms" className="hover:underline">Terms of Service</a>
                <a href="mailto:hello@example.com" className="hover:underline">Contact</a>
              </div>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  )
}
