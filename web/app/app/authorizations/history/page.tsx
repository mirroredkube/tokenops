'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Plus, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink, Check, X } from 'lucide-react'
import CustomDropdown from '../../../components/CustomDropdown'
import { CanCreateAuthorizations, CanApproveAuthorizations, NotViewerOnly } from '../../../components/RoleGuard'

interface Authorization {
  id?: string
  assetId?: string
  holderAddress?: string
  limit?: string
  txHash?: string
  status?: 'HOLDER_REQUESTED' | 'AWAITING_ISSUER_AUTHORIZATION' | 'ISSUER_AUTHORIZED' | 'EXTERNAL' | 'LIMIT_UPDATED' | 'TRUSTLINE_CLOSED' | 'FROZEN' | 'UNFROZEN'
  initiatedBy?: 'HOLDER' | 'ISSUER' | 'SYSTEM'
  external?: boolean
  externalSource?: string
  createdAt?: string
  updatedAt?: string
  asset?: {
    id?: string
    code?: string
    assetRef?: string
    ledger?: string
    network?: string
    issuingAddress?: {
      address?: string
    }
  }
}

export default function AuthorizationHistoryPage() {
  const { t } = useTranslation(['authorizations', 'common'])
  const router = useRouter()
  const [authorizations, setAuthorizations] = useState<Authorization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [authorizingId, setAuthorizingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const limit = 20

  useEffect(() => {
    fetchAuthorizations()
  }, [statusFilter, currentPage])

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Auto-dismiss success after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const fetchAuthorizations = async () => {
    setLoading(true)
    try {
      const params: any = {
        limit,
        offset: (currentPage - 1) * limit
      }
      
      // Map UI status filter to API status values
      if (statusFilter === 'HOLDER_REQUESTED') {
        // For HOLDER_REQUESTED, we need to check both Authorization table and pending AuthorizationRequest table
        // Don't filter Authorization table, we'll handle it manually
      } else if (statusFilter !== 'all') {
        params.status = statusFilter
      }

      // Fetch authorizations and pending authorization requests
      const [authorizationsResponse, requestsResponse] = await Promise.all([
        api.GET('/v1/authorizations', { params }),
        fetch(`http://localhost:4000/v1/authorization-requests?status=INVITED`)
      ])

      if (authorizationsResponse.error) {
        throw new Error(t('authorizations:history.messages.failedToFetchAuthorizations', 'Failed to fetch authorizations'))
      }

      if (!authorizationsResponse.data) {
        throw new Error(t('common:messages.noDataReceived', 'No data received'))
      }

      // Get only pending authorization requests (INVITED status)
      let pendingRequests: any[] = []
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json()
        pendingRequests = requestsData.filter((req: any) => req.status === 'INVITED')
      }

      // Convert pending authorization requests to authorization format for display
      const convertedRequests: Authorization[] = pendingRequests.map((req: any) => ({
        id: req.id,
        assetId: req.assetId,
        holderAddress: req.holderAddress,
        limit: req.requestedLimit,
        status: 'HOLDER_REQUESTED' as const,
        initiatedBy: 'HOLDER' as const,
        createdAt: req.createdAt,
        asset: {
          id: req.asset.id,
          code: req.asset.code,
          ledger: req.asset.ledger,
          network: req.asset.network,
          issuingAddress: {
            address: req.asset.issuingAddress.address
          }
        }
      }))

      // Filter authorizations based on status if needed
      let filteredAuthorizations = authorizationsResponse.data.authorizations || []
      if (statusFilter === 'HOLDER_REQUESTED') {
        // Only show HOLDER_REQUESTED status from Authorization table
        filteredAuthorizations = filteredAuthorizations.filter((auth: any) => auth.status === 'HOLDER_REQUESTED')
      }

      // Combine and sort by creation date
      const allAuthorizations = [
        ...filteredAuthorizations,
        ...convertedRequests
      ].sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())

      setAuthorizations(allAuthorizations as Authorization[])
      setTotalCount(allAuthorizations.length)
      setTotalPages(Math.ceil(allAuthorizations.length / limit))
    } catch (err: any) {
      console.error('Error fetching authorizations:', err)
      setError(err.message || t('authorizations:history.messages.failedToFetchAuthorizations', 'Failed to fetch authorizations'))
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handleIssuerAuthorize = async (authorizationId: string) => {
    try {
      setAuthorizingId(authorizationId)
      setError(null)
      setSuccess(null)
      
      const response = await fetch(`http://localhost:4000/v1/authorizations/${authorizationId}/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to authorize trustline as issuer')
      }
      
      const result = await response.json()
      
      // Refresh the authorizations list
      await fetchAuthorizations()
      
      // Show success message with transaction details
      setSuccess(`✅ Trustline authorized successfully! Transaction: ${result.txId || 'Completed'}`)
      console.log('Issuer authorization successful:', result)
    } catch (error: any) {
      console.error('Issuer authorization failed:', error)
      setError(error.message || 'Failed to authorize trustline as issuer')
    } finally {
      setAuthorizingId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HOLDER_REQUESTED':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'AWAITING_ISSUER_AUTHORIZATION':
        return <Clock className="h-4 w-4 text-orange-600" />
      case 'ISSUER_AUTHORIZED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'EXTERNAL':
        return <ExternalLink className="h-4 w-4 text-blue-600" />
      case 'LIMIT_UPDATED':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'TRUSTLINE_CLOSED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'FROZEN':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'UNFROZEN':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HOLDER_REQUESTED':
        return 'bg-yellow-100 text-yellow-800'
      case 'AWAITING_ISSUER_AUTHORIZATION':
        return 'bg-orange-100 text-orange-800'
      case 'ISSUER_AUTHORIZED':
        return 'bg-green-100 text-green-800'
      case 'EXTERNAL':
        return 'bg-blue-100 text-blue-800'
      case 'LIMIT_UPDATED':
        return 'bg-blue-100 text-blue-800'
      case 'TRUSTLINE_CLOSED':
        return 'bg-red-100 text-red-800'
      case 'FROZEN':
        return 'bg-orange-100 text-orange-800'
      case 'UNFROZEN':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

  const formatLimit = (limit: string) => {
    const num = parseFloat(limit)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  if (loading && authorizations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('authorizations:history.title', 'Authorization History')}</h1>
            <p className="text-gray-600 mt-1">{t('authorizations:history.description', 'View and manage all asset authorization transactions')}</p>
          </div>
          <button
            onClick={() => router.push('/app/authorizations')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('authorizations:actions.newAuthorization', 'New Authorization')}
          </button>
        </div>
        
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('authorizations:history.messages.loadingAuthorizations', 'Loading authorizations...')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Authorization History</h1>
          <p className="text-gray-600 mt-1">View and manage all asset authorization transactions</p>
        </div>
        <CanCreateAuthorizations fallback={null}>
          <button
            onClick={() => router.push('/app/authorizations')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('authorizations:actions.newAuthorization', 'New Authorization')}
          </button>
        </CanCreateAuthorizations>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <span className="text-red-800">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
              aria-label="Close error message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">🎉</span>
              <span className="text-green-800">{success}</span>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-400 hover:text-green-600 transition-colors"
              aria-label="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{t('authorizations:history.filters.status', 'Status:')}</span>
          <CustomDropdown
            value={statusFilter}
            onChange={handleFilterChange}
            options={[
              { value: 'all', label: t('authorizations:history.filters.allStatuses', 'All Statuses') },
              { value: 'HOLDER_REQUESTED', label: t('authorizations:history.filters.holderRequested', 'Holder Requested') },
              { value: 'AWAITING_ISSUER_AUTHORIZATION', label: t('authorizations:history.filters.awaitingIssuerAuthorization', 'Awaiting Issuer Authorization') },
              { value: 'ISSUER_AUTHORIZED', label: t('authorizations:history.filters.issuerAuthorized', 'Issuer Authorized') },
              { value: 'EXTERNAL', label: t('authorizations:history.filters.external', 'External') },
              { value: 'LIMIT_UPDATED', label: t('authorizations:history.filters.limitUpdated', 'Limit Updated') },
              { value: 'TRUSTLINE_CLOSED', label: t('authorizations:history.filters.trustlineClosed', 'Trustline Closed') }
            ]}
            className="w-48"
          />
        </div>
        
        <div className="text-sm text-gray-600">
          {totalCount > 0 ? t('authorizations:history.messages.authorizationsFound', '{{count}} authorization{{plural}} found', { count: totalCount, plural: totalCount !== 1 ? 's' : '' }) : t('authorizations:history.messages.noAuthorizationsFound', 'No authorizations found')}
        </div>
      </div>

      {/* Authorizations Table */}
      {authorizations.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <colgroup>
                <col className="w-1/7" />
                <col className="w-1/7" />
                <col className="w-1/7" />
                <col className="w-1/7" />
                <col className="w-1/7" />
                <col className="w-1/7" />
                <col className="w-1/7" />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('authorizations:history.table.asset', 'Asset')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('authorizations:history.table.holder', 'Holder')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('authorizations:history.table.limit', 'Limit')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('authorizations:history.table.status', 'Status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('authorizations:history.table.created', 'Created')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('authorizations:history.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {authorizations.map((auth) => (
                  <tr key={auth.id} className="hover:bg-gray-50">
                                         <td className="px-6 py-4 whitespace-nowrap">
                       <div>
                         <div className="text-sm font-medium text-gray-900">{auth.asset?.code || 'Unknown'}</div>
                         <div className="text-xs text-gray-500">{auth.asset?.ledger || 'Unknown'}/{auth.asset?.network || 'Unknown'}</div>
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm text-gray-900 font-mono">
                         {auth.holderAddress ? `${auth.holderAddress.substring(0, 8)}...${auth.holderAddress.substring(auth.holderAddress.length - 8)}` : 'Unknown'}
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <span className="text-sm text-gray-900">{formatLimit(auth.limit || '0')}</span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center gap-2">
                         {getStatusIcon(auth.status || 'PENDING')}
                         <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(auth.status || 'PENDING')}`}>
                           {auth.status || 'PENDING'}
                         </span>
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center gap-2">
                         {auth.external ? (
                           <div className="flex items-center gap-1">
                             <ExternalLink className="h-3 w-3 text-orange-500" />
                             <span className="text-xs text-orange-600 font-medium">External</span>
                             {auth.externalSource && (
                               <span className="text-xs text-gray-500">({auth.externalSource})</span>
                             )}
                           </div>
                         ) : (
                           <div className="flex items-center gap-1">
                             <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                             <span className="text-xs text-green-600 font-medium">Platform</span>
                           </div>
                         )}
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {formatDate(auth.createdAt || new Date().toISOString())}
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        {auth.txHash && (
                          <a
                            href={`https://testnet.xrpl.org/transactions/${auth.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t('authorizations:actions.view', 'View')}
                          </a>
                        )}
                        {auth.status === 'AWAITING_ISSUER_AUTHORIZATION' && auth.id && (
                          <CanApproveAuthorizations fallback={null}>
                            <button
                              onClick={() => handleIssuerAuthorize(auth.id!)}
                              disabled={authorizingId === auth.id}
                              className={`inline-flex items-center px-3 py-1 text-xs font-medium border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${
                                authorizingId === auth.id
                                  ? 'text-white bg-emerald-400 cursor-not-allowed'
                                  : 'text-white bg-emerald-600 hover:bg-emerald-700 hover:scale-105 focus:ring-emerald-500 active:scale-95'
                              }`}
                              title="Authorize trustline as issuer (tfSetfAuth)"
                            >
                              {authorizingId === auth.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                  Authorizing...
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Authorize Trustline
                                </>
                              )}
                            </button>
                          </CanApproveAuthorizations>
                        )}
                        <NotViewerOnly fallback={null}>
                          <button
                            onClick={() => router.push(`/app/assets/${auth.assetId || ''}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {t('authorizations:actions.viewAsset', 'View Asset')}
                          </button>
                        </NotViewerOnly>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-6">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('authorizations:history.messages.noAuthorizationsFound', 'No Authorizations Found')}</h3>
          <p className="text-gray-600 mb-6">
            {statusFilter !== 'all' 
              ? t('authorizations:history.messages.noAuthorizationsWithStatus', 'No authorizations with status "{{status}}" found.', { status: statusFilter || 'unknown' })
              : t('authorizations:history.messages.noAuthorizationRecords', 'No authorization records found. Create your first authorization to get started.')
            }
          </p>
          <button
            onClick={() => router.push('/app/authorizations')}
            className="inline-flex items-center px-6 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('authorizations:actions.createAuthorization', 'Create Authorization')}
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {t('authorizations:history.messages.showingResults', 'Showing {{start}} to {{end}} of {{total}} results', { 
              start: ((currentPage - 1) * limit) + 1, 
              end: Math.min(currentPage * limit, totalCount), 
              total: totalCount 
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('authorizations:history.messages.previous', 'Previous')}
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">
              {t('authorizations:history.messages.pageOf', 'Page {{current}} of {{total}}', { current: currentPage, total: totalPages })}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('authorizations:history.messages.next', 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
