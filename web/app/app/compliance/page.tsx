'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Shield, Search, Filter, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import CustomDropdown from '../../components/CustomDropdown'
import ModernTooltip from '../../components/ModernTooltip'

interface ComplianceRecord {
  id: string
  recordId: string
  assetId: string
  assetRef: string
  holder: string
  status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'
  sha256: string
  createdAt: string
  verifiedAt?: string
  verifiedBy?: string
}

interface ComplianceListResponse {
  records: ComplianceRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function CompliancePage() {
  const { t } = useTranslation(['compliance', 'common'])
  const router = useRouter()
  const [records, setRecords] = useState<ComplianceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    assetId: '',
    holder: ''
  })

  const fetchRecords = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.assetId && { assetId: filters.assetId }),
        ...(filters.holder && { holder: filters.holder })
      })

      const { data, error } = await api.GET(`/v1/compliance-records?${queryParams}` as any, {})
      
      if (error) {
        throw new Error(error.error || 'Failed to fetch compliance records')
      }

      const response = data as ComplianceListResponse
      setRecords(response.records)
      setPagination(response.pagination)
    } catch (err: any) {
      console.error('Error fetching compliance records:', err)
      setError(err.message || 'Failed to fetch compliance records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [pagination.page, filters])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status) {
      case 'VERIFIED':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'REJECTED':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateHash = (hash: string, length: number = 8) => {
    if (hash.length <= length * 2) return hash
    return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('compliance:title', 'Compliance Management')}</h1>
        <p className="text-gray-600 mt-2">
          {t('compliance:description', 'View and verify compliance records for regulatory oversight.')}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">{t('compliance:page.filters', 'Filters')}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('compliance:filters.status', 'Status')}
            </label>
            <CustomDropdown
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              options={[
                { value: '', label: t('compliance:filters.allStatuses', 'All Statuses') },
                { value: 'UNVERIFIED', label: t('compliance:filters.unverified', 'Unverified') },
                { value: 'VERIFIED', label: t('compliance:filters.verified', 'Verified') },
                { value: 'REJECTED', label: t('compliance:filters.rejected', 'Rejected') }
              ]}
              placeholder={t('compliance:filters.allStatuses', 'All Statuses')}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('compliance:filters.assetId', 'Asset ID')}
            </label>
            <input
              type="text"
              value={filters.assetId}
              onChange={(e) => handleFilterChange('assetId', e.target.value)}
              placeholder={t('compliance:filters.filterByAssetId', 'Filter by asset ID')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('compliance:filters.holderAddress', 'Holder Address')}
            </label>
            <input
              type="text"
              value={filters.holder}
              onChange={(e) => handleFilterChange('holder', e.target.value)}
              placeholder={t('compliance:filters.filterByHolderAddress', 'Filter by holder address')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('compliance:page.complianceRecords', 'Compliance Records')}</h2>
            <div className="text-sm text-gray-500">
              {t('compliance:page.totalRecords', '{{count}} total records', { count: pagination.total })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('compliance:page.loadingComplianceRecords', 'Loading compliance records...')}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-600 mb-2">
              <Shield className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchRecords}
              className="mt-2 px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50"
            >
              {t('compliance:actions.retry', 'Retry')}
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('compliance:messages.noComplianceRecordsFound', 'No compliance records found')}</h3>
            <p className="text-gray-600">
              {Object.values(filters).some(f => f) 
                ? t('compliance:messages.tryAdjustingYourFilters', 'Try adjusting your filters to see more results.')
                : t('compliance:messages.complianceRecordsWillAppear', 'Compliance records will appear here once created.')
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      {t('compliance:table.recordId', 'Record ID')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      {t('compliance:table.asset', 'Asset')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      {t('compliance:table.holder', 'Holder')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      {t('compliance:table.status', 'Status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      {t('compliance:table.created', 'Created')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      {t('compliance:table.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <ModernTooltip content={record.recordId}>
                          <div className="truncate no-native-tooltip" title="">
                            <div className="text-sm font-medium text-gray-900 truncate">{record.recordId}</div>
                          </div>
                        </ModernTooltip>
                      </td>
                      <td className="px-4 py-3">
                        <ModernTooltip content={record.assetRef}>
                          <div className="truncate no-native-tooltip" title="">
                            <div className="text-sm font-medium text-gray-900 truncate">{record.assetRef}</div>
                          </div>
                        </ModernTooltip>
                      </td>
                      <td className="px-4 py-3">
                        <ModernTooltip content={record.holder}>
                          <div className="truncate no-native-tooltip" title="">
                            <div className="text-sm font-medium text-gray-900 truncate font-mono">{record.holder}</div>
                          </div>
                        </ModernTooltip>
                      </td>
                      <td className="px-4 py-3">
                        <span className={getStatusBadge(record.status)}>
                          {getStatusIcon(record.status)}
                          <span className="ml-1 text-xs">{record.status.toLowerCase()}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <ModernTooltip content={formatDate(record.createdAt)}>
                          <div className="truncate no-native-tooltip" title="">
                            {formatDate(record.createdAt)}
                          </div>
                        </ModernTooltip>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/app/compliance/${record.recordId}`)}
                          className="inline-flex items-center justify-center px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors duration-200 border border-gray-200 hover:border-gray-300 whitespace-nowrap"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          {t('compliance:page.view', 'View')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    {t('compliance:pagination.showingResults', 'Showing {{start}} to {{end}} of {{total}} results', {
                      start: ((pagination.page - 1) * pagination.limit) + 1,
                      end: Math.min(pagination.page * pagination.limit, pagination.total),
                      total: pagination.total
                    })}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      {t('compliance:pagination.previous', 'Previous')}
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      {t('compliance:pagination.pageOf', 'Page {{current}} of {{total}}', { current: pagination.page, total: pagination.pages })}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      {t('compliance:pagination.next', 'Next')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
