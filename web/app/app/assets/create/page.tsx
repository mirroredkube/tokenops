'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import FormField from '../../../components/FormField'
import CustomDropdown from '../../../components/CustomDropdown'
import Accordion from '../../../components/Accordion'
import { trackPageView, trackAssetAction, AnalyticsEvents } from '../../../lib/analytics'

interface AssetFormData {
  ledger: "xrpl" | "hedera" | "ethereum"
  network: "mainnet" | "testnet" | "devnet"
  issuer: string
  code: string
  decimals: number
  complianceMode: "OFF" | "RECORD_ONLY" | "GATED_BEFORE"
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

export default function CreateAssetPage() {
  const { t } = useTranslation(['assets', 'common'])
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Track page view
  trackPageView('asset_create')
  const [formData, setFormData] = useState<AssetFormData>({
    ledger: 'xrpl',
    network: 'testnet',
    issuer: '',
    code: '',
    decimals: 6,
    complianceMode: 'RECORD_ONLY',
    controls: undefined,
    registry: undefined
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Prepare the request body, filtering out undefined values
      const requestBody = {
        ledger: formData.ledger,
        network: formData.network,
        issuer: formData.issuer,
        code: formData.code,
        decimals: formData.decimals,
        complianceMode: formData.complianceMode,
        ...(formData.controls && Object.keys(formData.controls).length > 0 && {
          controls: Object.fromEntries(
            Object.entries(formData.controls).filter(([_, value]) => value !== undefined)
          )
        }),
        ...(formData.registry && Object.keys(formData.registry).length > 0 && {
          registry: Object.fromEntries(
            Object.entries(formData.registry).filter(([_, value]) => value !== undefined && value !== '')
          )
        })
      }

      console.log('Creating asset with payload:', requestBody)

      const { data, error } = await api.POST('/v1/assets', {
        body: requestBody
      })

      if (error) {
        throw new Error(error.error || 'Failed to create asset')
      }

      if (!data) {
        throw new Error('No response data received')
      }

      console.log('Asset created successfully:', data)
      
      // Track analytics
      trackAssetAction(AnalyticsEvents.ASSET_CREATED, data.id || 'unknown', {
        ledger: formData.ledger,
        network: formData.network,
        compliance_mode: formData.complianceMode
      })
      
      // Redirect to asset details page
      router.push(`/app/assets/${data.id}`)
    } catch (err: any) {
      console.error('Error creating asset:', err)
      setError(err.message || t('assets:createAsset.messages.failedToCreateAsset', 'Failed to create asset. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedChange = (parent: 'controls' | 'registry', field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] || {}),
        [field]: value
      }
    }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('assets:createAsset.title', 'Create Asset')}</h1>
        <p className="text-gray-600 mt-2">
          {t('assets:createAsset.description', 'Create a new token asset for issuance across multiple ledgers.')}
        </p>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Identity */}
        <Accordion title={t('assets:createAsset.steps.identity', 'Identity')} step={1} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t('assets:createAsset.fields.ledger', 'Ledger')} required>
              <CustomDropdown
                value={formData.ledger}
                onChange={(value) => handleInputChange('ledger', value)}
                options={[
                  { value: 'xrpl', label: 'XRPL (XRP Ledger)' },
                  { value: 'hedera', label: 'Hedera' },
                  { value: 'ethereum', label: 'Ethereum' }
                ]}
                placeholder={t('assets:createAsset.options.selectLedger', 'Select Ledger')}
                required
              />
            </FormField>

            <FormField label={t('assets:createAsset.fields.network', 'Network')} required>
              <CustomDropdown
                value={formData.network}
                onChange={(value) => handleInputChange('network', value)}
                options={[
                  { value: 'testnet', label: 'Testnet' },
                  { value: 'mainnet', label: 'Mainnet' },
                  { value: 'devnet', label: 'Devnet' }
                ]}
                placeholder={t('assets:createAsset.options.selectNetwork', 'Select Network')}
                required
              />
            </FormField>

            <FormField label={t('assets:createAsset.fields.issuerAddress', 'Issuer Address')} required>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => handleInputChange('issuer', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t('assets:createAsset.placeholders.issuerAddress', 'r... (XRPL) / 0x... (Ethereum)')}
                required
              />
            </FormField>

            <FormField label={t('assets:createAsset.fields.currencyCode', 'Currency Code')} required>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t('assets:createAsset.placeholders.currencyCode', 'USD, EUR, COMP')}
                required
              />
            </FormField>

            <FormField label={t('assets:createAsset.fields.decimals', 'Decimals')} required>
              <input
                type="number"
                min="0"
                max="18"
                value={formData.decimals}
                onChange={(e) => handleInputChange('decimals', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </FormField>
          </div>
        </Accordion>

        {/* Step 2: Policy */}
        <Accordion title={t('assets:createAsset.steps.policy', 'Policy')} step={2}>
          <div className="space-y-4">
            <FormField label={t('assets:createAsset.fields.complianceMode', 'Compliance Mode')} required>
              <CustomDropdown
                value={formData.complianceMode}
                onChange={(value) => handleInputChange('complianceMode', value)}
                options={[
                  { value: 'OFF', label: t('assets:createAsset.options.noCompliance', 'No Compliance') },
                  { value: 'RECORD_ONLY', label: t('assets:createAsset.options.recordOnly', 'Record Only (Optional)') },
                  { value: 'GATED_BEFORE', label: t('assets:createAsset.options.gatedBefore', 'Gated Before (Required)') }
                ]}
                placeholder={t('assets:createAsset.options.selectComplianceMode', 'Select Compliance Mode')}
                required
              />
            </FormField>
          </div>
        </Accordion>

        {/* Step 3: Registry */}
        <Accordion title={t('assets:createAsset.steps.registry', 'Registry')} step={3}>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">{t('assets:createAsset.registry.title', 'Registry Information')}</h4>
              <p className="text-sm text-blue-700">
                {t('assets:createAsset.registry.description', 'Registry information helps with compliance and regulatory reporting. This data will be stored off-chain and can be referenced in compliance records.')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={t('assets:createAsset.registry.fields.isinCode', 'ISIN Code')}>
                <input
                  type="text"
                  value={formData.registry?.isin || ''}
                  onChange={(e) => handleNestedChange('registry', 'isin', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={t('assets:createAsset.registry.placeholders.isinCode', 'US0378331005')}
                />
              </FormField>

              <FormField label={t('assets:createAsset.registry.fields.jurisdiction', 'Jurisdiction')}>
                <input
                  type="text"
                  value={formData.registry?.jurisdiction || ''}
                  onChange={(e) => handleNestedChange('registry', 'jurisdiction', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={t('assets:createAsset.registry.placeholders.jurisdiction', 'DE, US, EU')}
                />
              </FormField>

              <FormField label={t('assets:createAsset.registry.fields.micaClassification', 'MiCA Classification')}>
                <input
                  type="text"
                  value={formData.registry?.micaClass || ''}
                  onChange={(e) => handleNestedChange('registry', 'micaClass', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={t('assets:createAsset.registry.placeholders.micaClassification', 'Utility Token, Security Token')}
                />
              </FormField>

              <FormField label={t('assets:createAsset.registry.fields.leiCode', 'LEI Code')}>
                <input
                  type="text"
                  value={formData.registry?.lei || ''}
                  onChange={(e) => handleNestedChange('registry', 'lei', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={t('assets:createAsset.registry.placeholders.leiCode', '529900WXWXWXWXWXWXWX')}
                />
              </FormField>
            </div>
          </div>
        </Accordion>

        {/* Step 4: Controls */}
        <Accordion title={t('assets:createAsset.steps.controls', 'Controls')} step={4}>
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-2">{t('assets:createAsset.controls.title', 'Ledger-Specific Controls')}</h4>
              <p className="text-sm text-yellow-700">
                {t('assets:createAsset.controls.description', 'These controls affect how the asset behaves on the selected ledger. Some options may not be available for all ledgers.')}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireAuth"
                  checked={formData.controls?.requireAuth || false}
                  onChange={(e) => handleNestedChange('controls', 'requireAuth', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="requireAuth" className="ml-2 text-sm text-gray-700">
                  {t('assets:createAsset.controls.requireAuthorization', 'Require Authorization (XRPL)')}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="freeze"
                  checked={formData.controls?.freeze || false}
                  onChange={(e) => handleNestedChange('controls', 'freeze', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="freeze" className="ml-2 text-sm text-gray-700">
                  {t('assets:createAsset.controls.enableFreeze', 'Enable Freeze (XRPL)')}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="clawback"
                  checked={formData.controls?.clawback || false}
                  onChange={(e) => handleNestedChange('controls', 'clawback', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="clawback" className="ml-2 text-sm text-gray-700">
                  {t('assets:createAsset.controls.enableClawback', 'Enable Clawback (XRPL)')}
                </label>
              </div>

              <FormField label={t('assets:createAsset.fields.transferFee', 'Transfer Fee (basis points)')}>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={formData.controls?.transferFeeBps || ''}
                  onChange={(e) => handleNestedChange('controls', 'transferFeeBps', parseInt(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={t('assets:createAsset.placeholders.transferFee', '0')}
                />
              </FormField>
            </div>
          </div>
        </Accordion>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {t('assets:createAsset.actions.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('assets:createAsset.actions.creatingAsset', 'Creating Asset...') : t('assets:createAsset.actions.createAsset', 'Create Asset (Draft)')}
          </button>
        </div>
      </form>
    </div>
  )
}
