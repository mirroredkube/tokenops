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

export default function ManageTrustlinesPage() {
  const [trustlines, setTrustlines] = useState<Trustline[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    currencyCode: '',
    limit: '',
    holderSecret: '',
    noRipple: false,
    requireAuth: false
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchTrustlines()
  }, [])

  const fetchTrustlines = async () => {
    try {
      setLoading(true)
      // TODO: Implement API endpoint to fetch existing trustlines
      // const { data, error } = await api.GET('/trustlines')
      // if (error) throw new Error(error.message)
      // setTrustlines(data.trustlines || [])
      
      // Mock data for now
      setTrustlines([
        {
          id: '1',
          currencyCode: 'USD',
          limit: '1000000',
          holderAddress: 'rHolder123...',
          issuerAddress: 'rIssuer456...',
          txHash: 'ABC123...',
          createdAt: '2024-01-15T10:30:00Z',
          status: 'active'
        }
      ])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTrustline = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setSuccess(null)

    try {
      // TODO: Replace with actual API call when asset selection is implemented
      // For now, show success message
      console.log('Opt-in creation:', formData)

      setSuccess('Opt-In created successfully!')
      setFormData({
        currencyCode: '',
        limit: '',
        holderSecret: '',
        noRipple: false,
        requireAuth: false
      })
      // fetchTrustlines() // Refresh the list

    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleAuthorizeTrustline = async (trustlineId: string) => {
    try {
      // Note: Authorization is handled differently in the new Opt-In system
      // This would need to be implemented based on the specific ledger requirements
      setSuccess('Authorization not yet implemented in new Opt-In system')
      // fetchTrustlines() // Refresh the list
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
        <h1 className="text-3xl font-bold">Manage Opt-In</h1>
        <p className="text-gray-600 mt-2">
          Create and manage Opt-In for token issuance across multiple ledgers.
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
          <h2 className="text-xl font-semibold mb-4">Create New Trustline</h2>
          <form onSubmit={handleCreateTrustline} className="space-y-4">
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
              {creating ? 'Creating Trustline...' : 'Create Trustline'}
            </button>
          </form>
        </div>

        {/* Existing Trustlines */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Existing Trustlines</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading trustlines...</p>
            </div>
          ) : trustlines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No trustlines found.</p>
              <p className="text-sm text-gray-500 mt-1">Create your first trustline to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trustlines.map((trustline) => (
                <div key={trustline.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{trustline.currencyCode}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(trustline.status)}`}>
                        {trustline.status}
                      </span>
                    </div>
                    {trustline.status === 'pending' && (
                      <button
                        onClick={() => handleAuthorizeTrustline(trustline.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Authorize
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Limit: {trustline.limit}</p>
                    <p>Holder: {trustline.holderAddress}</p>
                    <p>Issuer: {trustline.issuerAddress}</p>
                    <p>Created: {new Date(trustline.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* XRPL Trustline Information */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">XRPL Trustline Information</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Trustlines</strong> allow accounts to hold tokens from specific issuers on XRPL.</p>
          <p><strong>Limit:</strong> Maximum amount the holder is willing to accept from this issuer.</p>
          <p><strong>NoRipple:</strong> Prevents the trustline from being used in rippling transactions.</p>
          <p><strong>RequireAuth:</strong> Issuer must explicitly authorize the trustline before tokens can be sent.</p>
          <p><strong>Reserve:</strong> Each trustline consumes XRP reserve from the holder account.</p>
        </div>
      </div>
    </div>
  )
}