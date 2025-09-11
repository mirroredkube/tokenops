'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  Shield, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react'
import CustomDropdown from '../../../components/CustomDropdown'
import ModernTooltip from '../../../components/ModernTooltip'
import { CanManageCompliance } from '../../../components/RoleGuard'

interface ComplianceRecord {
  id: string
  recordId: string
  assetId: string
  assetRef: string
  holder: string
  sha256: string
  status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'
  verifiedAt?: string
  verifiedBy?: string
  reason?: string
  isin?: string
  legalIssuer?: string
  jurisdiction?: string
  micaClass?: string
  kycRequirement?: string
  transferRestrictions: boolean
  purpose?: string
  docs?: any[]
  consentTs?: string
  createdAt: string
  updatedAt: string
}

interface IssuanceReference {
  id: string
  assetId: string
  to: string
  amount: string
  txId?: string
  explorer?: string
  createdAt: string
}

export default function ComplianceRecordPage() {
  const router = useRouter()
  const params = useParams()
  const recordId = params.recordId as string
  
  const [record, setRecord] = useState<ComplianceRecord | null>(null)
  const [issuances, setIssuances] = useState<IssuanceReference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [showVerifyForm, setShowVerifyForm] = useState(false)
  const [verifyData, setVerifyData] = useState({
    status: 'VERIFIED' as 'VERIFIED' | 'REJECTED',
    reason: ''
  })

  const fetchRecord = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Use the new unified compliance API - get issuance by ID
      const { data, error } = await api.GET(`/v1/issuances/${recordId}` as any, {})
      
      if (error) {
        throw new Error(error.error || 'Failed to fetch issuance with compliance data')
      }

      const issuance = data as any
      // Transform issuance to compliance record format for backward compatibility
      const complianceRecord: ComplianceRecord = {
        id: issuance.id,
        recordId: issuance.manifestHash || issuance.id,
        assetId: issuance.assetId,
        assetRef: issuance.assetRef,
        holder: issuance.holder,
        sha256: issuance.manifestHash || '',
        status: issuance.complianceStatus === 'READY' ? 'VERIFIED' : 'UNVERIFIED',
        createdAt: issuance.createdAt,
        updatedAt: issuance.updatedAt,
        // Extract compliance data from manifest
        ...(issuance.complianceRef?.issuance_facts && {
          purpose: issuance.complianceRef.issuance_facts.purpose,
          isin: issuance.complianceRef.issuance_facts.isin,
          legalIssuer: issuance.complianceRef.issuance_facts.legal_issuer,
          jurisdiction: issuance.complianceRef.issuance_facts.jurisdiction,
          micaClass: issuance.complianceRef.issuance_facts.mica_class,
          kycRequirement: issuance.complianceRef.issuance_facts.kyc_requirement,
          transferRestrictions: issuance.complianceRef.issuance_facts.transfer_restrictions === 'true'
        })
      }

      setRecord(complianceRecord)
      
      // Fetch related issuances that reference this compliance record
      await fetchRelatedIssuances(complianceRecord.recordId)
    } catch (err: any) {
      console.error('Error fetching issuance with compliance data:', err)
      setError(err.message || 'Failed to fetch issuance with compliance data')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedIssuances = async (recordId: string) => {
    try {
      const { data, error } = await api.GET(`/v1/issuances/by-compliance/${recordId}` as any, {})
      
      if (error) {
        console.error('Error fetching related issuances:', error)
        setIssuances([])
        return
      }

      setIssuances(data.issuances || [])
    } catch (err) {
      console.error('Error fetching related issuances:', err)
      setIssuances([])
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    
    try {
      const { data, error } = await api.PATCH(`/v1/compliance-records/${recordId}/verify` as any, {
        body: verifyData
      })
      
      if (error) {
        throw new Error(error.error || 'Failed to verify compliance record')
      }

      // Refresh the record data
      await fetchRecord()
      setShowVerifyForm(false)
      setVerifyData({ status: 'VERIFIED', reason: '' })
    } catch (err: any) {
      console.error('Error verifying compliance record:', err)
      setError(err.message || 'Failed to verify compliance record')
    } finally {
      setVerifying(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
    switch (status) {
      case 'VERIFIED':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'REJECTED':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`
    }
  }

  useEffect(() => {
    if (recordId) {
      fetchRecord()
    }
  }, [recordId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading compliance record...</p>
        </div>
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        </div>
        <div className="p-8 text-center">
          <div className="text-red-600 mb-2">
            <Shield className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-red-600">{error || 'Compliance record not found'}</p>
          <button
            onClick={fetchRecord}
            className="mt-2 px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Record Details</h1>
        <p className="text-sm text-gray-600 mt-1">View and manage compliance record information</p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Compliance
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={getStatusBadge(record.status)}>
            {getStatusIcon(record.status)}
            <span className="ml-2">{record.status.toLowerCase()}</span>
          </span>
          
          {record.status === 'UNVERIFIED' && (
            <CanManageCompliance fallback={null}>
              <button
                onClick={() => setShowVerifyForm(true)}
                className="inline-flex items-center px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50"
              >
                Verify Record
              </button>
            </CanManageCompliance>
          )}
        </div>
      </div>

      {/* Warning if record is referenced by issuances */}
      {issuances.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                This record has been referenced by {issuances.length} issuance(s)
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Changing the verification status will not affect existing issuances, 
                  but may impact future compliance checks.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verify/Reject Form */}
      {showVerifyForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Verify Compliance Record</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Status
              </label>
              <CustomDropdown
                value={verifyData.status}
                onChange={(value) => setVerifyData(prev => ({ 
                  ...prev, 
                  status: value as 'VERIFIED' | 'REJECTED' 
                }))}
                options={[
                  { value: 'VERIFIED', label: 'Verified' },
                  { value: 'REJECTED', label: 'Rejected' }
                ]}
                placeholder="Select verification status"
              />
            </div>
            
            {verifyData.status === 'REJECTED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection
                </label>
                <textarea
                  value={verifyData.reason}
                  onChange={(e) => setVerifyData(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
                  placeholder="Provide a reason for rejecting this compliance record..."
                />
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleVerify}
                disabled={verifying || (verifyData.status === 'REJECTED' && !verifyData.reason.trim())}
                className="px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? 'Verifying...' : 'Submit Verification'}
              </button>
              <button
                onClick={() => setShowVerifyForm(false)}
                className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Record ID</label>
              <div className="flex items-center gap-2 mt-1">
                <ModernTooltip content={record.recordId}>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded truncate max-w-md block no-native-tooltip" title="">{record.recordId}</code>
                </ModernTooltip>
                <button
                  onClick={() => copyToClipboard(record.recordId)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500">Asset Reference</label>
              <div className="flex items-center gap-2 mt-1">
                <ModernTooltip content={record.assetRef}>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded truncate max-w-md block no-native-tooltip" title="">{record.assetRef}</code>
                </ModernTooltip>
                <button
                  onClick={() => copyToClipboard(record.assetRef)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500">Holder Address</label>
              <div className="flex items-center gap-2 mt-1">
                <ModernTooltip content={record.holder}>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono truncate max-w-md block no-native-tooltip" title="">{record.holder}</code>
                </ModernTooltip>
                <button
                  onClick={() => copyToClipboard(record.holder)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500">SHA256 Hash</label>
              <div className="flex items-center gap-2 mt-1">
                <ModernTooltip content={record.sha256}>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono truncate max-w-md block no-native-tooltip" title="">{record.sha256}</code>
                </ModernTooltip>
                <button
                  onClick={() => copyToClipboard(record.sha256)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500">Created</label>
              <p className="text-sm text-gray-900 mt-1">{formatDate(record.createdAt)}</p>
            </div>
            
            {record.verifiedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Verified</label>
                <p className="text-sm text-gray-900 mt-1">{formatDate(record.verifiedAt)}</p>
              </div>
            )}
            
            {record.verifiedBy && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Verified By</label>
                <p className="text-sm text-gray-900 mt-1">{record.verifiedBy}</p>
              </div>
            )}
            
            {record.reason && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Rejection Reason</label>
                <p className="text-sm text-gray-900 mt-1">{record.reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Compliance Metadata */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Compliance Metadata</h3>
          
          <div className="space-y-4">
            {record.isin && (
              <div>
                <label className="block text-sm font-medium text-gray-500">ISIN</label>
                <p className="text-sm text-gray-900 mt-1">{record.isin}</p>
              </div>
            )}
            
            {record.legalIssuer && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Legal Issuer</label>
                <p className="text-sm text-gray-900 mt-1">{record.legalIssuer}</p>
              </div>
            )}
            
            {record.jurisdiction && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Jurisdiction</label>
                <p className="text-sm text-gray-900 mt-1">{record.jurisdiction}</p>
              </div>
            )}
            
            {record.micaClass && (
              <div>
                <label className="block text-sm font-medium text-gray-500">MiCA Classification</label>
                <p className="text-sm text-gray-900 mt-1">{record.micaClass}</p>
              </div>
            )}
            
            {record.kycRequirement && (
              <div>
                <label className="block text-sm font-medium text-gray-500">KYC Requirement</label>
                <p className="text-sm text-gray-900 mt-1">{record.kycRequirement}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-500">Transfer Restrictions</label>
              <p className="text-sm text-gray-900 mt-1">
                {record.transferRestrictions ? 'Yes' : 'No'}
              </p>
            </div>
            
            {record.purpose && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Purpose</label>
                <p className="text-sm text-gray-900 mt-1">{record.purpose}</p>
              </div>
            )}
            
            {record.consentTs && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Consent Timestamp</label>
                <p className="text-sm text-gray-900 mt-1">{formatDate(record.consentTs)}</p>
              </div>
            )}
            
            {record.docs && record.docs.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Documents</label>
                <div className="mt-1 space-y-1">
                  {record.docs.map((doc: any, index: number) => (
                    <div key={index} className="text-sm text-gray-900">
                      <span className="font-medium">{doc.type}:</span> {doc.hash}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Issuances */}
      {issuances.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Related Issuances</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issuance ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issuances.map((issuance) => (
                  <tr key={issuance.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {issuance.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {issuance.to}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {issuance.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {issuance.txId ? (
                        <a
                          href={issuance.explorer || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800"
                        >
                          {issuance.txId.substring(0, 8)}...
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      ) : (
                        <span className="text-gray-500">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(issuance.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
