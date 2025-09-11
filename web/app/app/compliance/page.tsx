'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Shield, Search, Filter, Eye, CheckCircle, XCircle, Clock, Download, Brain, Info, AlertTriangle } from 'lucide-react'
import CustomDropdown from '../../components/CustomDropdown'
import ModernTooltip from '../../components/ModernTooltip'
import { CanManageCompliance } from '../../components/RoleGuard'

interface ComplianceRecord {
  id: string
  recordId: string
  assetId: string
  assetRef: string
  holder: string
  status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'
  sha256: string
  createdAt: string
  verifiedAt?: string
  verifiedBy?: string
}

interface ComplianceRequirement {
  id: string
  assetId: string
  assetRef: string
  assetCode: string
  status: 'REQUIRED' | 'SATISFIED' | 'EXCEPTION' | 'AVAILABLE'
  requirementName: string
  regime: string
  jurisdiction: string
  createdAt: string
  updatedAt: string
  platformAcknowledged?: boolean
  platformAcknowledgedBy?: string
  platformAcknowledgedAt?: string
  platformAcknowledgmentReason?: string
  assetClass?: string
  requiresPlatformAcknowledgement?: boolean
  // Grouping information
  isAssetLevel?: boolean
  isIssuanceLevel?: boolean
  issuanceId?: string | null
  requirementType?: string
}

interface ComplianceListResponse {
  records: ComplianceRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function CompliancePage() {
  const { t } = useTranslation(['compliance', 'common'])
  const router = useRouter()
  const searchParams = useSearchParams()
  const [records, setRecords] = useState<ComplianceRecord[]>([])
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([])
  const [allRequirements, setAllRequirements] = useState<ComplianceRequirement[]>([]) // For Overview tab
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'issuances' | 'kernel'>('dashboard')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  
  // Platform acknowledgement state
  const [showPlatformAckModal, setShowPlatformAckModal] = useState(false)
  const [selectedRequirement, setSelectedRequirement] = useState<ComplianceRequirement | null>(null)
  const [acknowledgmentReason, setAcknowledgmentReason] = useState('')
  const [acknowledging, setAcknowledging] = useState(false)
  
  // Exception reason state
  const [showExceptionModal, setShowExceptionModal] = useState(false)
  const [exceptionReason, setExceptionReason] = useState('')
  const [pendingRequirementId, setPendingRequirementId] = useState<string | null>(null)
  
  // Export format state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'zip' | 'json' | 'csv'>('zip')
  const [exportType, setExportType] = useState<'asset' | 'filtered'>('asset')
  const [pendingExportAssetId, setPendingExportAssetId] = useState<string | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    assetId: '',
    holder: '',
    requirementStatus: ''
  })
  
  // Assets for dropdown
  const [assets, setAssets] = useState<Array<{
    id: string
    code: string
    assetRef: string
    ledger: string
    status: string
    product: { id: string; name: string; assetClass: string }
    organization: { id: string; name: string }
    displayName?: string
  }>>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  

  const fetchAssets = async () => {
    setAssetsLoading(true)
    try {
      const { data, error } = await api.GET('/v1/compliance/assets' as any, {})
      
      if (error) {
        console.error('Error fetching assets:', error)
        return
      }
      
      if (data && data.assets) {
        setAssets(data.assets)
      }
    } catch (err: any) {
      console.error('Error fetching assets:', err)
    } finally {
      setAssetsLoading(false)
    }
  }

  const fetchRecords = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.assetId && filters.assetId.trim() !== '' && { assetId: filters.assetId }),
        ...(filters.holder && filters.holder.trim() !== '' && { holder: filters.holder })
      })

      // Use the new unified compliance API - get issuances with compliance data
      const { data, error } = await api.GET(`/v1/issuances?${queryParams}` as any, {})
      
      if (error) {
        throw new Error(error.error || 'Failed to fetch issuances with compliance data')
      }

      const response = data as any
      console.log('Raw issuances response:', response)
      
      // Transform issuances to compliance records format for backward compatibility
      let complianceRecords = response.items
        .map((issuance: any) => ({
          id: issuance.id,
          recordId: issuance.id, // Use issuance ID, not manifest hash
          assetId: issuance.assetId,
          assetRef: issuance.assetRef,
          holder: issuance.holder,
          status: issuance.complianceStatus === 'READY' ? 'VERIFIED' : 
                  issuance.complianceStatus === 'PENDING' ? 'PENDING' : 'UNVERIFIED',
          sha256: issuance.manifestHash || '',
          createdAt: issuance.createdAt
        }))
      
      console.log('Transformed compliance records:', complianceRecords)
      
      // Apply client-side status filtering
      if (filters.status && filters.status !== 'all') {
        complianceRecords = complianceRecords.filter((record: any) => record.status === filters.status)
      }
      
      setRecords(complianceRecords)
      setPagination({
        page: pagination.page,
        limit: pagination.limit,
        total: complianceRecords.length,
        pages: Math.ceil(complianceRecords.length / pagination.limit)
      })
    } catch (err: any) {
      console.error('Error fetching issuances with compliance data:', err)
      setError(err.message || 'Failed to fetch issuances with compliance data')
    } finally {
      setLoading(false)
    }
  }

  const fetchComplianceRequirements = async () => {
    setLoading(true)
    try {
      // Build query parameters for server-side filtering
      const queryParams = new URLSearchParams()
      
      // Only add assetId if it's not empty (not "All Assets")
      if (filters.assetId && filters.assetId.trim() !== '') {
        queryParams.append('assetId', filters.assetId)
      }
      
      // Only add status if it's not empty (not "All Statuses")
      if (filters.requirementStatus && filters.requirementStatus.trim() !== '') {
        queryParams.append('status', filters.requirementStatus)
      }
      
      // Add pagination parameters
      queryParams.append('limit', pagination.limit.toString())
      queryParams.append('offset', ((pagination.page - 1) * pagination.limit).toString())
      
      const queryString = queryParams.toString()
      const endpoint = queryString ? `/v1/compliance/instances?${queryString}` : '/v1/compliance/instances'
      
      console.log('🔍 Fetching compliance requirements with query:', endpoint)
      console.log('🔍 Current filters:', filters)
      
      // Fetch requirement instances with server-side filtering
      const { data, error } = await api.GET(endpoint as any, {})
      
      if (error) {
        console.error('Error fetching compliance requirements:', error)
        setError('Failed to fetch compliance requirements')
        return
      }
      
      console.log('Raw compliance requirements data:', data)
      
      if (data && data.instances) {
        // Transform requirement instances to our format
        const transformedRequirements = data.instances.map((req: any) => ({
          id: req.id,
          assetId: req.assetId || 'N/A',
          assetRef: req.asset?.assetRef || 'N/A',
          assetCode: req.asset?.code || 'N/A',
          status: req.status,
          requirementName: req.requirementTemplate?.name || 'Unknown',
          regime: req.requirementTemplate?.regime?.name || 'Unknown',
          jurisdiction: req.requirementTemplate?.regime?.jurisdiction || 'Unknown',
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
          platformAcknowledged: req.platformAcknowledged || false,
          platformAcknowledgedBy: req.platformAcknowledgedBy,
          platformAcknowledgedAt: req.platformAcknowledgedAt,
          platformAcknowledgmentReason: req.platformAcknowledgmentReason,
          assetClass: req.asset?.product?.assetClass || 'OTHER',
          requiresPlatformAcknowledgement: ['ART', 'EMT'].includes(req.asset?.product?.assetClass)
        }))
        
        console.log('Transformed requirements:', transformedRequirements)
        
        setRequirements(transformedRequirements)
        
        // Update pagination with server data
        if (data.total !== undefined) {
          setPagination(prev => ({
            ...prev,
            total: data.total,
            pages: Math.ceil(data.total / prev.limit)
          }))
        }
      } else if (data && data.templates) {
        // If we get templates, transform them to show as available requirements
        console.log('Got templates, transforming to show available requirements')
        const transformedTemplates = data.templates.map((template: any) => ({
          id: template.id,
          assetId: 'N/A',
          assetRef: 'N/A',
          assetCode: 'N/A',
          status: 'AVAILABLE' as any,
          requirementName: template.name,
          regime: template.regime?.name || 'Unknown',
          jurisdiction: template.regime?.jurisdiction || 'Unknown',
          createdAt: template.effectiveFrom || new Date().toISOString(),
          updatedAt: template.effectiveFrom || new Date().toISOString()
        }))
        
        console.log('Transformed templates:', transformedTemplates)
        setRequirements(transformedTemplates)
      } else {
        console.log('No requirements or templates data found:', data)
        setRequirements([])
      }
    } catch (err: any) {
      console.error('Error fetching compliance requirements:', err)
      setError('Failed to fetch compliance requirements')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllRequirements = async () => {
    try {
      // Build query parameters for server-side filtering
      const queryParams = new URLSearchParams()
      
      // Only add assetId if it's not empty (not "All Assets")
      if (filters.assetId && filters.assetId.trim() !== '') {
        queryParams.append('assetId', filters.assetId)
      }
      
      // Only add status if it's not empty (not "All Statuses")
      if (filters.requirementStatus && filters.requirementStatus.trim() !== '') {
        queryParams.append('status', filters.requirementStatus)
      }
      
      const queryString = queryParams.toString()
      const endpoint = queryString ? `/v1/compliance/instances?${queryString}` : '/v1/compliance/instances'
      
      console.log('🔍 Fetching all requirements for overview with query:', endpoint)
      
      // Fetch ALL requirements with filters for Overview tab
      const { data, error } = await api.GET(endpoint as any, {})
      
      if (error) {
        console.error('Error fetching all requirements:', error)
        return
      }
      
      if (data && data.instances) {
        // Transform requirement instances to our format with proper grouping
        const transformedRequirements = data.instances.map((req: any) => ({
          id: req.id,
          assetId: req.assetId || 'N/A',
          assetRef: req.asset?.assetRef || 'N/A',
          assetCode: req.asset?.code || 'N/A',
          status: req.status,
          requirementName: req.requirementTemplate?.name || 'Unknown',
          regime: req.requirementTemplate?.regime?.name || 'Unknown',
          jurisdiction: req.requirementTemplate?.regime?.jurisdiction || 'Unknown',
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
          platformAcknowledged: req.platformAcknowledged || false,
          platformAcknowledgedBy: req.platformAcknowledgedBy,
          platformAcknowledgedAt: req.platformAcknowledgedAt,
          platformAcknowledgmentReason: req.platformAcknowledgmentReason,
          assetClass: req.asset?.product?.assetClass || 'OTHER',
          requiresPlatformAcknowledgement: ['ART', 'EMT'].includes(req.asset?.product?.assetClass),
          // Add grouping information
          isAssetLevel: !req.issuanceId, // Asset-level if no issuanceId
          isIssuanceLevel: !!req.issuanceId, // Issuance-level if has issuanceId
          issuanceId: req.issuanceId || null,
          requirementType: req.issuanceId ? 'Issuance Snapshot' : 'Asset Live'
        }))
        
        setAllRequirements(transformedRequirements)
      }
    } catch (err: any) {
      console.error('Error fetching all requirements:', err)
    }
  }

  useEffect(() => {
    // Fetch assets on initial load
    fetchAssets()
    // Initialize tab from query (?tab=issuances/dashboard/kernel)
    const tab = (searchParams.get('tab') || '').toLowerCase()
    if (tab === 'issuances' || tab === 'dashboard' || tab === 'kernel') {
      setActiveTab(tab as any)
    }
  }, [searchParams])

  useEffect(() => {
    if (activeTab === 'issuances') {
      fetchRecords()
    } else if (activeTab === 'kernel') {
      // Kernel tab - no data fetching needed, handled by the separate page
    } else {
      // Dashboard tab - fetch all requirements for summary cards and detailed view
      fetchRecords()
      fetchAllRequirements()
      fetchComplianceRequirements()
    }
  }, [activeTab, pagination.page, filters.assetId, filters.requirementStatus])

  // Separate effect for filtering on Dashboard tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      // For Dashboard tab, fetch filtered requirements
      fetchComplianceRequirements()
    }
  }, [activeTab, filters.assetId, filters.requirementStatus])

  const handleFilterChange = (key: string, value: string) => {
    console.log('🔍 Filter change:', key, '=', value)
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleRequirementStatusUpdate = async (requirementId: string, newStatus: 'SATISFIED' | 'EXCEPTION') => {
    // If marking as EXCEPTION, show modal to get reason
    if (newStatus === 'EXCEPTION') {
      setPendingRequirementId(requirementId)
      setExceptionReason('')
      setShowExceptionModal(true)
      return
    }
    
    // For SATISFIED, update directly
    await updateRequirementStatus(requirementId, newStatus, '')
  }

  const updateRequirementStatus = async (requirementId: string, status: string, exceptionReason: string) => {
    try {
      const body: any = { status }
      
      // Add exception reason if status is EXCEPTION
      if (status === 'EXCEPTION' && exceptionReason) {
        body.exceptionReason = exceptionReason
      }
      
      const { data, error } = await api.PATCH(`/v1/compliance/requirements/${requirementId}` as any, {
        body
      })
      
      if (error) {
        console.error('Error updating requirement status:', error)
        return
      }
      
      // Refresh the requirements list
      await fetchComplianceRequirements()
    } catch (err: any) {
      console.error('Error updating requirement status:', err)
    }
  }

  const handleExceptionSubmit = async () => {
    if (!pendingRequirementId || !exceptionReason.trim()) {
      return
    }
    
    await updateRequirementStatus(pendingRequirementId, 'EXCEPTION', exceptionReason.trim())
    
    // Close modal and reset state
    setShowExceptionModal(false)
    setPendingRequirementId(null)
    setExceptionReason('')
  }

  const handlePlatformAcknowledgement = async () => {
    if (!selectedRequirement || !acknowledgmentReason.trim()) {
      return
    }

    setAcknowledging(true)
    try {
      const { data, error } = await api.POST(`/v1/compliance/requirements/${selectedRequirement.id}/platform-acknowledge` as any, {
        body: { acknowledgmentReason: acknowledgmentReason.trim() }
      })
      
      if (error) {
        console.error('Error platform acknowledging requirement:', error)
        return
      }
      
      // Close modal and refresh
      setShowPlatformAckModal(false)
      setSelectedRequirement(null)
      setAcknowledgmentReason('')
      await fetchComplianceRequirements()
    } catch (err: any) {
      console.error('Error platform acknowledging requirement:', err)
    } finally {
      setAcknowledging(false)
    }
  }

  const openPlatformAckModal = (requirement: ComplianceRequirement) => {
    setSelectedRequirement(requirement)
    setAcknowledgmentReason('')
    setShowPlatformAckModal(true)
  }

  const handleExportAssetCompliance = (assetId: string) => {
    // Show format selection modal for asset export
    setExportType('asset')
    setPendingExportAssetId(assetId)
    setExportFormat('zip')
    setShowExportModal(true)
  }

  const handleExportFilteredResults = () => {
    // Show format selection modal for filtered export
    setExportType('filtered')
    setPendingExportAssetId(null)
    setExportFormat('zip')
    setShowExportModal(true)
  }

  const handleExportSubmit = async () => {
    try {
      let url = ''
      let filename = ''
      
      if (exportType === 'asset' && pendingExportAssetId) {
        // Asset-level export
        url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/v1/compliance/assets/${pendingExportAssetId}/export?format=${exportFormat}`
        filename = `asset-compliance-${pendingExportAssetId}.${exportFormat}`
      } else if (exportType === 'filtered') {
        // Filtered export
        const queryParams = new URLSearchParams()
        if (filters.assetId) queryParams.append('assetId', filters.assetId)
        if (filters.requirementStatus) queryParams.append('status', filters.requirementStatus)
        queryParams.append('format', exportFormat)
        queryParams.append('limit', '1000')
        
        url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/v1/compliance/export?${queryParams.toString()}`
        filename = `filtered-compliance-${Date.now()}.${exportFormat}`
      } else {
        throw new Error('Invalid export configuration')
      }
      
      const response = await fetch(url, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to export compliance data')
      }
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition')
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      // Create blob and download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      // Close modal and reset state
      setShowExportModal(false)
      setPendingExportAssetId(null)
      setExportFormat('zip')
    } catch (err: any) {
      console.error('Error exporting compliance data:', err)
      alert('Failed to export compliance data. Please try again.')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status) {
      case 'VERIFIED':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'REJECTED':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateHash = (hash: string, length: number = 8) => {
    if (hash.length <= length * 2) return hash
    return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('compliance:title', 'Compliance Management')}</h1>
        <p className="text-gray-600 mt-2">
          {t('compliance:description', 'View and verify compliance records for regulatory oversight.')}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('kernel')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'kernel'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Policy Kernel Console
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Compliance Dashboard
          </button>
          <button
            onClick={() => setActiveTab('issuances')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'issuances'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
{t('requirements.issuanceRecords')}
          </button>
        </nav>
      </div>

      {/* Filters - Hide for Policy Kernel Console */}
      {activeTab !== 'kernel' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">{t('compliance:page.filters', 'Filters')}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {activeTab === 'issuances' ? 'Record Status' : 'Requirement Status'}
            </label>
            <CustomDropdown
              value={activeTab === 'issuances' ? filters.status : filters.requirementStatus}
              onChange={(value) => handleFilterChange(activeTab === 'issuances' ? 'status' : 'requirementStatus', value)}
              options={activeTab === 'issuances' ? [
                { value: '', label: 'All Statuses' },
                { value: 'UNVERIFIED', label: 'Unverified' },
                { value: 'VERIFIED', label: 'Verified' },
                { value: 'REJECTED', label: 'Rejected' }
              ] : [
                { value: '', label: t('filters.allStatuses') },
                { value: 'REQUIRED', label: t('status.required') },
                { value: 'SATISFIED', label: t('status.satisfied') },
                { value: 'EXCEPTION', label: t('status.exception') }
              ]}
              placeholder={t('filters.allStatuses')}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('compliance:filters.asset', 'Asset')}
            </label>
            <CustomDropdown
              value={filters.assetId}
              onChange={(value) => handleFilterChange('assetId', value)}
              options={[
                { value: '', label: t('compliance:filters.allAssets', 'All Assets') },
                ...assets.map(asset => ({
                  value: asset.id,
                  label: asset.displayName || `${asset.code} (${asset.product.name})`
                }))
              ]}
              placeholder={assetsLoading ? t('compliance:filters.loadingAssets', 'Loading assets...') : t('compliance:filters.selectAsset', 'Select an asset')}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('compliance:filters.holderAddress', 'Holder Address')}
            </label>
            <input
              type="text"
              value={filters.holder}
              onChange={(e) => handleFilterChange('holder', e.target.value)}
              placeholder={t('compliance:filters.filterByHolderAddress', 'Filter by holder address')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200"
            />
          </div>

        </div>
        
        {/* Export Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {activeTab === 'dashboard' && (
                <span>
                  {requirements.length} requirements found
                  {filters.assetId && ` for selected asset`}
                  {filters.requirementStatus && ` with status: ${filters.requirementStatus}`}
                </span>
              )}
            </div>
            <CanManageCompliance fallback={null}>
              <div className="flex gap-2">
                {activeTab === 'dashboard' && filters.assetId && (
                  <button
                    onClick={() => handleExportAssetCompliance(filters.assetId)}
                    className="px-4 py-2 text-sm border border-emerald-600 text-emerald-600 bg-white rounded-lg hover:bg-emerald-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Asset Compliance
                  </button>
                )}
                {activeTab === 'dashboard' && (
                  <button
                    onClick={handleExportFilteredResults}
                    className="px-4 py-2 text-sm border border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Filtered Results
                  </button>
                )}
              </div>
            </CanManageCompliance>
          </div>
        </div>
      </div>
      )}

      {/* Compliance Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Compliance Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requirements</p>
                  <p className="text-2xl font-bold text-gray-900">{allRequirements.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Available</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {allRequirements.filter(r => r.status === 'AVAILABLE').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('requirements.satisfied')}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {allRequirements.filter(r => r.status === 'SATISFIED').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('requirements.exceptions')}</p>
                  <p className="text-2xl font-bold text-red-600">
                    {allRequirements.filter(r => r.status === 'EXCEPTION').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Requirements List */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Compliance Requirements</h3>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading compliance requirements...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-2">
                    <Shield className="h-8 w-8 mx-auto" />
                  </div>
                  <p className="text-red-600">{error}</p>
                  <button
                    onClick={fetchComplianceRequirements}
                    className="mt-2 px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50"
                  >
                    Retry
                  </button>
                </div>
              ) : requirements.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No compliance requirements found</p>
              ) : (
                <div className="space-y-3">
                  {requirements.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{req.requirementName}</p>
                        <p className="text-sm text-gray-600">{req.assetCode} - {req.regime} ({req.jurisdiction})</p>
                        <p className="text-xs text-gray-500">Created: {new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          req.status === 'SATISFIED' ? 'bg-green-100 text-green-800' :
                          req.status === 'EXCEPTION' ? 'bg-red-100 text-red-800' :
                          req.status === 'AVAILABLE' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {req.status}
                        </span>
                        
                        {/* Platform Acknowledgement Status */}
                        {req.requiresPlatformAcknowledgement && (
                          <div className="flex items-center gap-2">
                            {req.platformAcknowledged ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Platform Acknowledged
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Platform Ack
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        {req.status === 'REQUIRED' && (
                          <CanManageCompliance fallback={null}>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRequirementStatusUpdate(req.id, 'SATISFIED')}
                                className="px-3 py-1 text-xs border border-green-600 text-green-600 bg-white rounded hover:bg-green-50"
                              >
{t('actions.markSatisfied')}
                              </button>
                              <button
                                onClick={() => handleRequirementStatusUpdate(req.id, 'EXCEPTION')}
                                className="px-3 py-1 text-xs border border-red-600 text-red-600 bg-white rounded hover:bg-red-50"
                              >
{t('actions.markException')}
                              </button>
                            </div>
                          </CanManageCompliance>
                        )}

                        {/* Platform Acknowledgement Button */}
                        {req.status === 'SATISFIED' && req.requiresPlatformAcknowledgement && !req.platformAcknowledged && (
                          <CanManageCompliance fallback={null}>
                            <button
                              onClick={() => openPlatformAckModal(req)}
                              className="px-3 py-1 text-xs border border-blue-600 text-blue-600 bg-white rounded hover:bg-blue-50"
                            >
                              Platform Acknowledge
                            </button>
                          </CanManageCompliance>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Issuances Tab */}
      {activeTab === 'issuances' && (
        <div className="space-y-6">
          {/* Records Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('compliance:page.complianceRecords', 'Compliance Records')}</h2>
                <div className="text-sm text-gray-500">
                  {t('compliance:page.totalRecords', '{{count}} total records', { count: pagination.total })}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">{t('compliance:page.loadingComplianceRecords', 'Loading compliance records...')}</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="text-red-600 mb-2">
                  <Shield className="h-8 w-8 mx-auto" />
                </div>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={fetchRecords}
                  className="mt-2 px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50"
                >
                  {t('compliance:actions.retry', 'Retry')}
                </button>
              </div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('compliance:messages.noComplianceRecordsFound', 'No compliance records found')}</h3>
                <p className="text-gray-600">
                  {Object.values(filters).some(f => f) 
                    ? t('compliance:messages.tryAdjustingYourFilters', 'Try adjusting your filters to see more results.')
                    : t('compliance:messages.complianceRecordsWillAppear', 'Compliance records will appear here once created.')
                  }
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          {t('compliance:table.recordId', 'Record ID')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          {t('compliance:table.asset', 'Asset')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          {t('compliance:table.holder', 'Holder')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          {t('compliance:table.status', 'Status')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          {t('compliance:table.created', 'Created')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          {t('compliance:table.actions', 'Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <ModernTooltip content={record.recordId}>
                              <div className="truncate no-native-tooltip" title="">
                                <div className="text-sm font-medium text-gray-900 truncate">{record.recordId}</div>
                              </div>
                            </ModernTooltip>
                          </td>
                          <td className="px-4 py-3">
                            <ModernTooltip content={record.assetRef}>
                              <div className="truncate no-native-tooltip" title="">
                                <div className="text-sm font-medium text-gray-900 truncate">{record.assetRef}</div>
                              </div>
                            </ModernTooltip>
                          </td>
                          <td className="px-4 py-3">
                            <ModernTooltip content={record.holder}>
                              <div className="truncate no-native-tooltip" title="">
                                <div className="text-sm font-medium text-gray-900 truncate font-mono">{record.holder}</div>
                              </div>
                            </ModernTooltip>
                          </td>
                          <td className="px-4 py-3">
                            <span className={getStatusBadge(record.status)}>
                              {getStatusIcon(record.status)}
                              <span className="ml-1 text-xs">{record.status.toLowerCase()}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <ModernTooltip content={formatDate(record.createdAt)}>
                              <div className="truncate no-native-tooltip" title="">
                                {formatDate(record.createdAt)}
                              </div>
                            </ModernTooltip>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => router.push(`/app/compliance/${record.recordId}`)}
                              className="inline-flex items-center justify-center px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors duration-200 border border-gray-200 hover:border-gray-300 whitespace-nowrap"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              {t('compliance:page.view', 'View')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        {t('compliance:pagination.showingResults', 'Showing {{start}} to {{end}} of {{total}} results', {
                          start: ((pagination.page - 1) * pagination.limit) + 1,
                          end: Math.min(pagination.page * pagination.limit, pagination.total),
                          total: pagination.total
                        })}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          {t('compliance:pagination.previous', 'Previous')}
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700">
                          {t('compliance:pagination.pageOf', 'Page {{current}} of {{total}}', { current: pagination.page, total: pagination.pages })}
                        </span>
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.pages}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          {t('compliance:pagination.next', 'Next')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Kernel Tab */}
      {activeTab === 'kernel' && (
        <div className="space-y-6">
          <PolicyKernelConsole />
        </div>
      )}

      {/* Platform Acknowledgement Modal */}
      {showPlatformAckModal && selectedRequirement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Platform Co-Acknowledgement</h3>
            <p className="text-sm text-gray-600 mb-4">
              Acknowledge compliance requirement for {selectedRequirement.assetClass} token: <strong>{selectedRequirement.requirementName}</strong>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acknowledgement Reason *
              </label>
              <textarea
                value={acknowledgmentReason}
                onChange={(e) => setAcknowledgmentReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Provide a reason for platform co-acknowledgement..."
                required
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPlatformAckModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={acknowledging}
              >
                Cancel
              </button>
              <button
                onClick={handlePlatformAcknowledgement}
                disabled={!acknowledgmentReason.trim() || acknowledging}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {acknowledging ? 'Acknowledging...' : 'Acknowledge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exception Reason Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Mark as Exception</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for marking this requirement as an exception.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exception Reason *
              </label>
              <textarea
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Provide a reason for the exception..."
                required
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowExceptionModal(false)
                  setPendingRequirementId(null)
                  setExceptionReason('')
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExceptionSubmit}
                disabled={!exceptionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
{t('actions.markException')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Format Selection Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {exportType === 'asset' ? 'Export Asset Compliance Report' : 'Export Filtered Compliance Data'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {exportType === 'asset' 
                ? 'Choose the export format for the comprehensive asset compliance report including all requirements and evidence.'
                : 'Choose the export format for the filtered compliance data based on your current filters.'
              }
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format *
              </label>
              <CustomDropdown
                value={exportFormat}
                onChange={(value) => setExportFormat(value as 'zip' | 'json' | 'csv')}
                options={[
                  { value: 'zip', label: 'ZIP Bundle (with evidence files)' },
                  { value: 'json', label: 'JSON Data (structured data only)' },
                  { value: 'csv', label: 'CSV Data (spreadsheet analysis)' }
                ]}
                placeholder="Select export format"
              />
              <div className="mt-2 text-xs text-gray-500">
                {exportFormat === 'zip' && 'Complete bundle with evidence files and comprehensive manifest'}
                {exportFormat === 'json' && 'Structured data for API integration and programmatic analysis'}
                {exportFormat === 'csv' && 'Structured CSV data for spreadsheet analysis and compliance reporting'}
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowExportModal(false)
                  setPendingExportAssetId(null)
                  setExportFormat('zip')
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExportSubmit}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Export {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Policy Kernel Console Component
function PolicyKernelConsole() {
  const { t } = useTranslation(['compliance', 'common'])
  const router = useRouter()
  const searchParams = useSearchParams()
  const assetId = searchParams.get('assetId')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kernelSummary, setKernelSummary] = useState<any>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [regimeFilter, setRegimeFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchAssets = async () => {
    try {
      const response = await api.GET('/v1/assets' as any, {})
      console.log('🔍 Assets API response:', response)
      
      if (response.data) {
        // Check if response.data is an array or has an assets property
        const assetsData = Array.isArray(response.data) ? response.data : response.data.assets
        if (Array.isArray(assetsData)) {
          console.log('🔍 Setting assets:', assetsData)
          setAssets(assetsData)
        } else {
          console.log('🔍 Assets data is not an array:', assetsData)
          setAssets([])
        }
      } else {
        console.log('🔍 No assets data received:', response.data)
        setAssets([])
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error)
      setAssets([])
    }
  }

  const fetchKernelSummary = async (targetAssetId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Get asset details
      const assetResponse = await api.GET(`/v1/assets/${targetAssetId}` as any, {})
      console.log('🔍 Asset API response:', assetResponse)
      if (assetResponse.data) {
        setSelectedAsset(assetResponse.data as any)
      }

      // Get requirement instances for the asset
      const requirementsResponse = await api.GET('/v1/compliance/requirements' as any, {
        params: { query: { assetId: targetAssetId } }
      })
      
      console.log('🔍 Requirements API response:', requirementsResponse)
      
      if (requirementsResponse.data) {
        const requirementInstances = Array.isArray(requirementsResponse.data) ? requirementsResponse.data : []
        console.log('🔍 Requirement instances:', requirementInstances)
        
        // Get unique regimes from requirement instances
        const regimes = Array.from(new Set(requirementInstances.map(ri => ri.requirementTemplate.regime)))
        
        // Calculate counters
        const counters = {
          evaluated: requirementInstances.length,
          applicable: requirementInstances.filter(ri => ri.status !== 'AVAILABLE').length,
          required: requirementInstances.filter(ri => ri.status === 'REQUIRED').length,
          satisfied: requirementInstances.filter(ri => ri.status === 'SATISFIED').length,
          exceptions: requirementInstances.filter(ri => ri.status === 'EXCEPTION').length
        }

        // Build policy facts from asset data
        const asset = assetResponse.data as any
        const facts = {
          issuerCountry: asset?.product?.organization?.country || 'Unknown',
          assetClass: asset?.assetClass || 'Unknown',
          targetMarkets: asset?.product?.targetMarkets || [],
          ledger: asset.ledger || 'Unknown',
          distributionType: 'private', // Default
          investorAudience: 'professional', // Default
          isCaspInvolved: true, // Default
          transferType: 'CASP_TO_CASP' // Default
        }

        // Build enforcement flags based on requirements
        const enforcementFlags = {
          xrpl: {
            requireAuth: requirementInstances.some(ri => 
              ri.requirementTemplate.enforcementHints?.xrpl?.requireAuth
            ),
            trustlineAuthorization: requirementInstances.some(ri => 
              ri.requirementTemplate.enforcementHints?.xrpl?.trustlineAuthorization
            ),
            freezeCapability: false // Default
          },
          evm: {
            allowlistGating: requirementInstances.some(ri => 
              ri.requirementTemplate.enforcementHints?.evm?.allowlistGating
            ),
            pauseControl: requirementInstances.some(ri => 
              ri.requirementTemplate.enforcementHints?.evm?.pauseControl
            )
          },
          hedera: {
            allowlistGating: requirementInstances.some(ri => 
              ri.requirementTemplate.enforcementHints?.hedera?.allowlistGating
            ),
            pauseControl: requirementInstances.some(ri => 
              ri.requirementTemplate.enforcementHints?.hedera?.pauseControl
            )
          }
        }

        setKernelSummary({
          facts,
          regimes,
          requirementInstances,
          counters,
          enforcementFlags
        })
      } else {
        // If no requirements found, create a mock summary for demo purposes
        const asset = assetResponse.data as any
        const mockSummary = {
          facts: {
            issuerCountry: asset?.product?.organization?.country || 'Unknown',
            assetClass: asset?.assetClass || 'Unknown',
            targetMarkets: asset?.product?.targetMarkets || [],
            ledger: asset.ledger || 'Unknown',
            distributionType: 'private',
            investorAudience: 'professional',
            isCaspInvolved: true,
            transferType: 'CASP_TO_CASP'
          },
          regimes: [
            { id: 'mica-v1', name: 'MiCA', version: '1.0', effectiveFrom: '2024-12-30' },
            { id: 'eu-tfr-v1', name: 'EU TFR', version: '1.0', effectiveFrom: '2024-12-30' }
          ],
          requirementInstances: [],
          counters: {
            evaluated: 0,
            applicable: 0,
            required: 0,
            satisfied: 0,
            exceptions: 0
          },
          enforcementFlags: {
            xrpl: { requireAuth: false, trustlineAuthorization: false, freezeCapability: false },
            evm: { allowlistGating: false, pauseControl: false },
            hedera: { allowlistGating: false, pauseControl: false }
          }
        }
        setKernelSummary(mockSummary)
      }
    } catch (error: any) {
      console.error('Failed to fetch kernel summary:', error)
      setError(error.message || 'Failed to load Policy Kernel Console')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [])

  useEffect(() => {
    if (assetId) {
      fetchKernelSummary(assetId)
    }
  }, [assetId])

  const handleAssetChange = (newAssetId: string) => {
    router.push(`/app/compliance?tab=kernel&assetId=${newAssetId}`)
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status) {
      case 'REQUIRED':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'SATISFIED':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'EXCEPTION':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'AVAILABLE':
        return `${baseClasses} bg-gray-100 text-gray-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'REQUIRED':
        return <XCircle className="h-3 w-3 mr-1" />
      case 'SATISFIED':
        return <CheckCircle className="h-3 w-3 mr-1" />
      case 'EXCEPTION':
        return <AlertTriangle className="h-3 w-3 mr-1" />
      case 'AVAILABLE':
        return <Clock className="h-3 w-3 mr-1" />
      default:
        return <Clock className="h-3 w-3 mr-1" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredRequirements = kernelSummary?.requirementInstances.filter((ri: any) => {
    const matchesStatus = !statusFilter || ri.status === statusFilter
    const matchesRegime = !regimeFilter || ri.requirementTemplate.regime.name === regimeFilter
    const matchesSearch = !searchTerm || 
      ri.requirementTemplate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ri.requirementTemplate.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesRegime && matchesSearch
  }) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="h-6 w-6 text-blue-600 animate-pulse" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Policy Kernel...</h3>
          <p className="text-gray-600">Evaluating compliance facts and requirements.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <XCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading Policy Kernel Console</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="h-6 w-6 text-blue-600" />
              Policy Kernel Console
            </h1>
            <p className="text-sm text-gray-600 mt-1">Policy evaluation engine and compliance analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <CustomDropdown
            options={assets.length > 0 ? assets.map(asset => ({ value: asset.id, label: `${asset.code} - ${asset.name}` })) : []}
            value={assetId || ''}
            onChange={handleAssetChange}
            placeholder={assets.length > 0 ? "Select Asset" : "Loading assets..."}
            className="min-w-64"
          />
        </div>
      </div>

      {!assetId && assets.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Select an Asset</h3>
              <p className="mt-1 text-sm text-blue-700">Choose an asset from the dropdown above to view its Policy Kernel evaluation.</p>
            </div>
          </div>
        </div>
      )}

      {assets.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <Info className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No Assets Available</h3>
              <p className="mt-1 text-sm text-yellow-700">No assets found. Please create an asset first to view Policy Kernel evaluation.</p>
            </div>
          </div>
        </div>
      )}

      {kernelSummary && (
        <>
          {/* A1 - Kernel Summary Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Policy Facts & Regime Analysis</h2>
            
            {/* Facts Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Issuer Country</div>
                <div className="text-sm font-semibold text-gray-900">{kernelSummary.facts.issuerCountry}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asset Class</div>
                <div className="text-sm font-semibold text-gray-900">{kernelSummary.facts.assetClass}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Target Markets</div>
                <div className="text-sm font-semibold text-gray-900">{kernelSummary.facts.targetMarkets.join(', ') || 'None'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ledger</div>
                <div className="text-sm font-semibold text-gray-900">{kernelSummary.facts.ledger}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Distribution</div>
                <div className="text-sm font-semibold text-gray-900">{kernelSummary.facts.distributionType}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Investor Audience</div>
                <div className="text-sm font-semibold text-gray-900">{kernelSummary.facts.investorAudience}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">CASP Involved</div>
                <div className="text-sm font-semibold text-gray-900">{kernelSummary.facts.isCaspInvolved ? 'Yes' : 'No'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transfer Type</div>
                <div className="text-sm font-semibold text-gray-900">{kernelSummary.facts.transferType}</div>
              </div>
            </div>

            {/* Regime Badges */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Active Regulatory Regimes</h3>
              <div className="flex flex-wrap gap-2">
                {kernelSummary.regimes.map((regime: any) => (
                  <span
                    key={regime.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {regime.name} v{regime.version}
                    <ModernTooltip content={`Effective: ${formatDate(regime.effectiveFrom)}`}>
                      <Info className="h-3 w-3 ml-1" />
                    </ModernTooltip>
                  </span>
                ))}
              </div>
            </div>

            {/* Counter Strip */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Requirement Evaluation Pipeline</h3>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{kernelSummary.counters.evaluated}</div>
                  <div className="text-xs text-gray-600">Evaluated</div>
                </div>
                <div className="text-gray-400">→</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{kernelSummary.counters.applicable}</div>
                  <div className="text-xs text-gray-600">Applicable</div>
                </div>
                <div className="text-gray-400">→</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{kernelSummary.counters.required}</div>
                  <div className="text-xs text-gray-600">Required</div>
                </div>
                <div className="text-gray-400">→</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{kernelSummary.counters.satisfied}</div>
                  <div className="text-xs text-gray-600">Satisfied</div>
                </div>
                <div className="text-gray-400">→</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{kernelSummary.counters.exceptions}</div>
                  <div className="text-xs text-gray-600">Exceptions</div>
                </div>
              </div>
            </div>
          </div>

          {/* A2 - Requirements Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Requirement Instances</h2>
                
                {/* Filters */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search requirements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <CustomDropdown
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'REQUIRED', label: 'Required' },
                      { value: 'SATISFIED', label: 'Satisfied' },
                      { value: 'EXCEPTION', label: 'Exception' },
                      { value: 'AVAILABLE', label: 'N/A' }
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Filter by Status"
                    className="min-w-32"
                  />
                  
                  <CustomDropdown
                    options={[
                      { value: '', label: 'All Regimes' },
                      ...kernelSummary.regimes.map((regime: any) => ({ value: regime.name, label: regime.name }))
                    ]}
                    value={regimeFilter}
                    onChange={setRegimeFilter}
                    placeholder="Filter by Regime"
                    className="min-w-32"
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Why</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regime</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Verified</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequirements.map((requirement: any) => (
                    <tr key={requirement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{requirement.requirementTemplate.name}</div>
                          {requirement.requirementTemplate.description && (
                            <div className="text-sm text-gray-500">{requirement.requirementTemplate.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(requirement.status)}>
                          {getStatusIcon(requirement.status)}
                          {requirement.status === 'AVAILABLE' ? 'N/A' : requirement.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {requirement.rationale || (
                            <span className="text-gray-500 italic">
                              {requirement.status === 'AVAILABLE' 
                                ? 'Not applicable to this asset configuration'
                                : 'Evaluation in progress'
                              }
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {requirement.requirementTemplate.regime.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        v{requirement.requirementTemplate.version}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {requirement.verifiedAt ? formatDate(requirement.verifiedAt) : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* A4 - Kernel Outputs Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Enforcement Flags</h2>
            <p className="text-sm text-gray-600 mb-6">Policy-derived enforcement signals emitted to ledger adapters</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* XRPL */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">XRPL (Active)</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">RequireAuth</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      kernelSummary.enforcementFlags.xrpl.requireAuth 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {kernelSummary.enforcementFlags.xrpl.requireAuth ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Trustline Authorization</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      kernelSummary.enforcementFlags.xrpl.trustlineAuthorization 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {kernelSummary.enforcementFlags.xrpl.trustlineAuthorization ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Freeze Capability</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Available
                    </span>
                  </div>
                </div>
              </div>

              {/* EVM */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">EVM (Installed)</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Installed
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Allowlist Gating</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      kernelSummary.enforcementFlags.evm.allowlistGating 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {kernelSummary.enforcementFlags.evm.allowlistGating ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pause Control</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      kernelSummary.enforcementFlags.evm.pauseControl 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {kernelSummary.enforcementFlags.evm.pauseControl ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Not enabled for this asset
                </div>
              </div>

              {/* Hedera */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Hedera (Installed)</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Installed
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Allowlist Gating</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      kernelSummary.enforcementFlags.hedera.allowlistGating 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {kernelSummary.enforcementFlags.hedera.allowlistGating ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pause Control</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      kernelSummary.enforcementFlags.hedera.pauseControl 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {kernelSummary.enforcementFlags.hedera.pauseControl ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Not enabled for this asset
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
