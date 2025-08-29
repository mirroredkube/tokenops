'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import TokenDashboard from '../../components/TokenDashboard'
import ServiceHealthCard from '../../components/ServiceHealthCard'
import XrplStatusCard from '../../components/XrplStatusCard'
import KPICards from '../../components/KPICards'

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your token operations and system status</p>
      </div>
      
      {/* KPI Cards */}
      <KPICards />
      
      {/* Token Dashboard */}
      <TokenDashboard />
      
      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceHealthCard 
          data={health.data || null} 
          loading={health.isLoading} 
        />
        <XrplStatusCard 
          data={xrpl.data || null} 
          loading={xrpl.isLoading} 
        />
      </div>
    </div>
  )
}