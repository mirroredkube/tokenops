'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface LedgerInfo {
  buildVersion?: string
  networkId?: number
  serverState?: string
  peers?: number
  validatedLedger?: {
    age?: number
    baseFeeXRP?: string
    baseFeeHBAR?: string
    baseFeeETH?: string
    hash?: string
    reserveBaseXRP?: string
    reserveIncrementXRP?: string
    seq?: number
  }
  fees?: {
    current_ledger_size?: string
    current_queue_size?: string
    drops?: {
      base_fee?: string
      median_fee?: string
      minimum_fee?: string
      open_ledger_fee?: string
    }
  }
}

interface NetworkData {
  ok?: boolean
  endpoint?: string
  connected?: boolean
  info?: LedgerInfo
  error?: string
  time?: string
}

interface Network {
  name: string
  displayName: string
  data: NetworkData | null
  loading?: boolean
}

interface LedgerStatusCardProps {
  ledger: string
  networks: Network[]
  defaultNetwork?: string
  showNetworkSelector?: boolean
  compact?: boolean
}

export default function LedgerStatusCard({ 
  ledger, 
  networks, 
  defaultNetwork = 'testnet',
  showNetworkSelector = true,
  compact = false 
}: LedgerStatusCardProps) {
  const [selectedNetwork, setSelectedNetwork] = useState(defaultNetwork)
  const [isExpanded, setIsExpanded] = useState(!compact)

  const currentNetwork = networks.find(n => n.name === selectedNetwork) || networks[0]
  const data = currentNetwork?.data
  const loading = currentNetwork?.loading

  const getLedgerIcon = (ledgerName: string) => {
    switch (ledgerName.toLowerCase()) {
      case 'xrpl':
        return (
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      case 'hedera':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
    }
  }

  const getNetworkColor = (networkName: string) => {
    switch (networkName.toLowerCase()) {
      case 'mainnet':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'testnet':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'devnet':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                {getLedgerIcon(ledger)}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{ledger} Status</h3>
            </div>
            <div className="text-gray-400">No data available</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              {getLedgerIcon(ledger)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{ledger} Status</h3>
              {showNetworkSelector && networks.length > 1 && (
                <div className="flex items-center space-x-2 mt-1">
                  {networks.map((network) => (
                    <button
                      key={network.name}
                      onClick={() => setSelectedNetwork(network.name)}
                      className={`px-2 py-1 rounded text-xs font-medium border ${
                        selectedNetwork === network.name
                          ? getNetworkColor(network.name)
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {network.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
              data.connected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${data.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {data.connected ? 'Connected' : 'Disconnected'}
            </div>
            {compact && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {(!compact || isExpanded) && (
        <div className="p-6">
          {/* Connection Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</p>
              <p className="text-sm font-semibold text-gray-900 font-mono">{data.endpoint || 'Unknown'}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Network ID</p>
              <p className="text-sm font-semibold text-gray-900">{data.info?.networkId || 'Unknown'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Server State</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">{data.info?.serverState || 'Unknown'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Connected Peers</p>
              <p className="text-sm font-semibold text-gray-900">{data.info?.peers || 'Unknown'}</p>
            </div>
          </div>

          {/* Latest Ledger */}
          {data.info?.validatedLedger && (
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Latest Ledger</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Sequence</p>
                  <p className="text-sm font-semibold text-gray-900">{data.info.validatedLedger.seq || 'Unknown'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Age</p>
                  <p className="text-sm font-semibold text-gray-900">{data.info.validatedLedger.age || 'Unknown'}s</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Base Fee</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(() => {
                      if (data.info.validatedLedger.baseFeeXRP) return `${data.info.validatedLedger.baseFeeXRP} XRP`
                      if (data.info.validatedLedger.baseFeeHBAR) return `${data.info.validatedLedger.baseFeeHBAR} HBAR`
                      if (data.info.validatedLedger.baseFeeETH) return `${data.info.validatedLedger.baseFeeETH} ETH`
                      return 'Unknown'
                    })()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Hash</p>
                  <p className="text-sm font-semibold text-gray-900 font-mono">
                    {data.info.validatedLedger.hash ? 
                      `${data.info.validatedLedger.hash.substring(0, 8)}...` : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Network Fees */}
          {data.info?.fees && (
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Network Fees</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Base Fee</p>
                  <p className="text-sm font-semibold text-gray-900">{data.info.fees.drops?.base_fee || 'Unknown'} drops</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Median Fee</p>
                  <p className="text-sm font-semibold text-gray-900">{data.info.fees.drops?.median_fee || 'Unknown'} drops</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Ledger Size</p>
                  <p className="text-sm font-semibold text-gray-900">{data.info.fees.current_ledger_size || 'Unknown'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Queue Size</p>
                  <p className="text-sm font-semibold text-gray-900">{data.info.fees.current_queue_size || 'Unknown'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Last Updated */}
          {data.time && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm text-gray-600">{new Date(data.time).toLocaleString()}</p>
            </div>
          )}

          {/* Error State */}
          {data.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800 font-medium">Connection Error</p>
              </div>
              <p className="text-sm text-red-700 mt-1">{data.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
