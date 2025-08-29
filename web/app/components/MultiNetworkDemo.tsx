'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import LedgerStatusCard from './LedgerStatusCard'

// This is a demo component showing how to use LedgerStatusCard with multiple networks
// In the future, you would implement separate API endpoints for each network

interface XrplStatusData {
  ok?: boolean
  endpoint?: string
  connected?: boolean
  info?: any
  error?: string
  time?: string
}

export default function MultiNetworkDemo() {
  const [selectedLedger, setSelectedLedger] = useState('xrpl')

  // XRPL Testnet (real data)
  const xrplTestnet = useQuery({
    queryKey: ['xrpl-status', 'testnet'],
    queryFn: async () => (await api.GET('/system/xrpl-status')).data as XrplStatusData,
    refetchInterval: 30000,
  })

  // XRPL Networks
  const xrplNetworks = [
    {
      name: 'devnet',
      displayName: 'Devnet',
      data: {
        ok: true,
        endpoint: 'wss://s.devnet.rippletest.net:51233',
        connected: true,
        info: {
          networkId: 1234,
          serverState: 'full',
          peers: 45,
          validatedLedger: {
            seq: 10167000,
            age: 2,
            baseFeeXRP: '0.000012',
            hash: '1234567890ABCDEF'
          }
        },
        time: new Date().toISOString()
      } as XrplStatusData,
      loading: false
    },
    {
      name: 'testnet',
      displayName: 'Testnet',
      data: xrplTestnet.data || null,
      loading: xrplTestnet.isLoading
    },
    {
      name: 'mainnet',
      displayName: 'Mainnet',
      data: {
        ok: true,
        endpoint: 'wss://xrplcluster.com',
        connected: false,
        error: 'Mainnet connection disabled for demo',
        time: new Date().toISOString()
      } as XrplStatusData,
      loading: false
    }
  ]

  // Hedera Networks
  const hederaNetworks = [
    {
      name: 'devnet',
      displayName: 'Devnet',
      data: {
        ok: true,
        endpoint: 'https://devnet.hashgraph.com',
        connected: true,
        info: {
          networkId: 295,
          serverState: 'active',
          peers: 12,
          validatedLedger: {
            seq: 12345678,
            age: 1,
            baseFeeHBAR: '0.0001',
            hash: 'HEDERA1234567890'
          }
        },
        time: new Date().toISOString()
      } as XrplStatusData,
      loading: false
    },
    {
      name: 'testnet',
      displayName: 'Testnet',
      data: {
        ok: true,
        endpoint: 'https://testnet.hashgraph.com',
        connected: true,
        info: {
          networkId: 296,
          serverState: 'active',
          peers: 8,
          validatedLedger: {
            seq: 98765432,
            age: 3,
            baseFeeHBAR: '0.0001',
            hash: 'HEDERA9876543210'
          }
        },
        time: new Date().toISOString()
      } as XrplStatusData,
      loading: false
    },
    {
      name: 'mainnet',
      displayName: 'Mainnet',
      data: {
        ok: true,
        endpoint: 'https://mainnet.hashgraph.com',
        connected: false,
        error: 'Mainnet connection requires enterprise setup',
        time: new Date().toISOString()
      } as XrplStatusData,
      loading: false
    }
  ]

  // Ethereum Networks
  const ethereumNetworks = [
    {
      name: 'goerli',
      displayName: 'Goerli',
      data: {
        ok: true,
        endpoint: 'https://goerli.infura.io/v3/...',
        connected: true,
        info: {
          networkId: 5,
          serverState: 'synced',
          peers: 25,
          validatedLedger: {
            seq: 9876543,
            age: 12,
            baseFeeETH: '0.000000001',
            hash: 'ETH0x1234567890ABCDEF'
          }
        },
        time: new Date().toISOString()
      } as XrplStatusData,
      loading: false
    },
    {
      name: 'sepolia',
      displayName: 'Sepolia',
      data: {
        ok: true,
        endpoint: 'https://sepolia.infura.io/v3/...',
        connected: true,
        info: {
          networkId: 11155111,
          serverState: 'synced',
          peers: 18,
          validatedLedger: {
            seq: 4567890,
            age: 8,
            baseFeeETH: '0.000000001',
            hash: 'ETH0x9876543210ABCDEF'
          }
        },
        time: new Date().toISOString()
      } as XrplStatusData,
      loading: false
    },
    {
      name: 'mainnet',
      displayName: 'Mainnet',
      data: {
        ok: true,
        endpoint: 'https://mainnet.infura.io/v3/...',
        connected: false,
        error: 'Mainnet connection requires enterprise setup',
        time: new Date().toISOString()
      } as XrplStatusData,
      loading: false
    }
  ]

  const getLedgerData = () => {
    switch (selectedLedger) {
      case 'xrpl':
        return { ledger: 'XRPL', networks: xrplNetworks, defaultNetwork: 'testnet' }
      case 'hedera':
        return { ledger: 'Hedera', networks: hederaNetworks, defaultNetwork: 'testnet' }
      case 'ethereum':
        return { ledger: 'Ethereum', networks: ethereumNetworks, defaultNetwork: 'sepolia' }
      default:
        return { ledger: 'XRPL', networks: xrplNetworks, defaultNetwork: 'testnet' }
    }
  }

  const { ledger, networks, defaultNetwork } = getLedgerData()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Multi-Ledger Demo</h2>
        <p className="text-gray-600">This shows how the LedgerStatusCard works with multiple ledgers and networks</p>
      </div>
      
      {/* Ledger Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'xrpl', name: 'XRPL', icon: '⚡' },
            { id: 'hedera', name: 'Hedera', icon: '✓' },
            { id: 'ethereum', name: 'Ethereum', icon: '🔗' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedLedger(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedLedger === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
      
      <LedgerStatusCard
        ledger={ledger}
        networks={networks}
        defaultNetwork={defaultNetwork}
        showNetworkSelector={true}
        compact={false}
      />
    </div>
  )
}
