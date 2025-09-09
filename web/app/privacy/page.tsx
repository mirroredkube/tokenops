// web/app/privacy/page.tsx
import Link from 'next/link'

export default function PrivacyPolicyPage() {
  const lastUpdated = 'September 2025'
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated: {lastUpdated}</p>
      </header>

      <section className="space-y-6 text-neutral-700">
        <p>
          This Privacy Policy explains how <strong>Regula</strong> ("we", "us", or "our") collects,
          uses, and safeguards information when you use our dashboard and API for policy‑driven token
          issuance and compliance.
        </p>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">Information We Collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Account details (name, email) to create and administer your workspace.</li>
            <li>Operational data you provide (organizations, products, assets, issuances).</li>
            <li>Audit and security logs (IP, user agent, timestamps, actions).</li>
            <li>Cookies strictly necessary for authentication and session management.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">How We Use Information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To operate the service, authenticate users, and provide support.</li>
            <li>To generate compliance evidence, reports, and export bundles you request.</li>
            <li>To maintain security, prevent abuse, and improve reliability.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">Data Retention</h2>
          <p className="mt-2">
            We retain account and operational records for as long as your organization maintains an
            active workspace or as required by law/regulatory obligations. You can request deletion of
            non‑statutory data via support.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">Your Choices</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Access, update, or delete your profile information from the dashboard.</li>
            <li>Export compliance data using built‑in ZIP/JSON/CSV export tools.</li>
            <li>Manage cookie preferences via <Link href="/" className="underline">Cookie settings</Link>.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">Contact</h2>
          <p className="mt-2">
            For privacy questions or requests, contact <a href="mailto:support@regula.com" className="underline">support@regula.com</a>.
          </p>
        </div>
      </section>

      <footer className="mt-10 text-sm text-neutral-500">
        <Link href="/" className="underline">Back to Home</Link>
      </footer>
    </main>
  )
}


