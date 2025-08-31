'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Eye, Shield } from 'lucide-react'
import { api } from '@/lib/api'
import QueueTable, { QueueColumn } from './QueueTable'

interface ComplianceRecord {
  id: string
  recordId: string
  assetId: string
  assetRef: string
  holder: string
  status: string
  createdAt: string
}

interface ComplianceListResponse {
  items: ComplianceRecord[]
  total: number
}

export default function ComplianceToVerifyQueue() {
  const router = useRouter()
  const { t } = useTranslation(['common', 'dashboard'])
  const [records, setRecords] = useState<ComplianceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUnverifiedRecords = async () => {
      try {
        // Use the new unified compliance API - get issuances with compliance data
        const { data, error } = await api.GET('/v1/issuances?limit=10' as any, {})
        
        if (error) {
          throw new Error(error.error || 'Failed to fetch issuances with compliance data')
        }

        const response = data as any
        // Transform issuances to compliance records format for backward compatibility
        const complianceRecords = response.items
          .filter((issuance: any) => issuance.complianceRef && issuance.complianceStatus === 'PENDING')
          .map((issuance: any) => ({
            id: issuance.id,
            recordId: issuance.manifestHash || issuance.id,
            assetId: issuance.assetId,
            assetRef: issuance.assetRef,
            holder: issuance.holder,
            status: 'UNVERIFIED',
            sha256: issuance.manifestHash || '',
            createdAt: issuance.createdAt
          }))
        
        setRecords(complianceRecords)
      } catch (err: any) {
        console.error('Error fetching issuances with compliance data:', err)
        setRecords([])
      } finally {
        setLoading(false)
      }
    }

    fetchUnverifiedRecords()
  }, [])

  const getCurrencyCode = (assetRef: string) => {
    return assetRef?.split(':').pop()?.split('.').pop() || 'Unknown'
  }

  const truncateAddress = (address: string, length: number = 8) => {
    if (!address) return 'N/A'
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
      render: (record: ComplianceRecord) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {getCurrencyCode(record.assetRef)}
        </span>
      )
    },
    {
      key: 'recordId',
      label: 'Record ID',
      width: 'w-32',
      render: (record: ComplianceRecord) => (
        <span className="text-sm text-gray-900 font-mono">
          {record.recordId.substring(0, 8)}...
        </span>
      )
    },
    {
      key: 'holder',
      label: 'Holder',
      width: 'w-32',
      render: (record: ComplianceRecord) => (
        <span className="text-sm text-gray-900 font-mono">
          {truncateAddress(record.holder)}
        </span>
      )
    },
    {
      key: 'created',
      label: 'Created',
      width: 'w-32',
      render: (record: ComplianceRecord) => (
        <span className="text-sm text-gray-500">
          {formatDate(record.createdAt)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 'w-24',
      render: (record: ComplianceRecord) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.open(`/app/compliance/${record.recordId}`, '_blank')}
            className="text-purple-600 hover:text-purple-800 transition-colors"
            title="Verify compliance record"
          >
            <Shield className="h-3 w-3" />
          </button>
          <button
            onClick={() => window.open(`/app/assets/${record.assetId}`, '_blank')}
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
      title={t('dashboard:queue.complianceToVerify', 'Compliance to Verify')}
      items={records}
      columns={columns}
      emptyMessage={t('dashboard:queue.noUnverifiedCompliance', 'No unverified compliance records. All records have been verified.')}
      viewAllLink="/app/compliance?status=UNVERIFIED"
      loading={loading}
      maxItems={5}
      showViewAll={true}
    />
  )
}
