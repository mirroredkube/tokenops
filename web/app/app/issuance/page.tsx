'use client'
import { useState } from 'react'
import { api, ensureJson } from '@/lib/api'

export default function IssuePage() {
  const [currencyCode, setCurrency] = useState('')
  const [amount, setAmount] = useState('')
  const [destination, setDest] = useState('')
  const [metadata, setMeta] = useState('')
  const [res, setRes] = useState<any>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    let metaObj: any | undefined
    if (metadata.trim()) metaObj = ensureJson(metadata)
    const { data, error } = await api.POST('/tokens/issue', { body: { currencyCode, amount, destination, metadata: metaObj } })
    if (error || !data) { alert(error?.message ?? 'Failed'); return }
    setRes(data)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">Issue Token</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Currency Code</label>
            <input className="mt-1 w-full rounded border p-2" value={currencyCode} onChange={e=>setCurrency(e.target.value)} placeholder="USD or MARKS" />
          </div>
          <div>
            <label className="block text-sm font-medium">Amount</label>
            <input className="mt-1 w-full rounded border p-2" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="100" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Destination (Holder r-addr)</label>
          <input className="mt-1 w-full rounded border p-2" value={destination} onChange={e=>setDest(e.target.value)} placeholder="r..." />
        </div>
        <div>
          <label className="block text-sm font-medium">Metadata (JSON)</label>
          <textarea className="mt-1 w-full rounded border p-2" rows={5} value={metadata} onChange={e=>setMeta(e.target.value)} placeholder='{"jurisdiction":"DE"}' />
        </div>
        <button className="rounded bg-black px-4 py-2 text-white">Issue</button>
      </form>
      {res && (
        <pre className="mt-4 overflow-auto rounded bg-neutral-50 p-3 text-xs">{JSON.stringify(res, null, 2)}</pre>
      )}
    </div>
  )
}