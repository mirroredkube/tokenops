'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

export default function BalancesPage() {
  const [account, setAccount] = useState('')
  const [issuer, setIssuer] = useState('')
  const [currency, setCurrency] = useState('')
  const [res, setRes] = useState<any>(null)

  async function onFetch(e: React.FormEvent) {
    e.preventDefault()
    if (!account) { alert('Account required'); return }
    const { data, error } = await api.GET('/balances/{account}', {
      params: { path: { account }, query: { issuer: issuer || undefined, currency: currency || undefined } }
    })
    if (error || !data) { alert(error?.message ?? 'Failed'); return }
    setRes(data)
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-semibold">View Balances</h1>
      <form onSubmit={onFetch} className="grid grid-cols-3 gap-4">
        <input className="rounded border p-2 col-span-3" placeholder="Account (r...)" value={account} onChange={e=>setAccount(e.target.value)} />
        <input className="rounded border p-2" placeholder="Issuer (r...)" value={issuer} onChange={e=>setIssuer(e.target.value)} />
        <input className="rounded border p-2" placeholder="Currency (USD or hex)" value={currency} onChange={e=>setCurrency(e.target.value)} />
        <button className="rounded bg-black px-4 py-2 text-white">Fetch Balances</button>
      </form>
      {res && (
        <div className="mt-6">
          <pre className="overflow-auto rounded bg-neutral-50 p-3 text-xs">{JSON.stringify(res, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}