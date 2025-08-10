'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

type IssueForm = {
  currencyCode: string
  amount: string
  destination: string
  metadata: string
}

type TLForm = {
  tlCurrencyCode: string
  tlLimit: string
  tlHolderSeed?: string // DEV ONLY – omit if you set DESTINATION_SEED in API .env
}

export default function Page() {
  const [issueResult, setIssueResult] = useState<any>(null)
  const [tlResult, setTlResult] = useState<any>(null)

  // === Issue token form ===
  const issueForm = useForm<IssueForm>({
    defaultValues: {
      currencyCode: 'EUR', // use 3-letter or 40-hex
      amount: '100',
      destination: '',
      metadata: '{"jurisdiction":"DE"}'
    }
  })

  // === Trust line form ===
  const tlForm = useForm<TLForm>({
    defaultValues: {
      tlCurrencyCode: 'EUR', // or 40-hex like 4555...0000 for EURT
      tlLimit: '1000000',
      tlHolderSeed: '' // leave blank if API has DESTINATION_SEED
    }
  })

  async function createTrustLine(values: TLForm) {
    setTlResult(null)
    try {
      const body: any = {
        currencyCode: values.tlCurrencyCode,
        limit: values.tlLimit
      }
      if (values.tlHolderSeed) body.holderSeed = values.tlHolderSeed // DEV ONLY

      const res = await fetch('http://localhost:4000/trustlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      setTlResult(data)
    } catch (e: any) {
      setTlResult({ error: e.message || String(e) })
    }
  }

  async function issueToken(values: IssueForm) {
    setIssueResult(null)
    try {
      const metadata = values.metadata ? JSON.parse(values.metadata) : undefined
      const res = await fetch('http://localhost:4000/tokens/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, metadata })
      })
      const data = await res.json()
      setIssueResult(data)
    } catch (e: any) {
      setIssueResult({ error: e.message || String(e) })
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">XRPL Demo Console</h1>

      {/* Create Trust Line */}
      <section className="bg-white p-4 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold">1) Create Trust Line (Holder → Issuer)</h2>
        <form
          onSubmit={tlForm.handleSubmit(createTrustLine)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium">Currency Code</label>
            <input className="mt-1 w-full border rounded p-2"
              placeholder="EUR or 40-hex"
              {...tlForm.register('tlCurrencyCode', { required: true })}
            />
            <p className="text-xs text-gray-500 mt-1">
              3-letter (e.g., EUR) or 40-hex for custom codes (e.g., EURT).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">Limit</label>
            <input className="mt-1 w-full border rounded p-2"
              placeholder="1000000"
              {...tlForm.register('tlLimit', { required: true })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">
              Holder Secret (DEV ONLY – leave blank if API has DESTINATION_SEED)
            </label>
            <input className="mt-1 w-full border rounded p-2"
              type="password"
              placeholder="sEd..."
              {...tlForm.register('tlHolderSeed')}
            />
          </div>

          <div className="md:col-span-2">
            <button
              disabled={tlForm.formState.isSubmitting}
              className="px-4 py-2 rounded bg-black text-white"
            >
              {tlForm.formState.isSubmitting ? 'Submitting…' : 'Create Trust Line'}
            </button>
          </div>
        </form>

        {tlResult && (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(tlResult, null, 2)}
          </pre>
        )}
      </section>

      {/* Issue Token */}
      <section className="bg-white p-4 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold">2) Issue Token (Issuer → Holder)</h2>
        <form
          onSubmit={issueForm.handleSubmit(issueToken)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium">Currency Code</label>
            <input className="mt-1 w-full border rounded p-2"
              placeholder="EUR or 40-hex"
              {...issueForm.register('currencyCode', { required: true })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Amount</label>
            <input className="mt-1 w-full border rounded p-2"
              placeholder="100"
              {...issueForm.register('amount', { required: true })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Destination (Holder r... address)</label>
            <input className="mt-1 w-full border rounded p-2"
              placeholder="r..."
              {...issueForm.register('destination', { required: true })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Metadata (JSON)</label>
            <textarea className="mt-1 w-full border rounded p-2" rows={4}
              {...issueForm.register('metadata')}
            />
          </div>

          <div className="md:col-span-2">
            <button
              disabled={issueForm.formState.isSubmitting}
              className="px-4 py-2 rounded bg-black text-white"
            >
              {issueForm.formState.isSubmitting ? 'Submitting…' : 'Issue Token'}
            </button>
          </div>
        </form>

        {issueResult && (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(issueResult, null, 2)}
          </pre>
        )}

        <p className="text-sm text-gray-500">
          Tip: For 4+ letter codes (like EURT), use the 40-hex currency code.
        </p>
      </section>
    </main>
  )
}
