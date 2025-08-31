'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import Link from 'next/link'
import CustomDropdown from '../../components/CustomDropdown'
import InfoPopup from '../../components/InfoPopup'
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
  product?: {
    id: string
    name: string
    assetClass: string
  }
  organization?: {
    id: string
    name: string
  }
}

export default function AssetsPage() {
  const { t } = useTranslation(['assets', 'common'])
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
        updatedAt: asset.updatedAt,
        product: asset.product,
        organization: asset.organization
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
      case 'OFF': return t('complianceModes.noCompliance')
      case 'RECORD_ONLY': return t('complianceModes.recordOnly')
      case 'GATED_BEFORE': return t('complianceModes.gatedBefore')
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
        'active': t('messages.assetSuccessfullyActivated'),
        'paused': t('messages.assetSuccessfullyPaused'),
        'retired': t('messages.assetSuccessfullyRetired')
      }
      setSuccessMessage(statusLabels[newStatus])
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Error updating asset status:', err)
      setError(`${t('messages.operationFailed')}: ${err.message}`)
    }
  }

  const canActivate = (status: string) => status === 'draft' || status === 'paused'
  const canPause = (status: string) => status === 'active'
  const canRetire = (status: string) => status === 'active' || status === 'paused'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-gray-600">
              {t('description')}
            </p>
            <InfoPopup title={t('assetLifecycleAndDocumentation')}>
              <div className="space-y-6">
                {/* Asset Lifecycle Flow Diagram */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">{t('assets:lifecycleStages.title', 'Asset Lifecycle Stages')}</h4>
                  <div className="relative">
                    {/* Flow Diagram */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      {/* Draft Stage */}
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">{t('assets:lifecycleStages.draft.title', 'Draft')}</div>
                          <div className="text-xs text-gray-500">{t('assets:lifecycleStages.draft.description', 'Initial Setup')}</div>
                        </div>
                      </div>
                      
                      {/* Active Stage */}
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">{t('assets:lifecycleStages.active.title', 'Active')}</div>
                          <div className="text-xs text-gray-500">{t('assets:lifecycleStages.active.description', 'Live & Issuing')}</div>
                        </div>
                      </div>
                      
                      {/* Paused Stage */}
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">{t('assets:lifecycleStages.paused.title', 'Paused')}</div>
                          <div className="text-xs text-gray-500">{t('assets:lifecycleStages.paused.description', 'Temporarily Suspended')}</div>
                        </div>
                      </div>
                      
                      {/* Retired Stage */}
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">{t('assets:lifecycleStages.retired.title', 'Retired')}</div>
                          <div className="text-xs text-gray-500">{t('assets:lifecycleStages.retired.description', 'Permanently Closed')}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Connecting Lines */}
                    <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-300 -z-10"></div>
                  </div>
                </div>

                {/* Stage Descriptions */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">📝 {t('assets:lifecycleStages.draft.title', 'Draft')}</h5>
                    <p className="text-sm text-gray-600">
                      {t('assets:lifecycleStages.draft.details', 'Asset is being configured with metadata, compliance settings, and ledger configuration. No issuances can be made in this stage.')}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">✅ {t('assets:lifecycleStages.active.title', 'Active')}</h5>
                    <p className="text-sm text-gray-600">
                      {t('assets:lifecycleStages.active.details', 'Asset is live and ready for issuances. Holders can be authorized and tokens can be issued to authorized addresses.')}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">⏸️ {t('assets:lifecycleStages.paused.title', 'Paused')}</h5>
                    <p className="text-sm text-gray-600">
                      {t('assets:lifecycleStages.paused.details', 'Asset is temporarily suspended. No new issuances can be made, but existing balances remain intact. Can be reactivated to Active status.')}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">❌ {t('assets:lifecycleStages.retired.title', 'Retired')}</h5>
                    <p className="text-sm text-gray-600">
                      {t('assets:lifecycleStages.retired.details', 'Asset is permanently closed. No new issuances or authorizations can be made. This action is irreversible.')}
                    </p>
                  </div>
                </div>

                {/* Compliance Modes */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">{t('assets:complianceModesInfo.title', 'Compliance Modes')}</h4>
                  <div className="space-y-3">
                                          <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <div className="font-medium text-gray-900">{t('assets:complianceModesInfo.noCompliance.title', 'No Compliance (OFF)')}</div>
                          <div className="text-sm text-gray-600">{t('assets:complianceModesInfo.noCompliance.description', 'No compliance checks or records are maintained.')}</div>
                        </div>
                      </div>
                                          <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <div className="font-medium text-gray-900">{t('assets:complianceModesInfo.recordOnly.title', 'Record Only (RECORD_ONLY)')}</div>
                          <div className="text-sm text-gray-600">{t('assets:complianceModesInfo.recordOnly.description', 'Compliance records are created but no enforcement.')}</div>
                        </div>
                      </div>
                                          <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <div className="font-medium text-gray-900">{t('assets:complianceModesInfo.gatedBefore.title', 'Gated Before (GATED_BEFORE)')}</div>
                          <div className="text-sm text-gray-600">{t('assets:complianceModesInfo.gatedBefore.description', 'Compliance verification required before issuance.')}</div>
                        </div>
                      </div>
                  </div>
                </div>

                {/* Best Practices */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">{t('assets:bestPractices.title', 'Best Practices')}</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• {t('assets:bestPractices.items.0', 'Always test assets in Draft mode before activating')}</li>
                    <li>• {t('assets:bestPractices.items.1', 'Use appropriate compliance modes for your regulatory requirements')}</li>
                    <li>• {t('assets:bestPractices.items.2', 'Monitor asset usage and consider pausing if suspicious activity is detected')}</li>
                    <li>• {t('assets:bestPractices.items.3', 'Only retire assets when absolutely necessary, as this action is irreversible')}</li>
                    <li>• {t('assets:bestPractices.items.4', 'Keep asset metadata up to date for audit and compliance purposes')}</li>
                  </ul>
                </div>
              </div>
            </InfoPopup>
          </div>
        </div>
        <Link
          href="/app/assets/create"
          className="w-10 h-10 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center transition-colors duration-200"
          title={t('createAsset')}
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
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('filters.ledger')}:</span>
            <div className="flex-1 min-w-0">
              <CustomDropdown
                value={filters.ledger}
                onChange={(value) => setFilters(prev => ({ ...prev, ledger: value }))}
                options={[
                  { value: '', label: t('filters.allLedgers') },
                  { value: 'xrpl', label: 'XRPL' },
                  { value: 'hedera', label: 'Hedera' },
                  { value: 'ethereum', label: 'Ethereum' }
                ]}
                className="w-full sm:w-48"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('filters.status')}:</span>
            <div className="flex-1 min-w-0">
              <CustomDropdown
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                options={[
                  { value: '', label: t('filters.allStatuses') },
                  { value: 'draft', label: t('status.draft') },
                  { value: 'active', label: t('status.active') },
                  { value: 'paused', label: t('status.paused') },
                  { value: 'retired', label: t('status.retired') }
                ]}
                className="w-full sm:w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-xs text-gray-600">
            💡 <span className="font-medium">Tip:</span> Scroll horizontally to see all columns
          </p>
        </div>
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-500 text-lg">{t('messages.noAssetsFound')}</div>
            <div className="text-gray-400 text-sm mt-2">
              {filters.ledger || filters.status 
                ? t('messages.tryAdjustingFilters') 
                : t('messages.createFirstAsset')
              }
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('table.asset')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('table.product')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('table.organization')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('table.ledger')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('table.compliance')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('table.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('table.created')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{asset.code}</div>
                        <div 
                          className="text-sm text-gray-500 break-all max-w-md cursor-help"
                          title={asset.assetRef}
                        >
                          {asset.assetRef.length > 80 
                            ? `${asset.assetRef.substring(0, 40)}...${asset.assetRef.substring(asset.assetRef.length - 30)}`
                            : asset.assetRef
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {asset.product ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 truncate" title={asset.product.name}>{asset.product.name}</div>
                          <div className="text-gray-500 text-xs">{asset.product.assetClass}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {asset.organization ? (
                        <div className="text-sm text-gray-900 truncate" title={asset.organization.name}>{asset.organization.name}</div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
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
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                          title={t('actions.viewDetails')}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        
                        {/* Status Actions */}
                        {canActivate(asset.status) && (
                          <button
                            onClick={() => handleStatusChange(asset.id, 'active')}
                            className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200"
                            title={t('actions.activateAsset')}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        {canPause(asset.status) && (
                          <button
                            onClick={() => handleStatusChange(asset.id, 'paused')}
                            className="p-1.5 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors duration-200"
                            title={t('actions.pauseAsset')}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {canRetire(asset.status) && (
                          <button
                            onClick={() => handleStatusChange(asset.id, 'retired')}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                            title={t('actions.retireAsset')}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Issue Action */}
                        {asset.status === 'active' && (
                          <Link
                            href={`/app/issuance/new?assetId=${asset.id}`}
                            className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors duration-200"
                            title={t('actions.issueTokens')}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
