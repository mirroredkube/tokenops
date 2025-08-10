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
  tlHolderSeed?: string
}

type BalForm = { account: string; issuer?: string; currency?: string }

export default function Page() {
  const [issueResult, setIssueResult] = useState<any>(null)
  const [tlResult, setTlResult] = useState<any>(null)
  const [balResult, setBalResult] = useState<any>(null)

  // === Forms ===
  const issueForm = useForm<IssueForm>({
    defaultValues: {
      currencyCode: 'EUR',
      amount: '100',
      destination: '',
      metadata: '{"jurisdiction":"DE"}'
    }
  })

  const tlForm = useForm<TLForm>({
    defaultValues: {
      tlCurrencyCode: 'EUR',
      tlLimit: '1000000',
      tlHolderSeed: ''
    }
  })

  const balForm = useForm<BalForm>({
    defaultValues: { account: '', issuer: '', currency: '' }
  })

  // === Handlers ===
  // remove normalizeCurrency() usage in createTrustLine & issueToken

async function createTrustLine(values: TLForm) {
  setTlResult(null)
  try {
    const body: any = {
      currencyCode: values.tlCurrencyCode,   // send raw, server will normalize
      limit: values.tlLimit
    }
    if (values.tlHolderSeed) body.holderSeed = values.tlHolderSeed
    const res = await fetch('http://localhost:4000/trustlines', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })
    setTlResult(await res.json())
  } catch (e:any) { setTlResult({ error: e.message || String(e) }) }
}

async function issueToken(values: IssueForm) {
  setIssueResult(null)
  try {
    if (values.currencyCode.trim().toUpperCase() === 'XRP') {
      setIssueResult({ ok:false, error:'XRP cannot be issued via this API.' }); return
    }
    const metadata = values.metadata ? JSON.parse(values.metadata) : undefined
    const res = await fetch('http://localhost:4000/tokens/issue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, metadata }) // send raw, server normalizes
    })
    setIssueResult(await res.json())
  } catch (e:any) { setIssueResult({ error: e.message || String(e) }) }
}

async function fetchBalances(values: BalForm) {
  setBalResult(null)
  const params = new URLSearchParams()
  if (values.issuer) params.set('issuer', values.issuer)
  if (values.currency) params.set('currency', values.currency) // server can also accept raw or hex
  const url = `http://localhost:4000/balances/${values.account}?` + params.toString()
  const res = await fetch(url); setBalResult(await res.json())
}

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">XRPL Demo Console</h1>

      {/* Create Trust Line */}
      <section className="bg-white p-4 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold">1) Create Trust Line (Holder → Issuer)</h2>
        <form onSubmit={tlForm.handleSubmit(createTrustLine)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Currency Code</label>
            <input className="mt-1 w-full border rounded p-2"
              placeholder="EUR or EURT"
              {...tlForm.register('tlCurrencyCode', { required: true })}
            />
            <p className="text-xs text-gray-500 mt-1">
              3-letter (e.g., EUR) or longer names (auto-converted to 40-hex).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">Limit</label>
            <input className="mt-1 w-full border rounded p-2" placeholder="1000000" {...tlForm.register('tlLimit', { required: true })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Holder Secret (DEV ONLY)</label>
            <input className="mt-1 w-full border rounded p-2" type="password" placeholder="sEd..." {...tlForm.register('tlHolderSeed')} />
          </div>
          <div className="md:col-span-2">
            <button disabled={tlForm.formState.isSubmitting} className="px-4 py-2 rounded bg-black text-white">
              {tlForm.formState.isSubmitting ? 'Submitting…' : 'Create Trust Line'}
            </button>
          </div>
        </form>
        {tlResult && <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-sm">{JSON.stringify(tlResult, null, 2)}</pre>}
      </section>

      {/* Issue Token */}
      <section className="bg-white p-4 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold">2) Issue Token (Issuer → Holder)</h2>
        <form onSubmit={issueForm.handleSubmit(issueToken)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Currency Code</label>
            <input className="mt-1 w-full border rounded p-2" placeholder="EUR or EURT" {...issueForm.register('currencyCode', { required: true })} />
            <p className="text-xs text-gray-500 mt-1">Auto-converts longer codes to 40-hex before sending to XRPL.</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Amount</label>
            <input className="mt-1 w-full border rounded p-2" placeholder="100" {...issueForm.register('amount', { required: true })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Destination (Holder r...)</label>
            <input className="mt-1 w-full border rounded p-2" placeholder="r..." {...issueForm.register('destination', { required: true })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Metadata (JSON)</label>
            <textarea className="mt-1 w-full border rounded p-2" rows={4} {...issueForm.register('metadata')} />
          </div>
          <div className="md:col-span-2">
            <button disabled={issueForm.formState.isSubmitting} className="px-4 py-2 rounded bg-black text-white">
              {issueForm.formState.isSubmitting ? 'Submitting…' : 'Issue Token'}
            </button>
          </div>
        </form>
        {issueResult && <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-sm">{JSON.stringify(issueResult, null, 2)}</pre>}
      </section>

      {/* View Balances */}
      <section className="bg-white p-4 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold">3) View Balances</h2>
        <form onSubmit={balForm.handleSubmit(fetchBalances)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">Account (r...)</label>
            <input className="mt-1 w-full border rounded p-2" placeholder="r..." {...balForm.register('account', { required: true })} />
          </div>
          <div>
            <label className="block text-sm font-medium">Filter: Issuer</label>
            <input className="mt-1 w-full border rounded p-2" placeholder="r...(issuer)" {...balForm.register('issuer')} />
          </div>
          <div>
            <label className="block text-sm font-medium">Filter: Currency</label>
            <input className="mt-1 w-full border rounded p-2" placeholder="EUR or EURT" {...balForm.register('currency')} />
          </div>
          <div className="self-end">
            <button disabled={balForm.formState.isSubmitting} className="px-4 py-2 rounded bg-black text-white">
              {balForm.formState.isSubmitting ? 'Loading…' : 'Fetch Balances'}
            </button>
          </div>
        </form>
        {balResult && (
          balResult.ok === false
            ? <pre className="bg-red-900 text-red-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(balResult, null, 2)}</pre>
            : balResult.ok && (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded border">
                  <div className="text-sm text-gray-600">XRP Balance</div>
                  <div className="text-lg font-semibold">{balResult.xrpBalance} XRP</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Trust Lines</div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 border">Currency</th>
                          <th className="p-2 border">Issuer</th>
                          <th className="p-2 border text-right">Balance</th>
                          <th className="p-2 border text-right">Limit</th>
                          <th className="p-2 border text-center">Authorized</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(balResult.trustLines || []).map((l: any, i: number) => (
                          <tr key={i}>
                            <td className="p-2 border">{l.currency}</td>
                            <td className="p-2 border">{l.issuer}</td>
                            <td className="p-2 border text-right">{l.balance}</td>
                            <td className="p-2 border text-right">{l.limit}</td>
                            <td className="p-2 border text-center">{String(l.authorized)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <details className="p-2 bg-gray-50 rounded border">
                  <summary className="cursor-pointer">Raw response</summary>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-xs">
                    {JSON.stringify(balResult, null, 2)}
                  </pre>
                </details>
              </div>
            )
        )}
      </section>
    </main>
  )
}
