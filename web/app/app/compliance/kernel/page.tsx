'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  Brain, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ArrowLeft,
  Info,
  ExternalLink,
  Filter,
  Search
} from 'lucide-react'
import CustomDropdown from '../../../components/CustomDropdown'
import ModernTooltip from '../../../components/ModernTooltip'

interface PolicyFacts {
  issuerCountry: string
  assetClass: 'ART' | 'EMT' | 'OTHER'
  targetMarkets: string[]
  ledger: 'XRPL' | 'ETHEREUM' | 'HEDERA'
  distributionType: 'offer' | 'admission' | 'private'
  investorAudience: 'retail' | 'professional' | 'institutional'
  isCaspInvolved: boolean
  transferType: 'CASP_TO_CASP' | 'CASP_TO_SELF_HOSTED' | 'SELF_HOSTED_TO_CASP' | 'SELF_HOSTED_TO_SELF_HOSTED'
}

interface Regime {
  id: string
  name: string
  version: string
  effectiveFrom: string
  effectiveTo?: string
  description?: string
  metadata?: any
}

interface RequirementTemplate {
  id: string
  name: string
  description?: string
  applicabilityExpr: string
  dataPoints: string[]
  enforcementHints?: any
  version: string
  effectiveFrom: string
  effectiveTo?: string
  regime: Regime
}

interface RequirementInstance {
  id: string
  assetId: string
  status: 'REQUIRED' | 'SATISFIED' | 'EXCEPTION' | 'AVAILABLE'
  rationale?: string
  exceptionReason?: string
  verifiedAt?: string
  verifierId?: string
  requirementTemplate: RequirementTemplate
  createdAt: string
  updatedAt: string
}

interface Asset {
  id: string
  code: string
  name: string
  ledger: string
  assetClass: string
  status: string
  product: {
    name: string
    organization: {
      name: string
      country: string
    }
  }
}

interface KernelSummary {
  facts: PolicyFacts
  regimes: Regime[]
  requirementInstances: RequirementInstance[]
  counters: {
    evaluated: number
    applicable: number
    required: number
    satisfied: number
    exceptions: number
  }
  enforcementFlags: {
    xrpl: {
      requireAuth: boolean
      trustlineAuthorization: boolean
      freezeCapability: boolean
    }
    evm: {
      allowlistGating: boolean
      pauseControl: boolean
    }
    hedera: {
      allowlistGating: boolean
      pauseControl: boolean
    }
  }
}

export default function PolicyKernelConsolePage() {
  const { t } = useTranslation(['compliance', 'common'])
  const router = useRouter()
  const searchParams = useSearchParams()
  const assetId = searchParams.get('assetId')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kernelSummary, setKernelSummary] = useState<KernelSummary | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [regimeFilter, setRegimeFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchAssets = async () => {
    try {
      const response = await api.GET('/v1/assets' as any, {})
      if (response.data) {
        setAssets(response.data as Asset[])
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    }
  }

  const fetchKernelSummary = async (targetAssetId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Get asset details
      const assetResponse = await api.GET(`/v1/assets/${targetAssetId}` as any, {})
      if (assetResponse.data) {
        setSelectedAsset(assetResponse.data as Asset)
      }

      // Get requirement instances for the asset
      const requirementsResponse = await api.GET('/v1/compliance/requirements' as any, {
        params: { query: { assetId: targetAssetId } }
      })
      
      if (requirementsResponse.data) {
        const requirementInstances = requirementsResponse.data as RequirementInstance[]
        
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
        const facts: PolicyFacts = {
          issuerCountry: asset.product.organization.country,
          assetClass: asset.assetClass,
          targetMarkets: asset.product.targetMarkets || [],
          ledger: asset.ledger,
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
    router.push(`/app/compliance/kernel?assetId=${newAssetId}`)
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

  const filteredRequirements = kernelSummary?.requirementInstances.filter(ri => {
    const matchesStatus = !statusFilter || ri.status === statusFilter
    const matchesRegime = !regimeFilter || ri.requirementTemplate.regime.name === regimeFilter
    const matchesSearch = !searchTerm || 
      ri.requirementTemplate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ri.requirementTemplate.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesRegime && matchesSearch
  }) || []

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/app/compliance')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Compliance
          </button>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="h-6 w-6 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Policy Kernel...</h3>
            <p className="text-gray-600">Evaluating compliance facts and requirements.</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/app/compliance')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Compliance
          </button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading Policy Kernel Console</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
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
          <button
            onClick={() => router.push('/app/compliance')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Compliance
          </button>
          
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
            options={assets.map(asset => ({ value: asset.id, label: `${asset.code} - ${asset.name}` }))}
            value={assetId || ''}
            onChange={handleAssetChange}
            placeholder="Select Asset"
            className="min-w-64"
          />
        </div>
      </div>

      {!assetId && (
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
                {kernelSummary.regimes.map(regime => (
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
                      ...kernelSummary.regimes.map(regime => ({ value: regime.name, label: regime.name }))
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
                  {filteredRequirements.map((requirement) => (
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
