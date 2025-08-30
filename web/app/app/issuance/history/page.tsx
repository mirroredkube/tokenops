'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Eye, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Plus } from 'lucide-react'
import CustomDropdown from '../../../components/CustomDropdown'
import InfoPopup from '../../../components/InfoPopup'

interface Issuance {
  id: string
  assetId: string
  assetRef: string
  to: string
  amount: string
  txId?: string
  status: string
  createdAt: string
  updatedAt: string
  validatedAt?: string
  validatedLedgerIndex?: number
  failureCode?: string
}

interface IssuanceListResponse {
  items: Issuance[]
  total: number
}

export default function IssuanceHistoryPage() {
  const { t } = useTranslation(['issuances', 'common'])
  const router = useRouter()
  const [issuances, setIssuances] = useState<Issuance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  })
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    assetId: ''
  })

  const fetchIssuances = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.assetId && { assetId: filters.assetId })
      })

      const { data, error } = await api.GET(`/v1/issuances?${queryParams}` as any, {})
      
      if (error) {
        throw new Error(error.error || 'Failed to fetch issuances')
      }

      const response = data as IssuanceListResponse
      setIssuances(response.items || [])
      setPagination(prev => ({ ...prev, total: response.total }))
    } catch (err: any) {
      console.error('Error fetching issuances:', err)
      setError(err.message || 'Failed to fetch issuances')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIssuances()
  }, [pagination.page, filters])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleRefreshStatus = async (issuanceId: string, assetId: string) => {
    try {
      const { data, error } = await api.GET(`/v1/assets/${assetId}/issuances/${issuanceId}?refresh=true` as any, {})
      
      if (error) {
        throw new Error(error.error || 'Failed to refresh status')
      }

      // Update the issuance in the list
      setIssuances(prev => prev.map(issuance => 
        issuance.id === issuanceId 
          ? { ...issuance, ...data }
          : issuance
      ))
    } catch (err: any) {
      console.error('Error refreshing status:', err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'validated':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'submitted':
        return 'bg-blue-100 text-blue-800'
      case 'validated':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'expired':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCurrencyCode = (assetRef: string) => {
    return assetRef?.split(':').pop()?.split('.').pop() || 'Unknown'
  }

  const truncateAddress = (address: string, length: number = 8) => {
    if (address.length <= length * 2) return address
    return `${address.substring(0, length)}...${address.substring(address.length - length)}`
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

  const statusOptions = [
    { value: '', label: t('issuances:filters.allStatuses', 'All Statuses') },
    { value: 'pending', label: t('issuances:statusInfo.pending.title', 'Pending') },
    { value: 'submitted', label: t('issuances:statusInfo.submitted.title', 'Submitted') },
    { value: 'validated', label: t('issuances:statusInfo.validated.title', 'Validated') },
    { value: 'failed', label: t('issuances:statusInfo.failed.title', 'Failed') },
    { value: 'expired', label: t('issuances:status.expired', 'Expired') }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('issuances:pages.history.title', 'Issuance History')}</h1>
          <p className="text-gray-600 mt-1">{t('issuances:pages.history.description', 'View and manage all asset issuance transactions')}</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('issuances:pages.history.title', 'Issuance History')}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">{t('issuances:pages.history.description', 'View and manage all asset issuance transactions')}</p>
                        <InfoPopup title={t('issuances:pages.history.issuanceStatuses', 'Issuance Statuses')}>
              <div className="space-y-4">
                <p>{t('issuances:pages.history.understandingStates', 'Understanding the different states of an asset issuance:')}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span><strong>{t('issuances:statusInfo.pending.title', 'Pending')}:</strong> {t('issuances:statusInfo.pending.description', 'Issuance created but not yet submitted to ledger')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span><strong>{t('issuances:statusInfo.submitted.title', 'Submitted')}:</strong> {t('issuances:statusInfo.submitted.description', 'Issuance submitted to ledger, waiting for validation')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>{t('issuances:statusInfo.validated.title', 'Validated')}:</strong> {t('issuances:statusInfo.validated.description', 'Issuance successfully validated on the ledger')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span><strong>{t('issuances:statusInfo.failed.title', 'Failed')}:</strong> {t('issuances:statusInfo.failed.description', 'Issuance failed on the ledger')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span><strong>{t('issuances:status.expired', 'Expired')}:</strong> {t('issuances:statusInfo.expired.description', 'Issuance expired before validation')}</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{t('common:note', 'Note')}:</strong> {t('issuances:pages.history.note', 'There may be a delay between submission and ledger validation. Use the refresh button to check the latest status.')}
                  </p>
                </div>
              </div>
            </InfoPopup>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push('/app/issuance/new')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('issuances:pages.history.newIssuance', 'New Issuance')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('issuances:filters.status', 'Status')}</label>
            <CustomDropdown
              options={statusOptions}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              placeholder={t('issuances:filters.filterByStatus', 'Filter by status')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('issuances:filters.assetId', 'Asset ID')}</label>
            <input
              type="text"
              value={filters.assetId}
              onChange={(e) => handleFilterChange('assetId', e.target.value)}
              placeholder={t('issuances:filters.filterByAssetId', 'Filter by asset ID')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('issuances:page.allIssuances', 'All Issuances')} ({pagination.total})
            </h2>
          </div>
        </div>

        {error ? (
          <div className="p-6 text-center text-red-600">
            {error}
          </div>
        ) : issuances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>{t('issuances:pages.history.noIssuancesFound', 'No issuances found matching your criteria.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <colgroup>
                <col className="w-20" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-24" />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('issuances:table.currency', 'Currency')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('issuances:table.amount', 'Amount')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('issuances:table.destination', 'Destination')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('issuances:table.status', 'Status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('issuances:table.date', 'Date')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('issuances:table.transaction', 'Transaction')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('issuances:table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issuances.map((issuance) => (
                  <tr key={issuance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getCurrencyCode(issuance.assetRef)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {parseFloat(issuance.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {truncateAddress(issuance.to)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(issuance.status)}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issuance.status)}`}>
                          {issuance.status}
                        </span>
                        {issuance.status.toLowerCase() === 'submitted' && (
                          <button
                            onClick={() => handleRefreshStatus(issuance.id, issuance.assetId)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title={t('issuances:pages.history.refreshStatus', 'Refresh status')}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {issuance.validatedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          {t('issuances:statusInfo.validated.title', 'Validated')}: {formatDate(issuance.validatedAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(issuance.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {issuance.txId ? (
                        <a
                          href={`https://testnet.xrpl.org/transactions/${issuance.txId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {issuance.txId.substring(0, 8)}...
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => router.push(`/app/assets/${issuance.assetId}`)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title={t('issuances:actions.viewAsset', 'View Asset')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {t('issuances:pages.history.showingResults', 'Showing {{start}} to {{end}} of {{total}} issuances', {
                  start: ((pagination.page - 1) * pagination.limit) + 1,
                  end: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total
                })}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  {t('issuances:pages.history.previous', 'Previous')}
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  {t('issuances:pages.history.next', 'Next')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
