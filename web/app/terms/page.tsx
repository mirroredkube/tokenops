// web/app/terms/page.tsx
import Link from 'next/link'

export default function TermsOfServicePage() {
  const lastUpdated = 'September 2025'
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated: {lastUpdated}</p>
      </header>

      <section className="space-y-6 text-neutral-700">
        <p>
          These Terms govern your access to and use of <strong>Regula</strong>'s dashboard and API.
          By using the service, you agree to these Terms.
        </p>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">1. Accounts & Access</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You are responsible for safeguarding credentials and API keys.</li>
            <li>You must comply with applicable laws and avoid prohibited activities.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">2. Acceptable Use</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>No security testing without prior written consent.</li>
            <li>No abusive traffic, scraping of non‑public endpoints, or reverse engineering.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">3. Data & Exports</h2>
          <p className="mt-2">
            You retain ownership of your organizational data. We process it to provide the service
            and generate compliance evidence. Export tools (ZIP/JSON/CSV) are provided for your
            convenience and audit obligations.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">4. Availability & Changes</h2>
          <p className="mt-2">
            We strive for high availability but do not guarantee uninterrupted service. We may change
            or discontinue features with reasonable notice for breaking changes.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">5. Disclaimer & Liability</h2>
          <p className="mt-2">
            The service is provided "as is" without warranties. To the maximum extent permitted by
            law, our aggregate liability is limited to fees paid in the 12 months preceding the claim.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium text-neutral-900">6. Contact</h2>
          <p className="mt-2">
            For questions about these Terms, contact <a href="mailto:support@regula.com" className="underline">support@regula.com</a>.
          </p>
        </div>
      </section>

      <footer className="mt-10 text-sm text-neutral-500">
        <Link href="/" className="underline">Back to Home</Link>
      </footer>
    </main>
  )
}


