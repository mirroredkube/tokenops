'use client'
import { useState } from 'react'
import { Download, Search, ToggleLeft, ToggleRight, ExternalLink, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import CustomDropdown from '../../components/CustomDropdown'
import { api } from '../../../src/lib/api'
import { useRouter } from 'next/navigation'

type BalanceTab = 'holder' | 'issuer'

interface HolderFilters {
  address: string
  showAllTrustlines: boolean
}

interface IssuerFilters {
  assetId: string
}

export default function BalancesPage() {
  const [activeTab, setActiveTab] = useState<BalanceTab>('holder')
  const [holderFilters, setHolderFilters] = useState<HolderFilters>({
    address: '',
    showAllTrustlines: false
  })
  const [issuerFilters, setIssuerFilters] = useState<IssuerFilters>({
    assetId: ''
  })

  const handleHolderFilterChange = (key: keyof HolderFilters, value: string | boolean) => {
    setHolderFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleIssuerFilterChange = (key: keyof IssuerFilters, value: string) => {
    setIssuerFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleDownloadCSV = () => {
    // TODO: Implement CSV download
    console.log('Download CSV for', activeTab, activeTab === 'holder' ? holderFilters : issuerFilters)
  }

  const tabs = [
    { id: 'holder', label: 'Holder Balances' },
    { id: 'issuer', label: 'Issuer (Outstanding)' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Balances</h1>
        <p className="text-gray-600 mt-1">View account balances and outstanding token supply</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as BalanceTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'holder' && (
        <HolderBalances 
          filters={holderFilters} 
          onFilterChange={handleHolderFilterChange}
          onDownloadCSV={handleDownloadCSV}
        />
      )}
      {activeTab === 'issuer' && (
        <IssuerView 
          filters={issuerFilters} 
          onFilterChange={handleIssuerFilterChange}
          onDownloadCSV={handleDownloadCSV}
        />
      )}
    </div>
  )
}

function HolderBalances({ 
  filters, 
  onFilterChange, 
  onDownloadCSV 
}: { 
  filters: HolderFilters
  onFilterChange: (key: keyof HolderFilters, value: string | boolean) => void
  onDownloadCSV: () => void
}) {
  const router = useRouter()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['balances', filters.address],
    queryFn: async () => {
      if (!filters.address) return null
      
      const response = await api.GET('/balances/{account}', {
        params: { path: { account: filters.address } }
      })
      return response.data
    },
    enabled: !!filters.address
  })

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }

  const handleStartAuthorization = (currency: string, issuer: string) => {
    // Navigate to authorizations page with prefilled data
    router.push(`/app/authorizations?asset=${currency}&issuer=${issuer}&holder=${filters.address}`)
  }

  if (!filters.address) {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Holder Address:</span>
              <input
                type="text"
                value={filters.address}
                onChange={(e) => onFilterChange('address', e.target.value)}
                placeholder="Enter XRPL address (r...)"
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
          <div className="text-gray-500 text-lg">Enter a holder address to view balances</div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Holder Address:</span>
              <input
                type="text"
                value={filters.address}
                onChange={(e) => onFilterChange('address', e.target.value)}
                placeholder="Enter XRPL address (r...)"
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onFilterChange('showAllTrustlines', !filters.showAllTrustlines)}
                className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  filters.showAllTrustlines
                    ? 'text-blue-700 bg-blue-50 border border-blue-200'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {filters.showAllTrustlines ? (
                  <ToggleRight className="h-4 w-4 mr-1" />
                ) : (
                  <ToggleLeft className="h-4 w-4 mr-1" />
                )}
                {filters.showAllTrustlines ? 'All Trust Lines' : 'My Assets Only'}
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={onDownloadCSV}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                Download CSV
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Holder Address:</span>
              <input
                type="text"
                value={filters.address}
                onChange={(e) => onFilterChange('address', e.target.value)}
                placeholder="Enter XRPL address (r...)"
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
          <div className="text-red-500 text-lg">Error loading balances</div>
          <div className="text-gray-400 text-sm mt-2">Please check the address and try again</div>
        </div>
      </div>
    )
  }

  const trustLines = data?.trustLines || []
  const xrpBalance = data?.xrpBalance || '0'

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Holder Address:</span>
            <input
              type="text"
              value={filters.address}
              onChange={(e) => onFilterChange('address', e.target.value)}
              placeholder="Enter XRPL address (r...)"
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onFilterChange('showAllTrustlines', !filters.showAllTrustlines)}
              className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filters.showAllTrustlines
                  ? 'text-blue-700 bg-blue-50 border border-blue-200'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {filters.showAllTrustlines ? (
                <ToggleRight className="h-4 w-4 mr-1" />
              ) : (
                <ToggleLeft className="h-4 w-4 mr-1" />
              )}
              {filters.showAllTrustlines ? 'All Trust Lines' : 'My Assets Only'}
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onDownloadCSV}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{formatBalance(xrpBalance)} XRP</div>
            <div className="text-sm text-gray-600">XRP Balance</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{trustLines.length}</div>
            <div className="text-sm text-gray-600">Trust Lines</div>
          </div>
        </div>
      </div>

      {/* Balances Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Asset Balances</h3>
          <p className="text-sm text-gray-600 mt-1">
            {trustLines.length} trust line{trustLines.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {trustLines.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-500 text-lg">No trust lines found</div>
            <div className="text-gray-400 text-sm mt-2">This account has no asset authorizations</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issuer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trustLines.map((trustline: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{trustline.currency}</div>
                        <div className="text-xs text-gray-500 font-mono">{trustline.currencyHex}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {trustline.issuer.length > 20 
                          ? `${trustline.issuer.substring(0, 10)}...${trustline.issuer.substring(trustline.issuer.length - 10)}`
                          : trustline.issuer
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatBalance(trustline.balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatBalance(trustline.limit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatBalance((parseFloat(trustline.limit) - parseFloat(trustline.balance)).toString())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleStartAuthorization(trustline.currency, trustline.issuer)}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Start Authorization
                      </button>
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

function IssuerView({ 
  filters, 
  onFilterChange, 
  onDownloadCSV 
}: { 
  filters: IssuerFilters
  onFilterChange: (key: keyof IssuerFilters, value: string) => void
  onDownloadCSV: () => void
}) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Asset:</span>
            <CustomDropdown
              value={filters.assetId}
              onChange={(value) => onFilterChange('assetId', value)}
              options={[
                { value: '', label: 'Select an asset' },
                { value: 'asset1', label: 'USD (rIssuer1)' },
                { value: 'asset2', label: 'EUR (rIssuer2)' }
              ]}
              className="w-64"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onDownloadCSV}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Outstanding Supply KPI */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">0.000000</div>
          <div className="text-sm text-gray-600">Outstanding Supply</div>
        </div>
      </div>

      {/* Holders Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Issuer View (Outstanding)</div>
            <div className="text-gray-400 text-sm mt-2">Asset: {filters.assetId || 'Not selected'}</div>
            <div className="text-gray-400 text-sm">Coming soon...</div>
          </div>
        </div>
      </div>
    </div>
  )
}