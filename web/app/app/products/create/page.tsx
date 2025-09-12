'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { 
  Package, 
  ArrowLeft, 
  Save, 
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { getTenantApiUrl } from '@/lib/tenantApi'
import { CanManageProducts } from '../../../components/RoleGuard'
import CustomDropdown from '../../../components/CustomDropdown'
import { trackPageView, trackAssetAction, AnalyticsEvents } from '../../../lib/analytics'

interface ProductFormData {
  name: string
  assetClass: 'ART' | 'EMT' | 'OTHER'
  targetMarkets: string[]
  policyPresets: {
    kycTier: 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL'
    sanctionsPosture: 'STRICT' | 'MODERATE' | 'PERMISSIVE'
  }
  documents: {
    authorizationRef?: string
    whitePaperRef?: string
  }
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'RETIRED'
}

const TARGET_MARKETS = ['US', 'EU', 'UK', 'CH', 'SG', 'JP', 'AU', 'CA']

export default function CreateProductPage() {
  return (
    <CanManageProducts fallback={
      <div className="max-w-4xl mx-auto p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">You need admin privileges to create products.</p>
      </div>
    }>
      <CreateProductPageContent />
    </CanManageProducts>
  )
}

function CreateProductPageContent() {
  const { t } = useTranslation(['products', 'common'])
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Track page view
  trackPageView('product_create')
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    assetClass: 'OTHER',
    targetMarkets: [],
    policyPresets: {
      kycTier: 'BASIC',
      sanctionsPosture: 'MODERATE'
    },
    documents: {
      authorizationRef: '',
      whitePaperRef: ''
    },
    status: 'DRAFT'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const apiUrl = getTenantApiUrl()
      const response = await fetch(`${apiUrl}/v1/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product')
      }

      setSuccess(true)
        trackAssetAction(AnalyticsEvents.ASSET_CREATED, `product_created_${data.id}`)
      
      // Redirect to products list after a short delay
      setTimeout(() => {
        router.push('/app/products')
      }, 2000)

    } catch (err: any) {
      console.error('Error creating product:', err)
      setError(err.message || 'Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  const handleTargetMarketChange = (market: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      targetMarkets: checked 
        ? [...prev.targetMarkets, market]
        : prev.targetMarkets.filter(m => m !== market)
    }))
  }

  if (success) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('products:messages.created')}
        </h1>
        <p className="text-gray-600">Redirecting to products list...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common:actions.back')}
        </button>
        <div>
          <h1 className="text-3xl font-bold">{t('products:create.title')}</h1>
          <p className="text-gray-600 mt-2">
            {t('products:create.description')}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="text-red-600 mr-2 h-5 w-5" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('products:detail.sections.basicInfo')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products:create.form.name.label')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('products:create.form.name.placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Asset Class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products:create.form.assetClass.label')} *
                </label>
                <CustomDropdown
                  value={formData.assetClass}
                  onChange={(value) => setFormData(prev => ({ ...prev, assetClass: value as any }))}
                  placeholder={t('products:create.form.assetClass.placeholder')}
                  options={[
                    { value: 'OTHER', label: t('products:create.form.assetClass.options.OTHER') },
                    { value: 'ART', label: t('products:create.form.assetClass.options.ART') },
                    { value: 'EMT', label: t('products:create.form.assetClass.options.EMT') }
                  ]}
                  required
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products:create.form.status.label')}
                </label>
                <CustomDropdown
                  value={formData.status}
                  onChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                  placeholder={t('products:create.form.status.label')}
                  options={[
                    { value: 'DRAFT', label: t('products:create.form.status.options.DRAFT') },
                    { value: 'ACTIVE', label: t('products:create.form.status.options.ACTIVE') },
                    { value: 'PAUSED', label: t('products:create.form.status.options.PAUSED') },
                    { value: 'RETIRED', label: t('products:create.form.status.options.RETIRED') }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Target Markets */}
          <div>
            <h3 className="text-lg font-medium mb-3">
              {t('products:create.form.targetMarkets.label')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('products:create.form.targetMarkets.description')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TARGET_MARKETS.map((market) => (
                <label key={market} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.targetMarkets.includes(market)}
                    onChange={(e) => handleTargetMarketChange(market, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {t(`products:create.form.targetMarkets.options.${market}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Policy Presets */}
          <div>
            <h3 className="text-lg font-medium mb-3">
              {t('products:create.form.policyPresets.label')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('products:create.form.policyPresets.description')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* KYC Tier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products:create.form.policyPresets.kycTier.label')}
                </label>
                <CustomDropdown
                  value={formData.policyPresets.kycTier}
                  onChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    policyPresets: { ...prev.policyPresets, kycTier: value as any }
                  }))}
                  placeholder={t('products:create.form.policyPresets.kycTier.label')}
                  options={[
                    { value: 'BASIC', label: t('products:create.form.policyPresets.kycTier.options.BASIC') },
                    { value: 'ENHANCED', label: t('products:create.form.policyPresets.kycTier.options.ENHANCED') },
                    { value: 'INSTITUTIONAL', label: t('products:create.form.policyPresets.kycTier.options.INSTITUTIONAL') }
                  ]}
                />
              </div>

              {/* Sanctions Posture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products:create.form.policyPresets.sanctionsPosture.label')}
                </label>
                <CustomDropdown
                  value={formData.policyPresets.sanctionsPosture}
                  onChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    policyPresets: { ...prev.policyPresets, sanctionsPosture: value as any }
                  }))}
                  placeholder={t('products:create.form.policyPresets.sanctionsPosture.label')}
                  options={[
                    { value: 'STRICT', label: t('products:create.form.policyPresets.sanctionsPosture.options.STRICT') },
                    { value: 'MODERATE', label: t('products:create.form.policyPresets.sanctionsPosture.options.MODERATE') },
                    { value: 'PERMISSIVE', label: t('products:create.form.policyPresets.sanctionsPosture.options.PERMISSIVE') }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-lg font-medium mb-3">
              {t('products:create.form.documents.label')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('products:create.form.documents.description')}
            </p>
            <div className="space-y-4">
              {/* Authorization Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products:create.form.documents.authorizationRef.label')}
                </label>
                <input
                  type="text"
                  value={formData.documents.authorizationRef || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    documents: { ...prev.documents, authorizationRef: e.target.value }
                  }))}
                  placeholder={t('products:create.form.documents.authorizationRef.placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* White Paper Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products:create.form.documents.whitePaperRef.label')}
                </label>
                <input
                  type="text"
                  value={formData.documents.whitePaperRef || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    documents: { ...prev.documents, whitePaperRef: e.target.value }
                  }))}
                  placeholder={t('products:create.form.documents.whitePaperRef.placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('products:create.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                {t('common:status.loading')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t('products:create.submit')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
