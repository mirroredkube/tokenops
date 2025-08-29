'use client'

import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import QueueTable, { QueueColumn } from './QueueTable'

interface Issuance {
  id: string
  assetId: string
  assetRef: string
  to: string
  amount: string
  txId?: string
  status: string
  createdAt: string
}

interface IssuanceListResponse {
  items: Issuance[]
  total: number
}

export default function RecentIssuancesQueue() {
  const [issuances, setIssuances] = useState<Issuance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentIssuances = async () => {
      try {
        const { data, error } = await api.GET('/v1/issuances?limit=10' as any, {})
        
        if (error) {
          throw new Error(error.error || 'Failed to fetch recent issuances')
        }

        const response = data as IssuanceListResponse
        setIssuances(response.items || [])
      } catch (err: any) {
        console.error('Error fetching recent issuances:', err)
        setIssuances([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecentIssuances()
  }, [])

  const getCurrencyCode = (assetRef: string) => {
    return assetRef?.split(':').pop()?.split('.').pop() || 'Unknown'
  }

  const truncateAddress = (address: string, length: number = 8) => {
    if (address.length <= length * 2) return address
    return `${address.substring(0, length)}...${address.substring(address.length - length)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const columns: QueueColumn[] = [
    {
      key: 'currency',
      label: 'Currency',
      width: 'w-20',
      render: (issuance: Issuance) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {getCurrencyCode(issuance.assetRef)}
        </span>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      width: 'w-24',
      render: (issuance: Issuance) => (
        <span className="text-sm text-gray-900">{issuance.amount}</span>
      )
    },
    {
      key: 'destination',
      label: 'Destination',
      width: 'w-32',
      render: (issuance: Issuance) => (
        <span className="text-sm text-gray-900 font-mono">
          {truncateAddress(issuance.to)}
        </span>
      )
    },
    {
      key: 'date',
      label: 'Date',
      width: 'w-32',
      render: (issuance: Issuance) => (
        <span className="text-sm text-gray-500">
          {formatDate(issuance.createdAt)}
        </span>
      )
    },
    {
      key: 'transaction',
      label: 'Transaction',
      width: 'w-32',
      render: (issuance: Issuance) => (
        issuance.txId ? (
          <a
            href={`https://testnet.xrpl.org/transactions/${issuance.txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            {issuance.txId.substring(0, 8)}...
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        ) : (
          <span className="text-gray-500 text-sm">Pending</span>
        )
      )
    }
  ]

  return (
    <QueueTable
      title="Recent Token Issuances"
      items={issuances}
      columns={columns}
      emptyMessage="No issuances yet. Once you issue a token, it will show up here."
      viewAllLink="/app/issuances"
      loading={loading}
      maxItems={5}
      showViewAll={true}
    />
  )
}
