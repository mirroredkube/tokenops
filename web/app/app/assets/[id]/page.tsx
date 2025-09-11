'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Link from 'next/link'
import ConfirmationDialog from '../../../components/ConfirmationDialog'
import { useToast } from '../../../components/Toast'
import { trackCopyAction, trackAssetAction, AnalyticsEvents, trackPageView } from '../../../lib/analytics'
import { Copy, Shield } from 'lucide-react'
import { CanCreateIssuances, NotViewerOnly } from '../../../components/RoleGuard'

interface Asset {
  id: string
  assetRef: string
  ledger: string
  network: string
  issuer: string
  code: string
  assetClass: 'ART' | 'EMT' | 'OTHER'
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
    lei?: string
    micaClass?: string
    jurisdiction?: string
    whitePaperRef?: string
    reserveAssets?: string
    custodian?: string
    riskAssessment?: string
  }
  product?: { id: string; name: string; assetClass?: string }
  organization?: { id: string; name: string; country?: string }
}

interface ComplianceRequirement {
  id: string
  status: 'REQUIRED' | 'SATISFIED' | 'EXCEPTION'
  rationale?: string
  evidenceRefs?: any
  exceptionReason?: string
  notes?: string
  createdAt: string
  updatedAt: string
  requirementTemplate: {
    id: string
    name: string
    description?: string
    regime: {
      id: string
      name: string
      jurisdiction: string
    }
  }
}

export default function AssetDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const assetId = params.id as string
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'settings'>('overview')
  const [asset, setAsset] = useState<Asset | null>(null)
  const [complianceRequirements, setComplianceRequirements] = useState<ComplianceRequirement[]>([])
  const [complianceLoading, setComplianceLoading] = useState(false)
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
  const [preflight, setPreflight] = useState<{ ok: boolean; blockers: { code: string; message: string; hint?: string }[] } | null>(null)
  const [preflightLoading, setPreflightLoading] = useState(false)
  const [authorizations, setAuthorizations] = useState<any[]>([])
  const [issuances, setIssuances] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  useEffect(() => {
    fetchAsset()
    // Track page view
    if (assetId) {
      trackPageView('asset_details', { asset_id: assetId })
    }
  }, [assetId])

  useEffect(() => {
    if (asset) {
      fetchActivity()
    }
  }, [asset])

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

      // Transform API response to match our Asset interface
      const transformedAsset: Asset = {
        id: (data as any).id || assetId,
        assetRef: (data as any).assetRef || '',
        ledger: (data as any).ledger || '',
        network: (data as any).network || '',
        issuer: (data as any).issuer || '',
        code: (data as any).code || '',
        assetClass: (data as any).assetClass || 'OTHER',
        decimals: (data as any).decimals || 0,
        complianceMode: (data as any).complianceMode || 'RECORD_ONLY',
        status: (data as any).status || 'draft',
        createdAt: (data as any).createdAt || new Date().toISOString(),
        updatedAt: (data as any).updatedAt,
        controls: (data as any).controls,
        registry: (data as any).registry,
        product: (data as any).product,
        organization: (data as any).organization
      }
      
      setAsset(transformedAsset)
      
      // Fetch compliance requirements if compliance mode is enabled
      if (transformedAsset.complianceMode !== 'OFF') {
        fetchComplianceRequirements()
      }
    } catch (err: any) {
      console.error('Error fetching asset:', err)
      setError(err.message || 'Failed to fetch asset')
    } finally {
      setLoading(false)
    }
  }

  const fetchComplianceRequirements = async () => {
    if (!assetId) return
    
    setComplianceLoading(true)
    try {
      const { data, error } = await api.GET(`/v1/compliance/requirements?assetId=${assetId}` as any, {})
      
      if (error) {
        console.error('Error fetching compliance requirements:', error)
        return
      }
      
      if (data && data.requirements) {
        setComplianceRequirements(data.requirements)
      }
    } catch (err: any) {
      console.error('Error fetching compliance requirements:', err)
    } finally {
      setComplianceLoading(false)
    }
  }

  const handleRequirementStatusUpdate = async (requirementId: string, newStatus: 'SATISFIED' | 'EXCEPTION') => {
    try {
      console.log('Updating requirement status:', { requirementId, newStatus })
      
      const { data, error } = await api.PATCH(`/v1/compliance/requirements/${requirementId}` as any, {
        body: {
          status: newStatus
        }
      })
      
      if (error) {
        console.error('Error updating requirement status:', error)
        return
      }
      
      console.log('Requirement status updated successfully:', data)
      // Refresh compliance requirements
      await fetchComplianceRequirements()
    } catch (err: any) {
      console.error('Error updating requirement status:', err)
    }
  }

  const fetchActivity = async () => {
    if (!assetId) return
    
    setActivityLoading(true)
    try {
      // Fetch authorizations and issuances in parallel
      const [authResponse, issuancesResponse] = await Promise.all([
        api.GET('/v1/authorizations' as any, { 
          params: { query: { assetId } } 
        }),
        api.GET(`/v1/assets/${assetId}/issuances` as any, {})
      ])
      
      if (authResponse.data) {
        setAuthorizations(authResponse.data.authorizations || [])
      }
      
      if (issuancesResponse.data) {
        setIssuances(issuancesResponse.data.issuances || [])
      }
    } catch (err: any) {
      console.error('Error fetching activity:', err)
      // Don't show error to user for activity data - it's not critical
    } finally {
      setActivityLoading(false)
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

  const getAssetClassLabel = (assetClass: string) => {
    switch (assetClass) {
      case 'ART': return 'Asset-Referenced Token (ART)'
      case 'EMT': return 'E-Money Token (EMT)'
      case 'OTHER': return 'Utility Token (OTHER)'
      default: return assetClass
    }
  }

  const { showToast } = useToast()

  const runPreflight = async () => {
    if (!assetId) return
    setPreflightLoading(true)
    try {
      const { data, error } = await api.POST(`/v1/assets/${assetId}/preflight` as any, { body: {} as any })
      if (error && (error as any).error) {
        throw new Error((error as any).error)
      }
      if (!data) throw new Error('No response from preflight')
      setPreflight(data as any)
      if ((data as any).ok) {
        showToast('success', 'Asset is ready for issuance')
      } else {
        showToast('warning', 'Issuance blocked. See blockers below.')
      }
    } catch (e: any) {
      console.error('Preflight failed', e)
      showToast('error', e.message || 'Preflight failed')
    } finally {
      setPreflightLoading(false)
    }
  }

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
            <div className="flex items-center gap-3">
              <button
                onClick={runPreflight}
                disabled={preflightLoading}
                className="px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
              >
                {preflightLoading ? 'Validating…' : 'Validate Issuance'}
              </button>
              <CanCreateIssuances fallback={null}>
                <Link
                  href={preflight?.ok === false ? '#' : `/app/issuance/new?assetId=${asset.id}`}
                  className={`px-4 py-2 rounded-lg border ${preflight?.ok === false ? 'text-gray-400 border-gray-300 cursor-not-allowed' : 'text-emerald-600 border-emerald-600 hover:bg-emerald-50'}`}
                  onClick={(e) => { if (preflight?.ok === false) e.preventDefault() }}
                >
                  Start Issuance
                </Link>
              </CanCreateIssuances>
            </div>
          )}
          <NotViewerOnly fallback={null}>
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
          </NotViewerOnly>
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
            onClick={() => setActiveTab('compliance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'compliance'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Compliance
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
                <label className="block text-sm font-medium text-gray-700">Asset Class</label>
                <p className="mt-1 text-sm text-gray-900">{getAssetClassLabel(asset.assetClass)}</p>
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

          {/* Product & Organization Information */}
          {(asset.product || asset.organization) && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Product & Organization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {asset.product && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.product.name}</p>
                    {asset.product.assetClass && (
                      <p className="mt-1 text-xs text-gray-500">Class: {getAssetClassLabel(asset.product.assetClass)}</p>
                    )}
                  </div>
                )}
                {asset.organization && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.organization.name}</p>
                    {asset.organization.country && (
                      <p className="mt-1 text-xs text-gray-500">Country: {asset.organization.country}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Registry Information */}
          {asset.registry && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Registry Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {asset.registry.micaClass && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Regulatory Classification</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.registry.micaClass}</p>
                  </div>
                )}
                {asset.registry.jurisdiction && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Jurisdiction</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.registry.jurisdiction}</p>
                  </div>
                )}
                {asset.registry.lei && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">LEI</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.registry.lei}</p>
                  </div>
                )}
                {asset.registry.whitePaperRef && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">White Paper</label>
                    <p className="mt-1 text-sm text-blue-700 underline break-all">{asset.registry.whitePaperRef}</p>
                  </div>
                )}
                {asset.registry.reserveAssets && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Reserve Assets</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{asset.registry.reserveAssets}</p>
                  </div>
                )}
                {asset.registry.custodian && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Custodian</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.registry.custodian}</p>
                  </div>
                )}
                {asset.registry.riskAssessment && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Risk Assessment</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{asset.registry.riskAssessment}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preflight Blockers */}
          {preflight && !preflight.ok && (
            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold mb-2 text-red-800">Preflight Blockers</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm text-red-800">
                {preflight.blockers.map((b) => (
                  <li key={b.code}>
                    <span className="font-medium">{b.message}</span>
                    {b.hint && <span className="text-red-700"> — {b.hint}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Activity */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Activity</h3>
            
            {activityLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading activity...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Authorizations */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Authorizations ({authorizations.length})</h4>
                  {authorizations.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No authorizations found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {authorizations.slice(0, 5).map((auth: any) => (
                        <div key={auth.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{auth.holder}</p>
                            <p className="text-xs text-gray-500">
                              {auth.status} • {new Date(auth.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            auth.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            auth.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {auth.status}
                          </span>
                        </div>
                      ))}
                      {authorizations.length > 5 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          +{authorizations.length - 5} more authorizations
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Issuances */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Issuances ({issuances.length})</h4>
                  {issuances.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No issuances found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {issuances.slice(0, 5).map((issuance: any) => (
                        <div key={issuance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">
                              {issuance.amount} {asset?.code} to {issuance.recipient}
                            </p>
                            <p className="text-xs text-gray-500">
                              {issuance.status} • {new Date(issuance.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            issuance.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            issuance.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            issuance.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {issuance.status}
                          </span>
                        </div>
                      ))}
                      {issuances.length > 5 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          +{issuances.length - 5} more issuances
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Compliance Overview */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Compliance Status</h3>
            
            {complianceLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading compliance requirements...</p>
              </div>
            ) : complianceRequirements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-2">No compliance requirements found</p>
                <p className="text-sm text-gray-500">This asset may not have compliance requirements or they haven't been generated yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Compliance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {complianceRequirements.filter(r => r.status === 'REQUIRED').length}
                      </p>
                      <p className="text-sm text-yellow-700">Required</p>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {complianceRequirements.filter(r => r.status === 'SATISFIED').length}
                      </p>
                      <p className="text-sm text-green-700">Satisfied</p>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {complianceRequirements.filter(r => r.status === 'EXCEPTION').length}
                      </p>
                      <p className="text-sm text-red-700">Exceptions</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {complianceRequirements.length}
                      </p>
                      <p className="text-sm text-blue-700">Total</p>
                    </div>
                  </div>
                </div>




              </div>
            )}
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

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Compliance Requirements</h3>
              <button
                onClick={() => router.push('/app/compliance')}
                className="px-4 py-2 border border-emerald-600 text-emerald-600 bg-white rounded-lg hover:bg-emerald-50"
              >
                View All Compliance
              </button>
            </div>
            
            {complianceLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading compliance requirements...</p>
              </div>
            ) : complianceRequirements.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No compliance requirements found for this asset</p>
                <p className="text-sm text-gray-400 mt-1">Requirements will appear here once the asset is created</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Requirements List */}
                <div className="space-y-4">
                  {complianceRequirements.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{req.requirementTemplate.name}</p>
                        <p className="text-sm text-gray-600">{req.requirementTemplate.regime.name} ({req.requirementTemplate.regime.jurisdiction})</p>
                        <p className="text-xs text-gray-500">{req.requirementTemplate.description || 'No description available'}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          req.status === 'SATISFIED' ? 'bg-green-100 text-green-800' :
                          req.status === 'EXCEPTION' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {req.status}
                        </span>
                        
                        {/* Action Buttons - Only show for REQUIRED status */}
                        {req.status === 'REQUIRED' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRequirementStatusUpdate(req.id, 'SATISFIED')}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200 transition-colors"
                            >
                              Mark Satisfied
                            </button>
                            <button
                              onClick={() => handleRequirementStatusUpdate(req.id, 'EXCEPTION')}
                              className="px-3 py-1 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200 transition-colors"
                            >
                              Mark Exception
                            </button>

                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
