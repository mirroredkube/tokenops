'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Eye, RefreshCw } from 'lucide-react'
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
  updatedAt: string
}

interface IssuanceListResponse {
  items: Issuance[]
  total: number
}

export default function PendingIssuancesQueue() {
  const router = useRouter()
  const { t } = useTranslation(['common', 'dashboard'])
  const [issuances, setIssuances] = useState<Issuance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPendingIssuances = async () => {
      try {
        const { data, error } = await api.GET('/v1/issuances?status=submitted&limit=10' as any, {})
        
        if (error) {
          throw new Error(error.error || 'Failed to fetch pending issuances')
        }

        const response = data as IssuanceListResponse
        setIssuances(response.items || [])
      } catch (err: any) {
        console.error('Error fetching pending issuances:', err)
        setIssuances([])
      } finally {
        setLoading(false)
      }
    }

    fetchPendingIssuances()
  }, [])

  const handleRefreshStatus = async (issuanceId: string, assetId: string) => {
    try {
      const { data, error } = await api.GET(`/v1/assets/${assetId}/issuances/${issuanceId}?refresh=true` as any, {})
      
      if (error) {
        throw new Error(error.error || 'Failed to refresh status')
      }

      // Update the issuance in the list
      setIssuances(prev => prev.map(issuance => 
        issuance.id === issuanceId 
          ? { ...issuance, ...data }
          : issuance
      ))
    } catch (err: any) {
      console.error('Error refreshing status:', err)
    }
  }

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
      label: t('queue.currency'),
      width: 'w-20',
      render: (issuance: Issuance) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {getCurrencyCode(issuance.assetRef)}
        </span>
      )
    },
    {
      key: 'amount',
      label: t('queue.amount'),
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
      key: 'submitted',
      label: 'Submitted',
      width: 'w-32',
      render: (issuance: Issuance) => (
        <span className="text-sm text-gray-500">
          {formatDate(issuance.createdAt)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 'w-24',
      render: (issuance: Issuance) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleRefreshStatus(issuance.id, issuance.assetId)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            onClick={() => window.open(`/app/assets/${issuance.assetId}`, '_blank')}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            title="View asset"
          >
            <Eye className="h-3 w-3" />
          </button>
        </div>
      )
    }
  ]

  return (
          <QueueTable
        title="Pending Issuances"
        items={issuances}
        columns={columns}
        emptyMessage="No pending issuances. All recent issuances have been processed."
        viewAllLink="/app/issuance/history?status=submitted"
        loading={loading}
        maxItems={5}
        showViewAll={true}
      />
  )
}
