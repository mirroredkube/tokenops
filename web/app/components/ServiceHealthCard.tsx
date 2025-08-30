'use client'

import { useTranslation } from 'react-i18next'

interface ServiceHealthData {
  ok?: boolean
  service?: string
  time?: string
  uptimeSeconds?: number
  pid?: number
  memoryMB?: {
    rss?: number
    heapTotal?: number
    heapUsed?: number
    external?: number
  }
  version?: string
  env?: string
}

interface ServiceHealthCardProps {
  data: ServiceHealthData | null
  loading?: boolean
}

export default function ServiceHealthCard({ data, loading }: ServiceHealthCardProps) {
  const { t } = useTranslation(['common', 'dashboard'])
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded w-20"></div>
            <div className="grid grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-3">
                  <div className="h-3 bg-gray-200 rounded w-8 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-500">{t('dashboard:serviceHealth.title', 'Service Health')}</h3>
        <div className="text-gray-400">{t('dashboard:serviceHealth.noDataAvailable', 'No data available')}</div>
      </div>
    )
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatMemory = (mb: number) => {
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard:serviceHealth.title', 'Service Health')}</h3>
          </div>
          <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
            data.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${data.ok ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {data.ok ? t('dashboard:serviceHealth.healthy', 'Healthy') : t('dashboard:serviceHealth.unhealthy', 'Unhealthy')}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Service Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Service</p>
            <p className="text-sm font-semibold text-gray-900">{data.service || 'Unknown'}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</p>
            <p className="text-sm font-semibold text-gray-900">{data.env || 'Unknown'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime</p>
            <p className="text-sm font-semibold text-gray-900">{data.uptimeSeconds ? formatUptime(data.uptimeSeconds) : 'Unknown'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Process ID</p>
            <p className="text-sm font-semibold text-gray-900">{data.pid || 'Unknown'}</p>
          </div>
        </div>

        {/* Memory Usage */}
        {data.memoryMB && (
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Memory Usage</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">RSS</p>
                <p className="text-sm font-semibold text-gray-900">{formatMemory(data.memoryMB.rss || 0)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Heap Total</p>
                <p className="text-sm font-semibold text-gray-900">{formatMemory(data.memoryMB.heapTotal || 0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {data.time && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
            <p className="text-sm text-gray-600">{new Date(data.time).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  )
}
