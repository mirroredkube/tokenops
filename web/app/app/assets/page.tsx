'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'

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
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ledger
            </label>
            <select
              value={filters.ledger}
              onChange={(e) => setFilters(prev => ({ ...prev, ledger: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">All Ledgers</option>
              <option value="xrpl">XRPL</option>
              <option value="stellar">Stellar</option>
              <option value="evm">EVM</option>
              <option value="solana">Solana</option>
              <option value="algorand">Algorand</option>
              <option value="hedera">Hedera</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="retired">Retired</option>
            </select>
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
          <div className="p-8 text-center">
            <p className="text-gray-600">No assets found.</p>
            <p className="text-sm text-gray-500 mt-1">
              {filters.ledger || filters.status ? 'Try adjusting your filters.' : 'Create your first asset to get started.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {assets.map((asset) => (
              <div key={asset.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{asset.code}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {asset.ledger.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {asset.assetRef}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Issuer: {asset.issuer}</span>
                      <span>Decimals: {asset.decimals}</span>
                      <span>Compliance: {getComplianceModeLabel(asset.complianceMode)}</span>
                      <span>Created: {new Date(asset.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/assets/${asset.id}`}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      View
                    </Link>
                    {asset.status === 'draft' && (
                      <Link
                        href={`/app/assets/${asset.id}/edit`}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Edit
                      </Link>
                    )}
                    <Link
                      href={`/app/issuance?assetId=${asset.id}`}
                      className="px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                    >
                      Issue
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
