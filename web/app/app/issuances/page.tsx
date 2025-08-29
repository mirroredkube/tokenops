'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  Eye, 
  ExternalLink, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react'
import ModernTooltip from '../../components/ModernTooltip'
import CustomDropdown from '../../components/CustomDropdown'
import InfoPopup from '../../components/InfoPopup'

interface Issuance {
  id: string
  assetId: string
  assetRef: string
  to: string
  amount: string
  txId?: string
  status: string
  validatedAt?: string
  validatedLedgerIndex?: number
  failureCode?: string
  createdAt: string
  updatedAt: string
}

interface IssuanceListResponse {
  items: Issuance[]
  total: number
  limit: number
  offset: number
}

export default function IssuancesPage() {
  const router = useRouter()
  const [issuances, setIssuances] = useState<Issuance[]>([])
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
    assetId: ''
  })

  const fetchIssuances = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: ((pagination.page - 1) * pagination.limit).toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.assetId && { assetId: filters.assetId })
      })

      const { data, error } = await api.GET(`/v1/issuances?${queryParams}` as any, {})
      
      if (error) {
        throw new Error(error.error || 'Failed to fetch issuances')
      }

      const response = data as IssuanceListResponse
      setIssuances(response.items || [])
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
        pages: Math.ceil((response.total || 0) / pagination.limit)
      }))
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
      // Call the API with refresh=true to trigger status check
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
      // Could show a toast notification here
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'validated':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status.toLowerCase()) {
      case 'validated':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'submitted':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'validated':
        return 'Confirmed on ledger'
      case 'failed':
        return 'Not confirmed (e.g., expired). See explorer.'
      case 'submitted':
        return 'Awaiting ledger validation (≈ 3–5s)'
      default:
        return status
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

  const truncateAddress = (address: string, length: number = 8) => {
    if (address.length <= length * 2) return address
    return `${address.substring(0, length)}...${address.substring(address.length - length)}`
  }

  const getCurrencyCode = (assetRef: string) => {
    return assetRef?.split(':').pop()?.split('.').pop() || 'Unknown'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Token Issuances</h1>
        <p className="text-gray-600 mt-2">
          View all token issuances across all assets.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <InfoPopup title="Issuance Status Meanings">
                <div className="space-y-4">
                  {/* Status Definitions */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <div>
                        <div className="font-semibold text-yellow-800">Pending</div>
                        <div className="text-sm text-yellow-700">Created but not yet submitted to blockchain</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-semibold text-blue-800">Submitted</div>
                        <div className="text-sm text-blue-700">Transaction sent to XRPL network, waiting for validation</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-semibold text-green-800">Validated</div>
                        <div className="text-sm text-green-700">Successfully confirmed and tokens issued</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <div className="font-semibold text-red-800">Failed</div>
                        <div className="text-sm text-red-700">Transaction failed, no tokens issued</div>
                      </div>
                    </div>
                  </div>

                  {/* Flow Diagram */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Typical Issuance Flow:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-center">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div className="font-medium text-gray-700">Pending</div>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
                        <div className="text-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="font-medium text-gray-700">Submitted</div>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
                        <div className="text-center">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="font-medium text-gray-700">Validated</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800">
                      <strong>Note:</strong> Most transactions complete in 3-5 seconds on XRPL. 
                      Failed transactions may need to be retried.
                    </div>
                  </div>
                </div>
              </InfoPopup>
            </div>
            <CustomDropdown
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'validated', label: 'Validated' },
                { value: 'failed', label: 'Failed' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset ID
            </label>
            <input
              type="text"
              value={filters.assetId}
              onChange={(e) => handleFilterChange('assetId', e.target.value)}
              placeholder="Filter by asset ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Issuances Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">All Issuances</h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {issuances.length} of {pagination.total} issuances
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading issuances...</p>
          </div>
        ) : issuances.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No issuances found. Create your first issuance to see it here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issuances.map((issuance) => (
                  <tr key={issuance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getCurrencyCode(issuance.assetRef)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {issuance.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      <ModernTooltip content={issuance.to}>
                        <div className="truncate no-native-tooltip" title="">
                          {truncateAddress(issuance.to)}
                        </div>
                      </ModernTooltip>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={getStatusBadge(issuance.status)}>
                          {getStatusIcon(issuance.status)}
                          <span className="ml-1">{getStatusText(issuance.status)}</span>
                        </span>
                        {issuance.status === 'submitted' && (
                          <button
                            onClick={() => handleRefreshStatus(issuance.id, issuance.assetId)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Refresh status from ledger"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {issuance.updatedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Last checked: {formatDate(issuance.updatedAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                        <span className="text-gray-500">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <ModernTooltip content={formatDate(issuance.createdAt)}>
                        <div className="truncate no-native-tooltip" title="">
                          {formatDate(issuance.createdAt)}
                        </div>
                      </ModernTooltip>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/app/assets/${issuance.assetId}`)}
                        className="inline-flex items-center justify-center px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors duration-200 border border-gray-200 hover:border-gray-300 whitespace-nowrap"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Asset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
