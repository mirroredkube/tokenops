'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import Link from 'next/link'
import ConfirmationDialog from '../../../components/ConfirmationDialog'
import { useToast } from '../../../components/Toast'
import { trackCopyAction, trackAssetAction, AnalyticsEvents, trackPageView } from '../../../lib/analytics'
import { Copy } from 'lucide-react'

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
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean
    action: string
    title: string
    message: string
    variant: 'danger' | 'warning' | 'info'
  }>({
    isOpen: false,
    action: '',
    title: '',
    message: '',
    variant: 'info'
  })
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchAsset()
    // Track page view
    if (assetId) {
      trackPageView('asset_details', { asset_id: assetId })
    }
  }, [assetId])

  const fetchAsset = async () => {
    setLoading(true)
    try {
      console.log('Fetching asset:', assetId)

      const { data, error } = await api.GET(`/v1/assets/${assetId}` as any, {})

      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error((error as any).error || 'Failed to fetch asset')
      }

      if (!data) {
        throw new Error('No asset data received')
      }

      console.log('Asset fetched successfully:', data)
      
      // Transform API response to match our Asset interface
      const transformedAsset: Asset = {
        id: (data as any).id || assetId,
        assetRef: (data as any).assetRef || '',
        ledger: (data as any).ledger || '',
        network: (data as any).network || '',
        issuer: (data as any).issuer || '',
        code: (data as any).code || '',
        decimals: (data as any).decimals || 0,
        complianceMode: (data as any).complianceMode || 'RECORD_ONLY',
        status: (data as any).status || 'draft',
        createdAt: (data as any).createdAt || new Date().toISOString(),
        updatedAt: (data as any).updatedAt,
        controls: (data as any).controls,
        registry: (data as any).registry
      }
      
      setAsset(transformedAsset)
    } catch (err: any) {
      console.error('Error fetching asset:', err)
      setError(err.message || 'Failed to fetch asset')
    } finally {
      setLoading(false)
    }
  }

  const showConfirmationDialog = (action: string, newStatus: 'active' | 'paused' | 'retired') => {
    const getDialogConfig = () => {
      switch (newStatus) {
        case 'active':
          return {
            title: 'Activate Asset',
            message: `Are you sure you want to activate ${asset?.code}? This will make it available for token issuance.`,
            variant: 'info' as const
          }
        case 'paused':
          return {
            title: 'Pause Asset',
            message: `Are you sure you want to pause ${asset?.code}? This will temporarily disable token issuance.`,
            variant: 'warning' as const
          }
        case 'retired':
          return {
            title: 'Retire Asset',
            message: `Are you sure you want to retire ${asset?.code}? This action cannot be undone and will permanently disable the asset.`,
            variant: 'danger' as const
          }
        default:
          return {
            title: 'Change Status',
            message: `Are you sure you want to change the status of ${asset?.code}?`,
            variant: 'info' as const
          }
      }
    }

    const config = getDialogConfig()
    setConfirmationDialog({
      isOpen: true,
      action: newStatus,
      title: config.title,
      message: config.message,
      variant: config.variant
    })
  }

  const handleStatusChange = async (newStatus: 'active' | 'paused' | 'retired') => {
    if (!asset) return
    
    try {
      console.log(`Changing asset ${asset.id} status to ${newStatus}`)

      // Call the backend API to update the asset status
      const { data, error } = await api.PUT(`/v1/assets/${asset.id}` as any, {
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
      const updatedAsset: Asset = {
        ...asset,
        status: (data as any).status || newStatus,
        updatedAt: (data as any).updatedAt || new Date().toISOString()
      }
      
      setAsset(updatedAsset)
      
      // Track analytics
      trackAssetAction(AnalyticsEvents[`ASSET_${newStatus.toUpperCase()}` as keyof typeof AnalyticsEvents], asset.id, {
        previous_status: asset.status,
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

  const { showToast } = useToast()

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      
      // Show success toast
      showToast('success', `${type} copied to clipboard`)
      
      // Track analytics
      trackCopyAction(type, text)
    } catch (err) {
      // Show error toast
      showToast('error', 'Failed to copy to clipboard')
    }
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
              href={`/app/issuance/new?assetId=${asset.id}`}
              className="px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50"
            >
              Start Issuance
            </Link>
          )}
          {asset.status === 'draft' && (
            <button
              onClick={() => showConfirmationDialog('activate', 'active')}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              Activate
            </button>
          )}
          {asset.status === 'active' && (
            <button
              onClick={() => showConfirmationDialog('pause', 'paused')}
              className="px-4 py-2 text-yellow-600 border border-yellow-600 rounded-lg hover:bg-yellow-50"
            >
              Pause
            </button>
          )}
          {(asset.status === 'active' || asset.status === 'paused') && (
            <button
              onClick={() => showConfirmationDialog('retire', 'retired')}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
            >
              Retire
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span className="text-green-800">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

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
                  onClick={() => copyToClipboard(asset.assetRef, 'Asset Reference')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
                  title="Copy Asset Reference"
                >
                  <Copy className="w-4 h-4" />
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
                      onClick={() => copyToClipboard(asset.issuer, 'Issuer Address')}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
                      title="Copy Issuer Address"
                    >
                      <Copy className="w-3 h-3" />
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
                              <p className="text-gray-600 mb-2">Authorizations and Issuances coming in Phase 2</p>
                <p className="text-sm text-gray-500">You'll be able to view authorization status and issuance history here.</p>
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
                    onClick={() => showConfirmationDialog('activate', 'active')}
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
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
                    onClick={() => showConfirmationDialog('pause', 'paused')}
                    className="px-4 py-2 text-yellow-600 border border-yellow-600 rounded-lg hover:bg-yellow-50"
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
                    onClick={() => showConfirmationDialog('retire', 'retired')}
                    className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
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

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => handleStatusChange(confirmationDialog.action as 'active' | 'paused' | 'retired')}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        confirmText={confirmationDialog.action === 'retired' ? 'Retire Asset' : confirmationDialog.action === 'paused' ? 'Pause Asset' : 'Activate Asset'}
        variant={confirmationDialog.variant}
      />
    </div>
  )
}
