'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RotateCcw, Calendar, Search, Filter, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import CustomDropdown from '../../components/CustomDropdown'
import { api } from '../../../src/lib/api'

type ReportTab = 'issuances' | 'authorizations' | 'compliance'

interface FilterState {
  dateRange: string
  assetId: string
  status: string
  holder: string
}

interface IssuanceRecord {
  id?: string
  assetId?: string
  assetRef?: string
  to?: string
  amount?: string
  status?: string
  txId?: string
  createdAt?: string
  updatedAt?: string
}

export default function ReportsPage() {
  const { t } = useTranslation(['reports', 'common'])
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ReportTab>('issuances')
  const [filters, setFilters] = useState<FilterState>({
    dateRange: '30',
    assetId: '',
    status: 'all',
    holder: ''
  })

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    setFilters({
      dateRange: '30',
      assetId: '',
      status: 'all',
      holder: ''
    })
  }

  const handleDownloadCSV = () => {
    if (activeTab === 'issuances') {
      downloadIssuancesCSV(filters)
    } else if (activeTab === 'authorizations') {
      downloadAuthorizationsCSV(filters)
    } else if (activeTab === 'compliance') {
      downloadComplianceCSV(filters)
    }
  }

  const downloadIssuancesCSV = (filters: FilterState) => {
    // Get the current issuances data from the query
    const issuancesData = queryClient.getQueryData(['issuances', filters]) as any
    const issuances = issuancesData?.items || []
    
    const headers = ['Date/Time', 'Asset', 'To (Holder)', 'Amount', 'Status', 'Transaction ID']
    
    const csvRows = [headers]
    
    issuances.forEach((issuance: IssuanceRecord) => {
      const row = [
        issuance.createdAt ? new Date(issuance.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : '',
        issuance.assetRef || 'Unknown',
        issuance.to || 'Unknown',
        issuance.amount ? parseFloat(issuance.amount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6
        }) : '0',
        issuance.status || '',
        issuance.txId || ''
      ]
      csvRows.push(row)
    })
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `issuances-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const downloadAuthorizationsCSV = (filters: FilterState) => {
    // Get the current authorizations data from the query
    const authorizationsData = queryClient.getQueryData(['authorizations', filters]) as any
    const authorizations = authorizationsData?.authorizations || []
    
    const headers = ['Date/Time', 'Asset', 'Holder', 'Limit', 'Status', 'Transaction ID']
    
    const csvRows = [headers]
    
    authorizations.forEach((auth: any) => {
      const row = [
        auth.createdAt ? new Date(auth.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : '',
        auth.asset?.code || 'Unknown',
        auth.holder || 'Unknown',
        auth.limit ? parseFloat(auth.limit).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6
        }) : '0',
        auth.status || '',
        auth.txId || ''
      ]
      csvRows.push(row)
    })
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `authorizations-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const downloadComplianceCSV = (filters: FilterState) => {
    // Get the current compliance data from the query
    const complianceData = queryClient.getQueryData(['compliance-records', filters]) as any
    const records = complianceData?.records || []
    
    const headers = ['Created', 'Record ID', 'Asset', 'Holder', 'Status', 'SHA-256', 'Verified At']
    
    const csvRows = [headers]
    
    records.forEach((record: any) => {
      const row = [
        record.createdAt ? new Date(record.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : '',
        record.recordId || '',
        record.assetRef || '',
        record.holder || '',
        record.status || '',
        record.sha256 || '',
        record.verifiedAt ? new Date(record.verifiedAt).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : ''
      ]
      csvRows.push(row)
    })
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: 'issuances', label: t('reports:issuances', 'Issuances') },
    { id: 'authorizations', label: t('reports:authorizations', 'Authorizations') },
    { id: 'compliance', label: t('reports:compliance', 'Compliance') }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('reports:title', 'Reports')}</h1>
        <p className="text-gray-600 mt-1">{t('reports:description', 'Generate reports and export data for compliance and analysis')}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{t('reports:filters.date', 'Date:')}</span>
            <CustomDropdown
              value={filters.dateRange}
              onChange={(value) => handleFilterChange('dateRange', value)}
              options={[
                { value: '7', label: t('reports:filters.last7Days', 'Last 7 days') },
                { value: '30', label: t('reports:filters.last30Days', 'Last 30 days') },
                { value: '90', label: t('reports:filters.last90Days', 'Last 90 days') },
                { value: 'custom', label: t('reports:filters.customRange', 'Custom range') }
              ]}
              className="w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{t('reports:filters.status', 'Status:')}</span>
            <CustomDropdown
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              options={
                activeTab === 'compliance' 
                  ? [
                      { value: 'all', label: t('reports:filters.allStatuses', 'All Statuses') },
                      { value: 'UNVERIFIED', label: t('reports:filters.unverified', 'Unverified') },
                      { value: 'VERIFIED', label: t('reports:filters.verified', 'Verified') },
                      { value: 'REJECTED', label: t('reports:filters.rejected', 'Rejected') }
                    ]
                  : [
                      { value: 'all', label: t('reports:filters.allStatuses', 'All Statuses') },
                      { value: 'SUBMITTED', label: t('reports:filters.submitted', 'Submitted') },
                      { value: 'VALIDATED', label: t('reports:filters.validated', 'Validated') },
                      { value: 'FAILED', label: t('reports:filters.failed', 'Failed') }
                    ]
              }
              className="w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{t('reports:filters.holder', 'Holder:')}</span>
            <input
              type="text"
              value={filters.holder}
              onChange={(e) => handleFilterChange('holder', e.target.value)}
              placeholder={t('reports:filters.searchHolderAddress', 'Search holder address...')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleReset}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {t('reports:actions.reset', 'Reset')}
            </button>
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              {t('reports:actions.downloadCSV', 'Download CSV')}
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {activeTab === 'issuances' && <IssuancesReport filters={filters} />}
        {activeTab === 'authorizations' && <AuthorizationsReport filters={filters} />}
        {activeTab === 'compliance' && <ComplianceReport filters={filters} />}
      </div>
    </div>
  )
}

function IssuancesReport({ filters }: { filters: FilterState }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['issuances', filters],
    queryFn: async () => {
      const params: any = {
        limit: 100,
        offset: 0
      }
      
      if (filters.status !== 'all') {
        params.status = filters.status
      }
      
      if (filters.holder) {
        params.holder = filters.holder
      }

      const response = await api.GET('/v1/issuances', { params: { query: params } })
      return response.data
    }
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Clock className="h-4 w-4 text-emerald-500" />
      case 'VALIDATED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status) {
      case 'SUBMITTED':
        return `${baseClasses} bg-emerald-100 text-emerald-800`
      case 'VALIDATED':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'FAILED':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg">Error loading issuances</div>
          <div className="text-gray-400 text-sm mt-2">Please try again later</div>
        </div>
      </div>
    )
  }

  const issuances = data?.items || []

  return (
    <div className="overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Issuances Report</h3>
        <p className="text-sm text-gray-600 mt-1">
          {issuances.length} issuance{issuances.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {issuances.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-gray-500 text-lg">No issuances found</div>
          <div className="text-gray-400 text-sm mt-2">Try adjusting your filters</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To (Holder)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                             {issuances.map((issuance: IssuanceRecord) => (
                 <tr key={issuance.id || 'unknown'} className="hover:bg-gray-50">
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {issuance.createdAt ? formatDate(issuance.createdAt) : '-'}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                       {issuance.assetRef || 'Unknown'}
                     </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="text-sm text-gray-900 font-mono">
                       {issuance.to ? (
                         issuance.to.length > 20 
                           ? `${issuance.to.substring(0, 10)}...${issuance.to.substring(issuance.to.length - 10)}`
                           : issuance.to
                       ) : 'Unknown'}
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                     {issuance.amount ? formatAmount(issuance.amount) : '0'}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     {issuance.status ? (
                       <span className={getStatusBadge(issuance.status)}>
                         {getStatusIcon(issuance.status)}
                         <span className="ml-1">{issuance.status}</span>
                       </span>
                     ) : (
                       <span className="text-gray-400">-</span>
                     )}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     {issuance.txId ? (
                       <a
                         href={`https://testnet.xrpl.org/transactions/${issuance.txId}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="inline-flex items-center text-blue-600 hover:text-blue-800"
                       >
                         {issuance.txId.substring(0, 8)}...
                         <ExternalLink className="h-3 w-3 ml-1" />
                       </a>
                     ) : (
                       <span className="text-gray-400">-</span>
                     )}
                   </td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AuthorizationsReport({ filters }: { filters: FilterState }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['authorizations', filters],
    queryFn: async () => {
      const params: any = {
        limit: 100,
        offset: 0
      }
      
      if (filters.status !== 'all') {
        params.status = filters.status
      }
      
      if (filters.holder) {
        params.holder = filters.holder
      }

      const response = await api.GET('/v1/authorizations', { params: { query: params } })
      return response.data
    }
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatLimit = (limit: string) => {
    return parseFloat(limit).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Clock className="h-4 w-4 text-emerald-500" />
      case 'VALIDATED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status) {
      case 'SUBMITTED':
        return `${baseClasses} bg-emerald-100 text-emerald-800`
      case 'VALIDATED':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'FAILED':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg">Error loading authorizations</div>
          <div className="text-gray-400 text-sm mt-2">Please try again later</div>
        </div>
      </div>
    )
  }

  const authorizations = data?.authorizations || []

  return (
    <div className="overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Authorizations Report</h3>
        <p className="text-sm text-gray-600 mt-1">
          {authorizations.length} authorization{authorizations.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {authorizations.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-gray-500 text-lg">No authorizations found</div>
          <div className="text-gray-400 text-sm mt-2">Try adjusting your filters</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {authorizations.map((auth: any) => (
                <tr key={auth.id || 'unknown'} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {auth.createdAt ? formatDate(auth.createdAt) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {auth.asset?.code || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">
                      {auth.holder ? (
                        auth.holder.length > 20 
                          ? `${auth.holder.substring(0, 10)}...${auth.holder.substring(auth.holder.length - 10)}`
                          : auth.holder
                      ) : 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {auth.limit ? formatLimit(auth.limit) : '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {auth.status ? (
                      <span className={getStatusBadge(auth.status)}>
                        {getStatusIcon(auth.status)}
                        <span className="ml-1">{auth.status}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {auth.txId ? (
                      <a
                        href={`https://testnet.xrpl.org/transactions/${auth.txId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        {auth.txId.substring(0, 8)}...
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ComplianceReport({ filters }: { filters: FilterState }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['compliance-records', filters],
    queryFn: async () => {
      const params: any = {
        page: 1,
        limit: 100
      }
      
      if (filters.status !== 'all') {
        params.status = filters.status
      }
      
      if (filters.holder) {
        params.holder = filters.holder
      }

      const response = await api.GET('/v1/compliance-records', { params: { query: params } })
      return response.data
    }
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'UNVERIFIED':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status) {
      case 'VERIFIED':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'REJECTED':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'UNVERIFIED':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg">Error loading compliance records</div>
          <div className="text-gray-400 text-sm mt-2">Please try again later</div>
        </div>
      </div>
    )
  }

  const records = data?.records || []

  return (
    <div className="overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Compliance Report</h3>
        <p className="text-sm text-gray-600 mt-1">
          {records.length} compliance record{records.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {records.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-gray-500 text-lg">No compliance records found</div>
          <div className="text-gray-400 text-sm mt-2">Try adjusting your filters</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SHA-256</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record: any) => (
                <tr key={record.id || 'unknown'} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.createdAt ? formatDate(record.createdAt) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 font-mono">
                      {record.recordId || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {record.assetRef || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">
                      {record.holder ? (
                        record.holder.length > 20 
                          ? `${record.holder.substring(0, 10)}...${record.holder.substring(record.holder.length - 10)}`
                          : record.holder
                      ) : 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.status ? (
                      <span className={getStatusBadge(record.status)}>
                        {getStatusIcon(record.status)}
                        <span className="ml-1">{record.status}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">
                      {record.sha256 ? (
                        record.sha256.length > 20 
                          ? `${record.sha256.substring(0, 10)}...${record.sha256.substring(record.sha256.length - 10)}`
                          : record.sha256
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.verifiedAt ? formatDate(record.verifiedAt) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
