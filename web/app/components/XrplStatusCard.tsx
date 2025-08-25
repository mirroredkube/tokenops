interface XrplInfo {
  buildVersion?: string
  networkId?: number
  serverState?: string
  peers?: number
  validatedLedger?: {
    age?: number
    baseFeeXRP?: string
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

interface XrplStatusData {
  ok?: boolean
  endpoint?: string
  connected?: boolean
  info?: XrplInfo
  error?: string
  time?: string
}

interface XrplStatusCardProps {
  data: XrplStatusData | null
  loading?: boolean
}

export default function XrplStatusCard({ data, loading }: XrplStatusCardProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-500">XRPL Status</h3>
        <div className="text-gray-400">No data available</div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">XRPL Status</h3>
        <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          data.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${data.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {data.connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Endpoint</p>
          <p className="font-medium text-sm font-mono">{data.endpoint || 'Unknown'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600 mb-1">Network ID</p>
          <p className="font-medium">{data.info?.networkId || 'Unknown'}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Server State</p>
          <p className="font-medium capitalize">{data.info?.serverState || 'Unknown'}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Connected Peers</p>
          <p className="font-medium">{data.info?.peers || 'Unknown'}</p>
        </div>
      </div>

      {data.info?.validatedLedger && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Latest Ledger</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Sequence:</span>
              <span className="ml-2 font-medium">{data.info.validatedLedger.seq || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Age:</span>
              <span className="ml-2 font-medium">{data.info.validatedLedger.age || 'Unknown'}s</span>
            </div>
            <div>
              <span className="text-gray-500">Base Fee:</span>
              <span className="ml-2 font-medium">{data.info.validatedLedger.baseFeeXRP || 'Unknown'} XRP</span>
            </div>
            <div>
              <span className="text-gray-500">Hash:</span>
              <span className="ml-2 font-medium font-mono text-xs">
                {data.info.validatedLedger.hash ? 
                  `${data.info.validatedLedger.hash.substring(0, 8)}...` : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      )}

      {data.info?.fees && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Network Fees</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Base Fee:</span>
              <span className="ml-2 font-medium">{data.info.fees.drops?.base_fee || 'Unknown'} drops</span>
            </div>
            <div>
              <span className="text-gray-500">Median Fee:</span>
              <span className="ml-2 font-medium">{data.info.fees.drops?.median_fee || 'Unknown'} drops</span>
            </div>
            <div>
              <span className="text-gray-500">Current Ledger Size:</span>
              <span className="ml-2 font-medium">{data.info.fees.current_ledger_size || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Queue Size:</span>
              <span className="ml-2 font-medium">{data.info.fees.current_queue_size || 'Unknown'}</span>
            </div>
          </div>
        </div>
      )}

      {data.time && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Last Updated</p>
          <p className="text-sm font-medium">{new Date(data.time).toLocaleString()}</p>
        </div>
      )}

      {data.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">Error: {data.error}</p>
        </div>
      )}
    </div>
  )
}
