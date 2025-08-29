'use client'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import ServiceHealthCard from '../../components/ServiceHealthCard'
import XrplStatusCard from '../../components/XrplStatusCard'
import KPICards from '../../components/KPICards'
import PendingIssuancesQueue from '../../components/PendingIssuancesQueue'
import ComplianceToVerifyQueue from '../../components/ComplianceToVerifyQueue'
import RecentIssuancesQueue from '../../components/RecentIssuancesQueue'
import MultiNetworkDemo from '../../components/MultiNetworkDemo'
import QuickActions from '../../components/QuickActions'
import LanguageSwitcher from '../../components/LanguageSwitcher'

export default function Dashboard() {
  const { t } = useTranslation(['common'])
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('navigation.dashboard')}</h1>
          <p className="text-gray-600 mt-1">Overview of your token operations and system status</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500">
            Updated {new Date().toLocaleTimeString()}
          </div>
          <div className="w-px h-4 bg-gray-300"></div>
          <LanguageSwitcher />
        </div>
      </div>
      
      {/* KPI Cards */}
      <KPICards />
      
      {/* Quick Actions */}
      <QuickActions />
      
      {/* Actionable Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingIssuancesQueue />
        <ComplianceToVerifyQueue />
      </div>
      
      {/* Recent Issuances */}
      <RecentIssuancesQueue />
      
      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceHealthCard 
          data={health.data || null} 
          loading={health.isLoading} 
        />
        <XrplStatusCard />
      </div>

      {/* Multi-Network Demo */}
      <MultiNetworkDemo />
    </div>
  )
}