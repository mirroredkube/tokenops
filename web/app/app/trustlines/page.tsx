'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

export default function TrustlinesPage() {
  const [currencyCode, setCurrency] = useState('')
  const [limit, setLimit] = useState('1000000')
  const [holderSecret, setSecret] = useState('')
  const [res, setRes] = useState<any>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { data, error } = await api.POST('/trustlines/create', { body: { currencyCode, limit, holderSecret } })
    if (error || !data) { alert(error?.message ?? 'Failed'); return }
    setRes(data)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">Create Trust Line</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Currency Code</label>
            <input className="mt-1 w-full rounded border p-2" value={currencyCode} onChange={e=>setCurrency(e.target.value)} placeholder="EURF" />
          </div>
          <div>
            <label className="block text-sm font-medium">Limit</label>
            <input className="mt-1 w-full rounded border p-2" value={limit} onChange={e=>setLimit(e.target.value)} placeholder="1000000" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Holder Secret (DEV ONLY)</label>
          <input className="mt-1 w-full rounded border p-2" value={holderSecret} onChange={e=>setSecret(e.target.value)} placeholder="sEd..." />
        </div>
        <button className="rounded bg-black px-4 py-2 text-white">Create Trust Line</button>
      </form>
      {res && <pre className="mt-4 overflow-auto rounded bg-neutral-50 p-3 text-xs">{JSON.stringify(res, null, 2)}</pre>}
    </div>
  )
}