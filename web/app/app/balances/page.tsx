'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Wallet, Search, Copy, CheckCircle, AlertCircle } from 'lucide-react'

export default function BalancesPage() {
  const [account, setAccount] = useState('rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw')
  const [issuer, setIssuer] = useState('')
  const [currency, setCurrency] = useState('')
  const [res, setRes] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function onFetch(e: React.FormEvent) {
    e.preventDefault()
    if (!account) { alert('Account required'); return }
    
    setLoading(true)
    try {
      const { data, error } = await api.GET('/balances/{account}', {
        params: { path: { account }, query: { issuer: issuer || undefined, currency: currency || undefined } }
      })
      if (error || !data) { alert(error?.message ?? 'Failed'); return }
      setRes(data)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">View Balances</h1>
        <p className="text-gray-600">Check account balances and trustlines on XRPL</p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <form onSubmit={onFetch} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Address</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
                placeholder="rAccount123..." 
                value={account} 
                onChange={e => setAccount(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Issuer (Optional)</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
                placeholder="rIssuer456..." 
                value={issuer} 
                onChange={e => setIssuer(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency (Optional)</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="USD, EUR, or hex" 
                value={currency} 
                onChange={e => setCurrency(e.target.value)} 
              />
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Fetching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Fetch Balances
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      {res && (
        <div className="space-y-6">
          {/* Account Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Account Summary</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Account:</span>
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{res.account}</span>
                <button
                  onClick={() => copyToClipboard(res.account, 'account')}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {copied === 'account' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-800">XRP Balance</span>
                </div>
                <div className="text-2xl font-bold text-emerald-900">{formatBalance(res.xrpBalance)} XRP</div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-blue-800">Trustlines</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{res.trustLines?.length || 0}</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-purple-800">Total Currencies</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{res.trustLines?.length || 0}</div>
              </div>
            </div>
          </div>

          {/* Trustlines Table */}
          {res.trustLines && res.trustLines.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Trustlines & Balances</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issuer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {res.trustLines.map((trustline: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{trustline.currency}</div>
                            <div className="text-xs text-gray-500 font-mono">{trustline.currencyHex}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 font-mono">{trustline.issuer}</span>
                            <button
                              onClick={() => copyToClipboard(trustline.issuer, `issuer-${index}`)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {copied === `issuer-${index}` ? <CheckCircle className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            parseFloat(trustline.balance) > 0 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {formatBalance(trustline.balance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatBalance(trustline.limit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {trustline.frozen ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Frozen
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </span>
                            )}
                            {trustline.noRipple && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                No Ripple
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => copyToClipboard(trustline.currency, `currency-${index}`)}
                            className="text-emerald-600 hover:text-emerald-900"
                          >
                            Copy Currency
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Results */}
          {res.trustLines && res.trustLines.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Trustlines Found</h3>
              <p className="text-gray-500">This account has no trustlines for the specified criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}