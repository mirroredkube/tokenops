'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Plus, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import CustomDropdown from '../../../components/CustomDropdown'

interface Authorization {
  id?: string
  assetId?: string
  holder?: string
  limit?: string
  txId?: string
  explorer?: string
  status?: 'PENDING' | 'SUBMITTED' | 'VALIDATED' | 'FAILED' | 'EXPIRED'
  validatedAt?: string
  noRipple?: boolean
  requireAuth?: boolean
  createdAt?: string
  updatedAt?: string
  asset?: {
    id?: string
    code?: string
    assetRef?: string
    ledger?: string
    network?: string
  }
}

export default function AuthorizationHistoryPage() {
  const { t } = useTranslation(['authorizations', 'common'])
  const router = useRouter()
  const [authorizations, setAuthorizations] = useState<Authorization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const limit = 20

  useEffect(() => {
    fetchAuthorizations()
  }, [statusFilter, currentPage])

  const fetchAuthorizations = async () => {
    setLoading(true)
    try {
      const params: any = {
        limit,
        offset: (currentPage - 1) * limit
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }

      const { data, error } = await api.GET('/v1/authorizations', { params })

      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error((error as any).error || t('authorizations:history.messages.failedToFetchAuthorizations', 'Failed to fetch authorizations'))
      }

      if (!data) {
        throw new Error(t('common:messages.noDataReceived', 'No data received'))
      }

      setAuthorizations((data.authorizations || []) as Authorization[])
      setTotalCount(data.pagination?.total || 0)
      setTotalPages(Math.ceil((data.pagination?.total || 0) / limit))
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'SUBMITTED':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'VALIDATED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'EXPIRED':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800'
      case 'VALIDATED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'EXPIRED':
        return 'bg-orange-100 text-orange-800'
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
                   <button
             onClick={() => router.push('/app/authorizations')}
             className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
           >
             <Plus className="h-4 w-4 mr-2" />
             {t('authorizations:actions.newAuthorization', 'New Authorization')}
           </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800">{error}</span>
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
              { value: 'PENDING', label: t('authorizations:history.filters.pending', 'Pending') },
              { value: 'SUBMITTED', label: t('authorizations:history.filters.submitted', 'Submitted') },
              { value: 'VALIDATED', label: t('authorizations:history.filters.validated', 'Validated') },
              { value: 'FAILED', label: t('authorizations:history.filters.failed', 'Failed') },
              { value: 'EXPIRED', label: t('authorizations:history.filters.expired', 'Expired') }
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
                <col className="w-1/6" />
                <col className="w-1/6" />
                <col className="w-1/6" />
                <col className="w-1/6" />
                <col className="w-1/6" />
                <col className="w-1/6" />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('authorizations:history.table.asset', 'Asset')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('authorizations:history.table.holder', 'Holder')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('authorizations:history.table.limit', 'Limit')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('authorizations:history.table.status', 'Status')}</th>
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
                         {auth.holder ? `${auth.holder.substring(0, 8)}...${auth.holder.substring(auth.holder.length - 8)}` : 'Unknown'}
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
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {formatDate(auth.createdAt || new Date().toISOString())}
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        {auth.txId && auth.explorer && (
                          <a
                            href={auth.explorer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t('authorizations:actions.view', 'View')}
                          </a>
                        )}
                                                 <button
                           onClick={() => router.push(`/app/assets/${auth.assetId || ''}`)}
                           className="text-blue-600 hover:text-blue-900"
                         >
                           {t('authorizations:actions.viewAsset', 'View Asset')}
                         </button>
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
              ? t('authorizations:history.messages.noAuthorizationsWithStatus', 'No authorizations with status "{{status}}" found.', { status: statusFilter })
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
