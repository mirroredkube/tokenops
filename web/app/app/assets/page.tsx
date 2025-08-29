'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import CustomDropdown from '../../components/CustomDropdown'
import { trackPageView, trackAssetAction, AnalyticsEvents } from '../../lib/analytics'

interface Asset {
  id: string
  assetRef: string
  ledger: string
  network: string
  issuer: string
  code: string
  decimals: number
  complianceMode: 'OFF' | 'RECORD_ONLY' | 'GATED_BEFORE'
  status: 'draft' | 'active' | 'paused' | 'retired'
  createdAt: string
  updatedAt?: string
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    ledger: '',
    status: ''
  })

  useEffect(() => {
    fetchAssets()
    // Track page view
    trackPageView('assets_list')
  }, [filters])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const queryParams: any = {}
      if (filters.ledger) queryParams.ledger = filters.ledger
      if (filters.status) queryParams.status = filters.status
      queryParams.limit = 50
      queryParams.offset = 0

      console.log('Fetching assets with params:', queryParams)

      const { data, error } = await api.GET('/v1/assets', {
        params: { query: queryParams }
      })

      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error((error as any).error || 'Failed to fetch assets')
      }

      if (!data || !data.assets) {
        throw new Error('No assets data received')
      }

      console.log('Assets fetched successfully:', data.assets)
      
      // Transform API response to match our Asset interface
      const transformedAssets: Asset[] = data.assets.map((asset: any) => ({
        id: asset.id || '',
        assetRef: asset.assetRef || '',
        ledger: asset.ledger || '',
        network: asset.network || '',
        issuer: asset.issuer || '',
        code: asset.code || '',
        decimals: asset.decimals || 0,
        complianceMode: asset.complianceMode || 'RECORD_ONLY',
        status: asset.status || 'draft',
        createdAt: asset.createdAt || new Date().toISOString(),
        updatedAt: asset.updatedAt
      }))
      
      setAssets(transformedAssets)
    } catch (err: any) {
      console.error('Error fetching assets:', err)
      setError(err.message || 'Failed to fetch assets')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'retired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getComplianceModeLabel = (mode: string) => {
    switch (mode) {
      case 'OFF': return 'No Compliance'
      case 'RECORD_ONLY': return 'Record Only'
      case 'GATED_BEFORE': return 'Gated Before'
      default: return mode
    }
  }

  const handleStatusChange = async (assetId: string, newStatus: 'active' | 'paused' | 'retired') => {
    try {
      console.log(`Changing asset ${assetId} status to ${newStatus}`)

      // Call the backend API to update the asset status
      const { data, error } = await api.PUT(`/v1/assets/${assetId}` as any, {
        body: {
          status: newStatus
        }
      })

      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error((error as any).error || 'Failed to update asset status')
      }

      if (!data) {
        throw new Error('No response data received')
      }

      console.log('Asset status updated successfully:', data)
      
      // Update local state with the new data from the API
      setAssets(prev => prev.map(asset => 
        asset.id === assetId ? { 
          ...asset, 
          status: (data as any).status || newStatus,
          updatedAt: (data as any).updatedAt || new Date().toISOString()
        } : asset
      ))
      
      // Track analytics
      trackAssetAction(AnalyticsEvents[`ASSET_${newStatus.toUpperCase()}` as keyof typeof AnalyticsEvents], assetId, {
        new_status: newStatus
      })
      
      // Show success message
      const statusLabels = {
        'active': 'activated',
        'paused': 'paused',
        'retired': 'retired'
      }
      setSuccessMessage(`Asset successfully ${statusLabels[newStatus]}`)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Error updating asset status:', err)
      setError(`Failed to update status: ${err.message}`)
    }
  }

  const canActivate = (status: string) => status === 'draft' || status === 'paused'
  const canPause = (status: string) => status === 'active'
  const canRetire = (status: string) => status === 'active' || status === 'paused'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Assets</h1>
          <p className="text-gray-600 mt-2">
            Manage your token assets across multiple ledgers.
          </p>
        </div>
        <Link
          href="/app/assets/create"          className="w-10 h-10 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center transition-colors duration-200"
          title="Create Asset"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span className="text-green-800">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ledger
            </label>
            <CustomDropdown
              value={filters.ledger}
              onChange={(value) => setFilters(prev => ({ ...prev, ledger: value }))}
              options={[
                { value: '', label: 'All Ledgers' },
                { value: 'xrpl', label: 'XRPL' },
                { value: 'hedera', label: 'Hedera' },
                { value: 'ethereum', label: 'Ethereum' }
              ]}
              placeholder="All Ledgers"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <CustomDropdown
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'active', label: 'Active' },
                { value: 'paused', label: 'Paused' },
                { value: 'retired', label: 'Retired' }
              ]}
              placeholder="All Statuses"
            />
          </div>
        </div>
      </div>

      {/* Assets List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading assets...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filters.ledger || filters.status ? 'No assets match your filters' : 'No assets yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {filters.ledger || filters.status 
                ? 'Try adjusting your filters to see more assets.' 
                : 'Create your first asset to begin issuing tokens.'
              }
            </p>
            {!filters.ledger && !filters.status && (
              <Link
                href="/app/assets/create"
                className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Asset
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ledger/Net
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compliance Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{asset.code}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{asset.assetRef}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {asset.ledger.toUpperCase()}/{asset.network}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getComplianceModeLabel(asset.complianceMode)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/app/assets/${asset.id}`}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        
                        {/* Status Actions */}
                        {canActivate(asset.status) && (
                          <button
                            onClick={() => handleStatusChange(asset.id, 'active')}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200"
                            title="Activate Asset"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        {canPause(asset.status) && (
                          <button
                            onClick={() => handleStatusChange(asset.id, 'paused')}
                            className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors duration-200"
                            title="Pause Asset"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {canRetire(asset.status) && (
                          <button
                            onClick={() => handleStatusChange(asset.id, 'retired')}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                            title="Retire Asset"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Issue Action */}
                        {asset.status === 'active' && (
                          <Link
                            href={`/app/issuance/new?assetId=${asset.id}`}
                            className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors duration-200"
                            title="Issue Tokens"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
