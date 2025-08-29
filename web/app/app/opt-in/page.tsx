'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import FormField from '../../components/FormField'

interface Trustline {
  id: string
  currencyCode: string
  limit: string
  holderAddress: string
  issuerAddress: string
  txHash: string
  createdAt: string
  status: 'active' | 'pending' | 'failed'
}

export default function ManageAuthorizationsPage() {
  const [optIns, setOptIns] = useState<Trustline[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    currencyCode: '',
    limit: '',
    holderSecret: '',
    noRipple: false,
    requireAuth: false
  })

  useEffect(() => {
    fetchOptIns()
  }, [])

  const fetchOptIns = async () => {
    setLoading(true)
    try {
      // TODO: Implement API endpoint to fetch existing authorizations
      // const { data, error } = await api.GET('/authorizations')
      // if (error) throw new Error(error.error)
      // setOptIns(data.optIns || [])

      // Mock data for now
      setOptIns([
        {
          id: '1',
          currencyCode: 'USD',
          limit: '1000000',
          holderAddress: 'rHolder456...',
          issuerAddress: 'rIssuer123...',
          txHash: 'ABC123...',
          status: 'active',
          createdAt: new Date().toISOString()
        }
      ])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOptIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setSuccess(null)

    try {
      // TODO: Replace with actual API call when asset selection is implemented
      // For now, show success message
      console.log('Authorization creation:', formData)

      setSuccess('Authorization created successfully!')
      setFormData({
        currencyCode: '',
        limit: '',
        holderSecret: '',
        noRipple: false,
        requireAuth: false
      })
      // fetchOptIns() // Refresh the list

    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleAuthorizeOptIn = async (optInId: string) => {
    try {
      // Note: Authorization approval is handled differently in the new system
      // This would need to be implemented based on the specific ledger requirements
      setSuccess('Authorization approval not yet implemented in new system')
      // fetchOptIns() // Refresh the list
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Asset Authorizations</h1>
        <p className="text-gray-600 mt-2">
          Create and manage asset authorizations for token issuance across multiple ledgers.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Trustline Form */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Create New Authorization</h2>
          <form onSubmit={handleCreateOptIn} className="space-y-4">
            <FormField label="Currency Code" required>
              <input
                type="text"
                value={formData.currencyCode}
                onChange={(e) => setFormData(prev => ({ ...prev, currencyCode: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="USD, EUR, or custom code"
                required
              />
            </FormField>

            <FormField label="Trust Limit" required>
              <input
                type="text"
                value={formData.limit}
                onChange={(e) => setFormData(prev => ({ ...prev, limit: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="1000000"
                required
              />
            </FormField>

            <FormField 
              label="Holder Secret (Family Seed)" 
              required
              helperText="Private key of the holder account that will receive tokens"
            >
              <input
                type="password"
                value={formData.holderSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, holderSecret: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="sEd7..."
                required
              />
            </FormField>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="noRipple"
                  checked={formData.noRipple}
                  onChange={(e) => setFormData(prev => ({ ...prev, noRipple: e.target.checked }))}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="noRipple" className="ml-2 text-sm text-gray-700">
                  Set NoRipple flag (prevents rippling through this trustline)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireAuth"
                  checked={formData.requireAuth}
                  onChange={(e) => setFormData(prev => ({ ...prev, requireAuth: e.target.checked }))}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="requireAuth" className="ml-2 text-sm text-gray-700">
                  Require authorization (issuer must approve trustline)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating Authorization...' : 'Create Authorization'}
            </button>
          </form>
        </div>

        {/* Existing Authorizations */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Existing Authorizations</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading authorizations...</p>
            </div>
          ) : optIns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No authorizations found.</p>
              <p className="text-sm text-gray-500 mt-1">Create your first authorization to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {optIns.map((optIn) => (
                <div key={optIn.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{optIn.currencyCode}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(optIn.status)}`}>
                        {optIn.status}
                      </span>
                    </div>
                    {optIn.status === 'pending' && (
                      <button
                        onClick={() => handleAuthorizeOptIn(optIn.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Authorize
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Limit: {optIn.limit}</p>
                    <p>Holder: {optIn.holderAddress}</p>
                    <p>Issuer: {optIn.issuerAddress}</p>
                    <p>Created: {new Date(optIn.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* XRPL Trustline Information */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Asset Authorization Information</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Asset Authorizations</strong> allow accounts to hold tokens from specific issuers on XRPL.</p>
          <p><strong>Limit:</strong> Maximum amount the holder is willing to accept from this issuer.</p>
          <p><strong>NoRipple:</strong> Prevents the authorization from being used in rippling transactions.</p>
          <p><strong>RequireAuth:</strong> Issuer must explicitly authorize the trustline before tokens can be sent.</p>
          <p><strong>Reserve:</strong> Each authorization consumes XRP reserve from the holder account.</p>
        </div>
      </div>
    </div>
  )
}