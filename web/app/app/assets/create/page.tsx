'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import FormField from '../../../components/FormField'

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
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      // TODO: Replace with actual API call when types are updated
      console.log('Creating asset:', formData)
      
      // Mock response for now
      const mockData = { id: 'asset_' + Date.now() }
      
      // Redirect to asset details page
      router.push(`/app/assets/${mockData.id}`)
    } catch (err: any) {
      setError(err.message)
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
        <h1 className="text-3xl font-bold">Create Asset</h1>
        <p className="text-gray-600 mt-2">
          Create a new token asset for issuance across multiple ledgers.
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Ledger" required>
                                   <select
                       value={formData.ledger}
                       onChange={(e) => handleInputChange('ledger', e.target.value)}
                       className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                       required
                     >
                       <option value="xrpl">XRPL (XRP Ledger)</option>
                       <option value="hedera">Hedera</option>
                       <option value="ethereum">Ethereum</option>
                     </select>
            </FormField>

            <FormField label="Network" required>
              <select
                value={formData.network}
                onChange={(e) => handleInputChange('network', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                <option value="testnet">Testnet</option>
                <option value="mainnet">Mainnet</option>
                <option value="devnet">Devnet</option>
              </select>
            </FormField>

            <FormField label="Issuer Address" required>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => handleInputChange('issuer', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="r... (XRPL) / 0x... (EVM) / G... (Stellar)"
                required
              />
            </FormField>

            <FormField label="Currency Code" required>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="USD, EUR, COMP"
                required
              />
            </FormField>

            <FormField label="Decimals" required>
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
        </div>

        {/* Compliance Settings */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Compliance Settings</h2>
          <div className="space-y-4">
            <FormField label="Compliance Mode" required>
              <select
                value={formData.complianceMode}
                onChange={(e) => handleInputChange('complianceMode', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                <option value="OFF">No Compliance</option>
                <option value="RECORD_ONLY">Record Only (Optional)</option>
                <option value="GATED_BEFORE">Gated Before (Required)</option>
              </select>
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ISIN Code">
                <input
                  type="text"
                  value={formData.registry?.isin || ''}
                  onChange={(e) => handleNestedChange('registry', 'isin', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="US0378331005"
                />
              </FormField>

              <FormField label="Jurisdiction">
                <input
                  type="text"
                  value={formData.registry?.jurisdiction || ''}
                  onChange={(e) => handleNestedChange('registry', 'jurisdiction', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="DE, US, EU"
                />
              </FormField>

              <FormField label="MiCA Classification">
                <input
                  type="text"
                  value={formData.registry?.micaClass || ''}
                  onChange={(e) => handleNestedChange('registry', 'micaClass', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Utility Token, Security Token"
                />
              </FormField>

              <FormField label="LEI Code">
                <input
                  type="text"
                  value={formData.registry?.lei || ''}
                  onChange={(e) => handleNestedChange('registry', 'lei', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="529900WXWXWXWXWXWXWX"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Ledger-Specific Controls */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Ledger Controls</h2>
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
                Require Authorization (XRPL/Stellar)
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
                Enable Freeze (XRPL/Stellar)
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
                Enable Clawback (XRPL/Stellar)
              </label>
            </div>

            <FormField label="Transfer Fee (basis points)">
              <input
                type="number"
                min="0"
                max="10000"
                value={formData.controls?.transferFeeBps || ''}
                onChange={(e) => handleNestedChange('controls', 'transferFeeBps', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="100 = 1%"
              />
            </FormField>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Asset...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </div>
  )
}
