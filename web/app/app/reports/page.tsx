'use client'
import { useState, useEffect } from 'react'
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
    // For now, use placeholder data since compliance API is not implemented yet
    const headers = ['Created', 'Record ID', 'Asset', 'Holder', 'Status', 'SHA-256', 'Verified At']
    const csvContent = [
      headers.join(','),
      // TODO: Replace with actual compliance data when API is ready
      '2024-01-01 10:00:00,COMP001,USD,rHolder123...,VERIFIED,abc123...,2024-01-01 10:05:00'
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: 'issuances', label: 'Issuances' },
    { id: 'authorizations', label: 'Authorizations' },
    { id: 'compliance', label: 'Compliance' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate reports and export data for compliance and analysis</p>
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
                  ? 'border-blue-500 text-blue-600'
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
            <span className="text-sm font-medium text-gray-700">Date:</span>
            <CustomDropdown
              value={filters.dateRange}
              onChange={(value) => handleFilterChange('dateRange', value)}
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
                { value: 'custom', label: 'Custom range' }
              ]}
              className="w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <CustomDropdown
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'SUBMITTED', label: 'Submitted' },
                { value: 'VALIDATED', label: 'Validated' },
                { value: 'FAILED', label: 'Failed' }
              ]}
              className="w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Holder:</span>
            <input
              type="text"
              value={filters.holder}
              onChange={(e) => handleFilterChange('holder', e.target.value)}
              placeholder="Search holder address..."
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleReset}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </button>
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              Download CSV
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
        return <Clock className="h-4 w-4 text-blue-500" />
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
        return `${baseClasses} bg-blue-100 text-blue-800`
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
        return <Clock className="h-4 w-4 text-blue-500" />
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
        return `${baseClasses} bg-blue-100 text-blue-800`
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
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">Compliance Report</div>
        <div className="text-gray-400 text-sm mt-2">Filters: {JSON.stringify(filters)}</div>
        <div className="text-gray-400 text-sm">Coming soon...</div>
      </div>
    </div>
  )
}
