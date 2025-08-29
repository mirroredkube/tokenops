'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import LedgerStatusCard from './LedgerStatusCard'

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
  compact?: boolean
}

export default function XrplStatusCard({ compact = false }: XrplStatusCardProps) {
  const xrplTestnet = useQuery({
    queryKey: ['xrpl-status', 'testnet'],
    queryFn: async () => (await api.GET('/system/xrpl-status')).data as XrplStatusData,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // For now, we only have testnet data
  // In the future, you can add devnet and mainnet queries here
  const networks = [
    {
      name: 'testnet',
      displayName: 'Testnet',
      data: xrplTestnet.data || null,
      loading: xrplTestnet.isLoading
    }
    // Future networks:
    // {
    //   name: 'devnet',
    //   displayName: 'Devnet',
    //   data: xrplDevnet.data,
    //   loading: xrplDevnet.isLoading
    // },
    // {
    //   name: 'mainnet',
    //   displayName: 'Mainnet',
    //   data: xrplMainnet.data,
    //   loading: xrplMainnet.isLoading
    // }
  ]

  return (
    <LedgerStatusCard
      ledger="XRPL"
      networks={networks}
      defaultNetwork="testnet"
      showNetworkSelector={networks.length > 1}
      compact={compact}
    />
  )
}
