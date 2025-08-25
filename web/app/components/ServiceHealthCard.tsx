interface ServiceHealthData {
  ok?: boolean
  service?: string
  time?: string
  uptimeSeconds?: number
  pid?: number
  memoryMB?: {
    rss?: number
    heapTotal?: number
    heapUsed?: number
    external?: number
  }
  version?: string
  env?: string
}

interface ServiceHealthCardProps {
  data: ServiceHealthData | null
  loading?: boolean
}

export default function ServiceHealthCard({ data, loading }: ServiceHealthCardProps) {
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
        <h3 className="text-lg font-semibold mb-4 text-gray-500">Service Health</h3>
        <div className="text-gray-400">No data available</div>
      </div>
    )
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatMemory = (mb: number) => {
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Service Health</h3>
        <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          data.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${data.ok ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {data.ok ? 'Healthy' : 'Unhealthy'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Service</p>
          <p className="font-medium">{data.service || 'Unknown'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600 mb-1">Environment</p>
          <p className="font-medium">{data.env || 'Unknown'}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Uptime</p>
          <p className="font-medium">{data.uptimeSeconds ? formatUptime(data.uptimeSeconds) : 'Unknown'}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Process ID</p>
          <p className="font-medium">{data.pid || 'Unknown'}</p>
        </div>
      </div>

      {data.memoryMB && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Memory Usage</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">RSS:</span>
              <span className="ml-2 font-medium">{formatMemory(data.memoryMB.rss || 0)}</span>
            </div>
            <div>
              <span className="text-gray-500">Heap Total:</span>
              <span className="ml-2 font-medium">{formatMemory(data.memoryMB.heapTotal || 0)}</span>
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
    </div>
  )
}
