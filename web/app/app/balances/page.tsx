'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RefreshCw, ExternalLink, Search, Users, TrendingUp } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import CustomDropdown from '../../components/CustomDropdown'
import { api } from '../../../src/lib/api'

interface IssuerFilters {
  assetId: string
}

interface HolderLookupFilters {
  holderAddress: string
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

interface HolderLookupData {
  holder: string
  xrpBalance?: string
  reserve?: string
  assets: Array<{
    assetId: string
    assetCode: string
    issuer: string
    balance: string
    limit: string
    available: string
    lastUpdated?: string
    explorer?: string
    flags: {
      noRipple: boolean
      frozen: boolean
    }
  }>
}

type TabType = 'outstanding' | 'holder-lookup'

export default function BalancesPage() {
  const { t } = useTranslation(['balances', 'common'])
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('outstanding')
  const [issuerFilters, setIssuerFilters] = useState<IssuerFilters>({
    assetId: ''
  })
  const [holderFilters, setHolderFilters] = useState<HolderLookupFilters>({
    holderAddress: ''
  })

  // Fetch assets for the dropdown
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await api.GET('/v1/assets', { params: { query: { status: 'active' } } })
      return response.data?.assets || []
    }
  })

  const handleIssuerFilterChange = (key: keyof IssuerFilters, value: string) => {
    setIssuerFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleHolderFilterChange = (key: keyof HolderLookupFilters, value: string) => {
    setHolderFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleDownloadCSV = () => {
    if (activeTab === 'outstanding') {
      downloadOutstandingCSV(issuerFilters.assetId)
    } else {
      downloadHolderLookupCSV(holderFilters.holderAddress)
    }
  }

  const downloadOutstandingCSV = (assetId: string) => {
    if (!assetId) {
      alert(t('balances:alerts.selectAssetFirst', 'Please select an asset first'))
      return
    }

    // Get data from the query cache
    const outstandingData = queryClient.getQueryData(['outstanding-balances', assetId]) as OutstandingData | null

    if (!outstandingData || !outstandingData.holders.length) {
      alert(t('balances:alerts.noDataAvailable', 'No data available to export'))
      return
    }

    const headers = ['Holder', 'Balance', 'Last Updated', 'Explorer']
    const csvRows = [headers]

    outstandingData.holders.forEach((holder) => {
      const row = [
        holder.holder,
        holder.balance,
        holder.lastUpdated ? new Date(holder.lastUpdated).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-',
        holder.explorer || '-'
      ]
      csvRows.push(row)
    })

    const csvContent = csvRows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `outstanding-holders-${assetId}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const downloadHolderLookupCSV = (holderAddress: string) => {
    if (!holderAddress) {
      alert(t('balances:alerts.enterHolderAddressFirst', 'Please enter a holder address first'))
      return
    }

    // Get data from the query cache
    const holderData = queryClient.getQueryData(['holder-lookup', holderAddress]) as HolderLookupData | null

    if (!holderData || !holderData.assets.length) {
      alert(t('balances:alerts.noDataAvailable', 'No data available to export'))
      return
    }

    const headers = ['Asset', 'Balance', 'Limit', 'Available', 'Last Updated', 'Explorer']
    const csvRows = [headers]

    holderData.assets.forEach((asset) => {
      const row = [
        asset.assetCode,
        asset.balance,
        asset.limit,
        asset.available,
        asset.lastUpdated ? new Date(asset.lastUpdated).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-',
        asset.explorer || '-'
      ]
      csvRows.push(row)
    })

    const csvContent = csvRows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `holder-assets-${holderAddress.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    if (activeTab === 'outstanding') {
      // TODO: Implement refresh from ledger for issuer view
      console.log('Refresh from ledger for asset:', issuerFilters.assetId)
    } else {
      // TODO: Implement refresh from ledger for holder lookup
      console.log('Refresh from ledger for holder:', holderFilters.holderAddress)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('balances:title', 'Balances')}</h1>
        <p className="text-gray-600 mt-1">{t('balances:description', 'View outstanding supply and holder breakdown for your assets')}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('outstanding')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'outstanding'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t('balances:outstanding', 'Outstanding')}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('holder-lookup')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'holder-lookup'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('balances:holderLookup', 'Holder Lookup')}
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'outstanding' ? (
            <OutstandingView 
              filters={issuerFilters} 
              onFilterChange={handleIssuerFilterChange}
              onDownloadCSV={handleDownloadCSV}
              onRefresh={handleRefresh}
              assetsData={assetsData}
              t={t}
            />
          ) : (
            <HolderLookupView 
              filters={holderFilters} 
              onFilterChange={handleHolderFilterChange}
              onDownloadCSV={handleDownloadCSV}
              onRefresh={handleRefresh}
              assetsData={assetsData}
              t={t}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function OutstandingView({ 
  filters, 
  onFilterChange,
  onDownloadCSV,
  onRefresh,
  assetsData,
  t
}: { 
  filters: IssuerFilters
  onFilterChange: (key: keyof IssuerFilters, value: string) => void
  onDownloadCSV: () => void
  onRefresh: () => void
  assetsData: any[] | undefined
  t: any
}) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('balances:fields.asset', 'Asset:')}</span>
          <div className="flex-1 min-w-0">
            <CustomDropdown
              value={filters.assetId}
              onChange={(value) => onFilterChange('assetId', value)}
              options={[
                { value: '', label: t('balances:fields.selectAsset', 'Select an asset') },
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
            onClick={onRefresh}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('balances:actions.refreshFromLedger', 'Refresh from Ledger')}
          </button>
          <button
            onClick={onDownloadCSV}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('balances:actions.downloadCSV', 'Download CSV')}
          </button>
        </div>
      </div>

      {/* Content */}
      <IssuerOutstandingView filters={filters} onDownloadCSV={onDownloadCSV} />
    </div>
  )
}

function HolderLookupView({ 
  filters, 
  onFilterChange,
  onDownloadCSV,
  onRefresh,
  assetsData,
  t
}: { 
  filters: HolderLookupFilters
  onFilterChange: (key: keyof HolderLookupFilters, value: string) => void
  onDownloadCSV: () => void
  onRefresh: () => void
  assetsData: any[] | undefined
  t: any
}) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('balances:fields.holderAddress', 'Holder Address:')}</span>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={filters.holderAddress}
              onChange={(e) => onFilterChange('holderAddress', e.target.value)}
              placeholder={t('balances:fields.enterXrplAddress', 'Enter XRPL address (e.g., r...)')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('balances:actions.refreshFromLedger', 'Refresh from Ledger')}
          </button>
          <button
            onClick={onDownloadCSV}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('balances:actions.downloadCSV', 'Download CSV')}
          </button>
        </div>
      </div>

      {/* Content */}
      <HolderLookupContent filters={filters} assetsData={assetsData} />
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
  const { t } = useTranslation(['balances', 'common'])
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
        <div className="text-gray-500 text-lg">{t('balances:messages.selectAssetToViewOutstanding', 'Select an asset to view outstanding supply')}</div>
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
        <div className="text-red-500 text-lg">{t('balances:messages.errorLoadingOutstandingBalances', 'Error loading outstanding balances')}</div>
        <div className="text-gray-400 text-sm mt-2">{t('balances:messages.pleaseTryAgainLater', 'Please try again later')}</div>
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
            <div className="text-sm text-gray-600 mt-1">{t('balances:kpis.outstandingSupply', 'Outstanding Supply')}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {outstandingData.holderCount}
            </div>
            <div className="text-sm text-gray-600 mt-1">{t('balances:kpis.holders', 'Holders')}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              {outstandingData.holderCount > 0 
                ? formatBalance((parseFloat(outstandingData.outstandingSupply) / outstandingData.holderCount).toString())
                : '0.00'
              }
            </div>
            <div className="text-sm text-gray-600 mt-1">{t('balances:kpis.averageHolding', 'Average Holding')}</div>
          </div>
        </div>
      </div>

            {/* Holders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('balances:tables.holderBreakdown', 'Holder Breakdown')}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {outstandingData.holders.length} {outstandingData.holders.length === 1 ? t('balances:messages.holdersWithBalanceGreaterThanZero', 'holder with balance > 0', { count: outstandingData.holders.length, plural: '' }) : t('balances:messages.holdersWithBalanceGreaterThanZero', 'holders with balance > 0', { count: outstandingData.holders.length, plural: 's' })}
          </p>
        </div>

        {outstandingData.holders.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-500 text-lg">{t('balances:messages.noHoldersFound', 'No holders found')}</div>
            <div className="text-gray-400 text-sm mt-2">{t('balances:messages.noOutstandingSupply', 'No outstanding supply for this asset')}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                    <span className="block truncate">{t('balances:fields.holder', 'Holder')}</span>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="block truncate">{t('balances:fields.balance', 'Balance')}</span>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="block truncate">{t('balances:fields.lastUpdated', 'Last Updated')}</span>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <span className="block truncate">{t('balances:fields.explorer', 'Explorer')}</span>
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

function HolderLookupContent({ 
  filters, 
  assetsData 
}: { 
  filters: HolderLookupFilters
  assetsData: any[] | undefined
}) {
  const { t } = useTranslation(['balances', 'common'])
  const { data, isLoading, error } = useQuery<HolderLookupData | null>({
    queryKey: ['holder-lookup', filters.holderAddress],
    queryFn: async () => {
      if (!filters.holderAddress) return null
      
      try {
        // Use the existing balances endpoint for holder lookup
        const response = await api.GET('/balances/{account}', {
          params: { path: { account: filters.holderAddress } }
        })
        
        if (!response.data) {
          throw new Error('Holder not found')
        }
        
        const holderData = response.data
        const xrpBalance = holderData.xrpBalance || '0'
        const reserve = '0' // TODO: Get actual reserve from API when available
        
        // Filter to only show our assets (from assetsData)
        const ourAssets = assetsData || []
        const ourAssetCodes = ourAssets.map((asset: any) => asset.code)
        
        const assets = (holderData.trustLines || [])
          .filter((line: any) => ourAssetCodes.includes(line.currency))
          .map((line: any) => {
            const asset = ourAssets.find((a: any) => a.code === line.currency)
            if (!asset) return null

            return {
              assetId: asset.id || '',
              assetCode: asset.code || '',
              issuer: asset.issuer || '',
              balance: line.balance || '0',
              limit: line.limit || '0',
              available: (parseFloat(line.limit || '0') - parseFloat(line.balance || '0')).toString(),
              lastUpdated: new Date().toISOString(), // TODO: Get actual last updated time
              explorer: `https://testnet.xrpl.org/accounts/${filters.holderAddress}`,
              flags: {
                noRipple: line.noRipple || false,
                frozen: line.frozen || false
              }
            }
          })
          .filter((line: any) => line !== null)
          .sort((a: any, b: any) => parseFloat(b.balance) - parseFloat(a.balance)) // Sort by balance descending
        
        return {
          holder: filters.holderAddress,
          xrpBalance,
          reserve,
          assets
        } as HolderLookupData
        
      } catch (error) {
        console.error('Error fetching holder lookup data:', error)
        throw error
      }
    },
    enabled: !!filters.holderAddress
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

  if (!filters.holderAddress) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
        <div className="text-gray-500 text-lg">{t('balances:messages.enterHolderAddressToView', 'Enter a holder address to view their balances')}</div>
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
        <div className="text-red-500 text-lg">{t('balances:messages.errorLoadingHolderLookupData', 'Error loading holder lookup data')}</div>
        <div className="text-gray-400 text-sm mt-2">{t('balances:messages.pleaseTryAgainLater', 'Please try again later')}</div>
      </div>
    )
  }

  const holderData = data as HolderLookupData

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              {formatBalance(holderData.xrpBalance || '0')}
            </div>
            <div className="text-sm text-gray-600 mt-1">{t('balances:kpis.xrpBalance', 'XRP Balance')}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              {formatBalance(holderData.reserve || '0')}
            </div>
            <div className="text-sm text-gray-600 mt-1">{t('balances:kpis.reserve', 'Reserve')}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              {holderData.assets.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">{t('balances:kpis.assets', 'Assets')}</div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('balances:tables.assets', 'Assets')}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {holderData.assets.length} {holderData.assets.length === 1 ? t('balances:messages.assetCount', 'asset', { count: holderData.assets.length, plural: '' }) : t('balances:messages.assetCount', 'assets', { count: holderData.assets.length, plural: 's' })}
          </p>
        </div>

        {holderData.assets.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-500 text-lg">{t('balances:messages.noAssetsFoundForHolder', 'No assets found for this holder')}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                    <span className="block truncate">{t('balances:fields.assets', 'Asset')}</span>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="block truncate">{t('balances:fields.balance', 'Balance')}</span>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="block truncate">{t('balances:fields.lastUpdated', 'Last Updated')}</span>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <span className="block truncate">{t('balances:fields.explorer', 'Explorer')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holderData.assets.map((asset, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 min-w-0">
                      <div className="text-sm text-gray-900 font-mono truncate" title={asset.assetCode}>
                        {asset.assetCode}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 text-right">
                      <span className="whitespace-nowrap">{formatBalance(asset.balance)}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                      <span className="whitespace-nowrap">
                        {asset.lastUpdated ? formatDate(asset.lastUpdated) : '-'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 w-12">
                      {asset.explorer ? (
                        <a
                          href={asset.explorer}
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