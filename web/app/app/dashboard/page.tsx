'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import TokenDashboard from '../../components/TokenDashboard'

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
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Token Dashboard */}
      <TokenDashboard />
      
      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Service Health</h2>
          <pre className="overflow-auto rounded bg-neutral-50 p-3 text-xs">{JSON.stringify(health.data ?? {}, null, 2)}</pre>
        </section>
        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">XRPL Status</h2>
          <pre className="overflow-auto rounded bg-neutral-50 p-3 text-xs">{JSON.stringify(xrpl.data ?? {}, null, 2)}</pre>
        </section>
      </div>
    </div>
  )
}