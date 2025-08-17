'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function Dashboard() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.GET('/system/health')).data,
  })
  const xrpl = useQuery({
    queryKey: ['xrpl-status'],
    queryFn: async () => (await api.GET('/system/xrpl-status')).data,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-medium">Service Health</h2>
        <pre className="overflow-auto rounded bg-neutral-50 p-3 text-xs">{JSON.stringify(health.data ?? {}, null, 2)}</pre>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-medium">XRPL Status</h2>
        <pre className="overflow-auto rounded bg-neutral-50 p-3 text-xs">{JSON.stringify(xrpl.data ?? {}, null, 2)}</pre>
      </section>
    </div>
  )
}