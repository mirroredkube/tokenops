'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import CustomDropdown from '../../components/CustomDropdown'

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
  const [filters, setFilters] = useState({
    ledger: '',
    status: ''
  })

  useEffect(() => {
    fetchAssets()
  }, [filters])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      // TODO: Replace with actual API call when types are fixed
      // For now, use mock data to test the UI
      const mockAssets: Asset[] = [
        {
          id: 'asset_123',
          assetRef: 'xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.COMP',
          ledger: 'xrpl',
          network: 'testnet',
          issuer: 'rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX',
          code: 'COMP',
          decimals: 6,
          complianceMode: 'RECORD_ONLY',
          status: 'active',
          createdAt: '2025-08-28T10:00:00Z'
        },
        {
          id: 'asset_456',
          assetRef: 'xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.USD',
          ledger: 'xrpl',
          network: 'testnet',
          issuer: 'rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX',
          code: 'USD',
          decimals: 6,
          complianceMode: 'GATED_BEFORE',
          status: 'draft',
          createdAt: '2025-08-27T15:30:00Z'
        },
        {
          id: 'asset_789',
          assetRef: 'ethereum:testnet/erc20:0x1234567890123456789012345678901234567890.USDC',
          ledger: 'ethereum',
          network: 'testnet',
          issuer: '0x1234567890123456789012345678901234567890',
          code: 'USDC',
          decimals: 6,
          complianceMode: 'OFF',
          status: 'paused',
          createdAt: '2025-08-26T09:15:00Z'
        }
      ]
      
      // Filter mock data
      let filteredAssets = mockAssets
      if (filters.ledger) {
        filteredAssets = filteredAssets.filter(asset => asset.ledger === filters.ledger)
      }
      if (filters.status) {
        filteredAssets = filteredAssets.filter(asset => asset.status === filters.status)
      }
      
      setAssets(filteredAssets)
    } catch (err: any) {
      setError(err.message)
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
      // TODO: Replace with actual API call
      console.log(`Changing asset ${assetId} status to ${newStatus}`)
      
      // Update local state
      setAssets(prev => prev.map(asset => 
        asset.id === assetId ? { ...asset, status: newStatus } : asset
      ))
    } catch (err: any) {
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
          href="/app/assets/create"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Create Asset
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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
              >
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
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/app/assets/${asset.id}`}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          View
                        </Link>
                        
                        {/* Status Actions */}
                        {canActivate(asset.status) && (
                          <button
                            onClick={() => handleStatusChange(asset.id, 'active')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Activate
                          </button>
                        )}
                        {canPause(asset.status) && (
                          <button
                            onClick={() => handleStatusChange(asset.id, 'paused')}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Pause
                          </button>
                        )}
                        {canRetire(asset.status) && (
                          <button
                            onClick={() => handleStatusChange(asset.id, 'retired')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Retire
                          </button>
                        )}
                        
                        {/* Issue Action */}
                        {asset.status === 'active' && (
                          <Link
                            href={`/app/issuance?assetId=${asset.id}`}
                            className="text-emerald-600 hover:text-emerald-900"
                          >
                            Issue
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
