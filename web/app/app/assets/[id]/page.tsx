'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
  controls?: {
    requireAuth?: boolean
    freeze?: boolean
    clawback?: boolean
    transferFeeBps?: number
  }
  registry?: {
    isin?: string
    lei?: string
    micaClass?: string
    jurisdiction?: string
  }
}

export default function AssetDetailsPage() {
  const params = useParams()
  const assetId = params.id as string
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview')
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAsset()
  }, [assetId])

  const fetchAsset = async () => {
    setLoading(true)
    try {
      // TODO: Replace with actual API call when types are fixed
      console.log('Fetching asset:', assetId)
      
      // Mock data for testing
      const mockAsset: Asset = {
        id: assetId,
        assetRef: 'xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.COMP',
        ledger: 'xrpl',
        network: 'testnet',
        issuer: 'rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX',
        code: 'COMP',
        decimals: 6,
        complianceMode: 'RECORD_ONLY',
        status: 'active',
        createdAt: '2025-08-28T10:00:00Z',
        updatedAt: '2025-08-28T10:00:00Z',
        controls: {
          requireAuth: true,
          freeze: false,
          clawback: false,
          transferFeeBps: 0
        },
        registry: {
          isin: 'US0378331005',
          jurisdiction: 'US',
          micaClass: 'Utility Token'
        }
      }
      
      setAsset(mockAsset)
    } catch (err: any) {
      console.error('Error fetching asset:', err)
      setError(err.message || 'Failed to fetch asset')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: 'active' | 'paused' | 'retired') => {
    if (!asset) return
    
    try {
      // TODO: Replace with actual API call
      console.log(`Changing asset ${asset.id} status to ${newStatus}`)
      
      setAsset(prev => prev ? { ...prev, status: newStatus } : null)
    } catch (err: any) {
      setError(`Failed to update status: ${err.message}`)
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // TODO: Add toast notification
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error || !asset) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800">{error || 'Asset not found'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{asset.code}</h1>
            <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(asset.status)}`}>
              {asset.status}
            </span>
            <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
              {asset.ledger.toUpperCase()}/{asset.network}
            </span>
          </div>
          <p className="text-gray-600">
            Asset details and configuration
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          {asset.status === 'active' && (
            <Link
              href={`/app/issuance?assetId=${asset.id}`}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Start Issuance
            </Link>
          )}
          {asset.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('active')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Activate
            </button>
          )}
          {asset.status === 'active' && (
            <button
              onClick={() => handleStatusChange('paused')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Pause
            </button>
          )}
          {(asset.status === 'active' || asset.status === 'paused') && (
            <button
              onClick={() => handleStatusChange('retired')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retire
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Asset Reference */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Asset Reference</h3>
            <div className="flex items-center gap-3">
              <code className="flex-1 p-3 bg-gray-100 rounded text-sm font-mono">
                {asset.assetRef}
              </code>
              <button
                onClick={() => copyToClipboard(asset.assetRef)}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Issuer Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono">
                    {asset.issuer}
                  </code>
                  <button
                    onClick={() => copyToClipboard(asset.issuer)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Decimals</label>
                <p className="mt-1 text-sm text-gray-900">{asset.decimals}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Compliance Mode</label>
                <p className="mt-1 text-sm text-gray-900">{getComplianceModeLabel(asset.complianceMode)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(asset.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Registry Information */}
          {asset.registry && Object.keys(asset.registry).length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Registry Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {asset.registry.isin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ISIN</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.registry.isin}</p>
                  </div>
                )}
                {asset.registry.lei && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">LEI</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.registry.lei}</p>
                  </div>
                )}
                {asset.registry.jurisdiction && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Jurisdiction</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.registry.jurisdiction}</p>
                  </div>
                )}
                {asset.registry.micaClass && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">MiCA Classification</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.registry.micaClass}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coming Soon Placeholders */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Activity</h3>
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">Opt-Ins and Issuances coming in Phase 2</p>
              <p className="text-sm text-gray-500">You'll be able to view opt-in status and issuance history here.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Lifecycle Actions */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Lifecycle Actions</h3>
            <div className="space-y-3">
              {asset.status === 'draft' && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                  <div>
                    <h4 className="font-medium text-blue-900">Activate Asset</h4>
                    <p className="text-sm text-blue-700">Make this asset available for issuance</p>
                  </div>
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Activate
                  </button>
                </div>
              )}
              {asset.status === 'active' && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                  <div>
                    <h4 className="font-medium text-yellow-900">Pause Asset</h4>
                    <p className="text-sm text-yellow-700">Temporarily stop new issuances</p>
                  </div>
                  <button
                    onClick={() => handleStatusChange('paused')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    Pause
                  </button>
                </div>
              )}
              {(asset.status === 'active' || asset.status === 'paused') && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                  <div>
                    <h4 className="font-medium text-red-900">Retire Asset</h4>
                    <p className="text-sm text-red-700">Permanently deactivate this asset</p>
                  </div>
                  <button
                    onClick={() => handleStatusChange('retired')}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Retire
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ledger Controls */}
          {asset.controls && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Ledger Controls</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Require Authorization</h4>
                    <p className="text-sm text-gray-600">Holders must be authorized to hold this asset</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${asset.controls.requireAuth ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {asset.controls.requireAuth ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Freeze</h4>
                    <p className="text-sm text-gray-600">Allow freezing of holder accounts</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${asset.controls.freeze ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {asset.controls.freeze ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Clawback</h4>
                    <p className="text-sm text-gray-600">Allow clawback of tokens from holders</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${asset.controls.clawback ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {asset.controls.clawback ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {asset.controls.transferFeeBps !== undefined && (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Transfer Fee</h4>
                      <p className="text-sm text-gray-600">Fee charged on transfers (basis points)</p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      {asset.controls.transferFeeBps} bps
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Warning */}
          {asset.status !== 'draft' && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <span className="text-yellow-800">
                  This asset can no longer be edited. Only lifecycle actions are available.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
