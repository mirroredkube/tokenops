'use client'
import { useState } from 'react'
import { Download, RefreshCw, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import CustomDropdown from '../../components/CustomDropdown'
import { api } from '../../../src/lib/api'

interface IssuerFilters {
  assetId: string
}

interface HolderBalance {
  holder: string
  balance: string
  lastUpdated?: string
  explorer?: string
}

interface OutstandingData {
  outstandingSupply: string
  holderCount: number
  holders: HolderBalance[]
}

export default function BalancesPage() {
  const [filters, setFilters] = useState<IssuerFilters>({
    assetId: ''
  })

  // Fetch assets for the dropdown
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await api.GET('/v1/assets', { params: { query: { status: 'active' } } })
      return response.data?.assets || []
    }
  })

  const handleFilterChange = (key: keyof IssuerFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleDownloadCSV = () => {
    // TODO: Implement CSV download for outstanding holders
    console.log('Download CSV for asset:', filters.assetId)
  }

  const handleRefresh = () => {
    // TODO: Implement refresh from ledger
    console.log('Refresh from ledger for asset:', filters.assetId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Balances</h1>
        <p className="text-gray-600 mt-1">View outstanding supply and holder breakdown for your assets</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Asset:</span>
            <div className="flex-1 min-w-0">
              <CustomDropdown
                value={filters.assetId}
                onChange={(value) => handleFilterChange('assetId', value)}
                options={[
                  { value: '', label: 'Select an asset' },
                  ...(assetsData?.map((asset: any) => ({
                    value: asset.id,
                    label: `${asset.code} (${asset.issuer})`
                  })) || [])
                ]}
                className="w-full sm:w-80"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:ml-auto">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh from Ledger
            </button>
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <IssuerOutstandingView filters={filters} onDownloadCSV={handleDownloadCSV} />
    </div>
  )
}

function IssuerOutstandingView({ 
  filters, 
  onDownloadCSV 
}: { 
  filters: IssuerFilters
  onDownloadCSV: () => void
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['outstanding-balances', filters.assetId],
    queryFn: async () => {
      if (!filters.assetId) return null
      
      try {
        // First, get the asset details to find the issuer
        const assetResponse = await api.GET('/v1/assets/{assetId}', {
          params: { path: { assetId: filters.assetId } }
        })
        
        if (!assetResponse.data) {
          throw new Error('Asset not found')
        }
        
        const asset = assetResponse.data
        const issuerAccount = asset.issuer || ''
        
        if (!issuerAccount) {
          throw new Error('Asset issuer not found')
        }
        
        // Now get balances for the issuer account, filtered by the asset's currency
        const balancesResponse = await api.GET('/balances/{account}', {
          params: { 
            path: { account: issuerAccount },
            query: { currency: asset.code }
          }
        })
        
        if (!balancesResponse.data || !balancesResponse.data.trustLines) {
          return {
            outstandingSupply: '0',
            holderCount: 0,
            holders: []
          } as OutstandingData
        }
        
        // Transform the data to show outstanding supply
        // For XRPL, issuer sees negative balances for tokens held by others
        const holders = balancesResponse.data.trustLines
          .filter((line: any) => parseFloat(line.balance) < 0) // Only negative balances (held by others)
          .map((line: any) => ({
            holder: line.issuer, // The issuer field contains the holder's address
            balance: Math.abs(parseFloat(line.balance)).toString(), // Convert negative to positive
            lastUpdated: new Date().toISOString(), // TODO: Get actual last updated time
            explorer: `https://testnet.xrpl.org/accounts/${line.issuer}`
          }))
          .sort((a: any, b: any) => parseFloat(b.balance) - parseFloat(a.balance)) // Sort by balance descending
        
        const outstandingSupply = holders
          .reduce((sum: number, holder: any) => sum + parseFloat(holder.balance), 0)
          .toString()
        
        return {
          outstandingSupply,
          holderCount: holders.length,
          holders
        } as OutstandingData
        
      } catch (error) {
        console.error('Error fetching outstanding balances:', error)
        throw error
      }
    },
    enabled: !!filters.assetId
  })

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!filters.assetId) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
        <div className="text-gray-500 text-lg">Select an asset to view outstanding supply</div>
      </div>
    )
  }

  if (isLoading) {
    return (
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
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
        <div className="text-red-500 text-lg">Error loading outstanding balances</div>
        <div className="text-gray-400 text-sm mt-2">Please try again later</div>
      </div>
    )
  }

  const outstandingData = data as OutstandingData

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              {formatBalance(outstandingData.outstandingSupply)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Outstanding Supply</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {outstandingData.holderCount}
            </div>
            <div className="text-sm text-gray-600 mt-1">Holders</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              {outstandingData.holderCount > 0 
                ? formatBalance((parseFloat(outstandingData.outstandingSupply) / outstandingData.holderCount).toString())
                : '0.00'
              }
            </div>
            <div className="text-sm text-gray-600 mt-1">Average Holding</div>
          </div>
        </div>
      </div>

            {/* Holders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Holder Breakdown</h3>
          <p className="text-sm text-gray-600 mt-1">
            {outstandingData.holders.length} holder{outstandingData.holders.length !== 1 ? 's' : ''} with balance &gt; 0
          </p>
        </div>

        {outstandingData.holders.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-500 text-lg">No holders found</div>
            <div className="text-gray-400 text-sm mt-2">No outstanding supply for this asset</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                    <span className="block truncate">Holder</span>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="block truncate">Balance</span>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="block truncate">Last Updated</span>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <span className="block truncate">Explorer</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {outstandingData.holders.map((holder, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 min-w-0">
                      <div className="text-sm text-gray-900 font-mono truncate" title={holder.holder}>
                        {holder.holder.length > 20 
                          ? `${holder.holder.substring(0, 10)}...${holder.holder.substring(holder.holder.length - 10)}`
                          : holder.holder
                        }
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 text-right">
                      <span className="whitespace-nowrap">{formatBalance(holder.balance)}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                      <span className="whitespace-nowrap">
                        {holder.lastUpdated ? formatDate(holder.lastUpdated) : '-'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 w-12">
                      {holder.explorer ? (
                        <a
                          href={holder.explorer}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800"
                          title="View on Explorer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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