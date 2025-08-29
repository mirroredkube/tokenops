'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  Building2, 
  Shield, 
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  Coins
} from 'lucide-react'

interface KPIData {
  activeAssets: number
  totalTokens: number
  totalIssuances: number
  complianceRecords: {
    verified: number
    unverified: number
    total: number
  }
  pendingIssuances: number
}

export default function KPICards() {
  const router = useRouter()

  // Fetch KPI data
  const kpiData = useQuery({
    queryKey: ['dashboard-kpi'],
    queryFn: async (): Promise<KPIData> => {
      // Fetch active assets
      const { data: assetsResponse } = await api.GET('/v1/assets?status=active&limit=1' as any, {})
      const activeAssets = assetsResponse?.total || 0

      // Fetch all assets for total tokens count
      const { data: allAssetsResponse } = await api.GET('/v1/assets?limit=1' as any, {})
      const totalTokens = allAssetsResponse?.total || 0

      // Fetch total issuances count
      const { data: issuancesResponse } = await api.GET('/v1/issuances?limit=1' as any, {})
      const totalIssuances = issuancesResponse?.total || 0

      // Fetch compliance records
      const { data: complianceResponse } = await api.GET('/v1/compliance-records?limit=100&page=1' as any, {})
      console.log('🔍 Compliance API response:', complianceResponse)
      const complianceRecords = complianceResponse?.records || []
      console.log('🔍 Compliance records:', complianceRecords)
      
      // Count by status - handle both uppercase and lowercase
      let verified = 0
      let unverified = 0
      
      complianceRecords.forEach((record: any) => {
        const status = record.status?.toUpperCase()
        console.log('🔍 Record status:', record.status, '->', status)
        if (status === 'VERIFIED') verified++
        else if (status === 'UNVERIFIED') unverified++
      })
      
      console.log('🔍 Final counts - Verified:', verified, 'Unverified:', unverified)
      const totalComplianceRecords = complianceResponse?.pagination?.total || complianceRecords.length

      // Fetch pending issuances (we'll need to aggregate this)
      const pendingIssuances = 0 // TODO: Implement when we have the endpoint

      return {
        activeAssets,
        totalTokens,
        totalIssuances,
        complianceRecords: {
          verified,
          unverified,
          total: totalComplianceRecords
        },
        pendingIssuances
      }
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  })

  const isLoading = kpiData.isLoading
  const data = kpiData.data

  const kpiCards = [
    {
      title: 'Active Assets',
      value: data?.activeAssets || 0,
      icon: Building2,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-50',
      onClick: () => router.push('/app/assets')
    },
    {
      title: 'Total Tokens',
      value: data?.totalTokens || 0,
      icon: Database,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-50',
      onClick: () => router.push('/app/assets')
    },
    {
      title: 'Total Issuances',
      value: data?.totalIssuances || 0,
      icon: Coins,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-50',
      onClick: () => router.push('/app/issuance')
    },
    {
      title: 'Compliance Records',
      value: data?.complianceRecords?.total || 0,
      subtitle: `${data?.complianceRecords?.verified || 0} verified, ${data?.complianceRecords?.unverified || 0} unverified`,
      icon: Shield,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-50',
      onClick: () => router.push('/app/compliance')
    },
    {
      title: 'Pending Issuances',
      value: data?.pendingIssuances || 0,
      icon: Clock,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-50',
      onClick: () => router.push('/app/issuance')
    },
    {
      title: 'Active Ledger',
      value: 'XRPL',
      icon: TrendingUp,
      color: 'bg-neutral-800',
      hoverColor: 'hover:bg-neutral-50',
      onClick: () => router.push('/app/settings')
    }
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              <div className="text-right">
                <div className="w-20 h-4 bg-gray-200 rounded mb-2"></div>
                <div className="w-12 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (kpiData.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800">Failed to load dashboard data. Please try refreshing the page.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {kpiCards.map((card, index) => (
        <button
          key={index}
          onClick={card.onClick}
          className={`bg-white p-6 rounded-lg border border-gray-200 transition-all duration-200 ${card.hoverColor} hover:shadow-lg hover:scale-105 cursor-pointer`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-lg ${card.color} text-white`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
