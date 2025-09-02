'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { CheckCircle, XCircle, AlertCircle, Clock, FileText, Shield, Globe } from 'lucide-react'

interface RequirementInstance {
  id: string
  status: 'NA' | 'REQUIRED' | 'SATISFIED' | 'EXCEPTION'
  rationale?: string
  evidenceRefs?: Record<string, any>
  exceptionReason?: string
  notes?: string
  requirementTemplate: {
    id: string
    name: string
    description: string
    regime: {
      name: string
      version: string
    }
  }
}

interface Asset {
  id: string
  code: string
  status: string
  product: {
    name: string
    assetClass: string
  }
  organization: {
    name: string
  }
}

export default function AssetCompliancePage() {
  const { t } = useTranslation(['assets', 'common'])
  const params = useParams()
  const assetId = params.id as string
  
  const [asset, setAsset] = useState<Asset | null>(null)
  const [requirements, setRequirements] = useState<RequirementInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchAssetCompliance()
  }, [assetId])

  const fetchAssetCompliance = async () => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      
      // Fetch asset details
      const assetResponse = await fetch(`${apiUrl}/v1/assets/${assetId}`, {
        credentials: 'include'
      })
      
      if (!assetResponse.ok) {
        throw new Error('Failed to fetch asset')
      }
      
      const assetData = await assetResponse.json()
      setAsset(assetData)
      
      // Fetch requirement instances
      const requirementsResponse = await fetch(`${apiUrl}/v1/compliance/requirements?assetId=${assetId}`, {
        credentials: 'include'
      })
      
      if (!requirementsResponse.ok) {
        throw new Error('Failed to fetch requirements')
      }
      
      const requirementsData = await requirementsResponse.json()
      setRequirements(requirementsData.requirements || [])
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateRequirementStatus = async (requirementId: string, status: string, evidence?: any, notes?: string) => {
    try {
      setUpdating(requirementId)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      
      const response = await fetch(`${apiUrl}/v1/compliance/requirements/${requirementId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status,
          evidenceRefs: evidence || {},
          notes: notes || ''
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update requirement')
      }
      
      // Refresh requirements
      await fetchAssetCompliance()
      
    } catch (err: any) {
      console.error('Error updating requirement:', err)
      alert(`Failed to update requirement: ${err.message}`)
    } finally {
      setUpdating(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SATISFIED':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'EXCEPTION':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'NA':
        return <Clock className="w-5 h-5 text-gray-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SATISFIED':
        return 'bg-green-50 border-green-200'
      case 'EXCEPTION':
        return 'bg-red-50 border-red-200'
      case 'NA':
        return 'bg-gray-50 border-gray-200'
      default:
        return 'bg-yellow-50 border-yellow-200'
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Error loading compliance data</span>
          </div>
          <p className="text-red-600 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  const requiredCount = requirements.filter(r => r.status === 'REQUIRED').length
  const satisfiedCount = requirements.filter(r => r.status === 'SATISFIED').length
  const exceptionCount = requirements.filter(r => r.status === 'EXCEPTION').length

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-slate-600" />
          <h1 className="text-3xl font-bold text-gray-900">Asset Compliance</h1>
        </div>
        
        {asset && (
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{asset.code}</h3>
                <p className="text-sm text-gray-600">{asset.product.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Asset Class</p>
                <p className="font-medium">{asset.product.assetClass}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Organization</p>
                <p className="font-medium">{asset.organization.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compliance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-600">{requiredCount}</p>
              <p className="text-sm text-gray-600">Required</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-600">{satisfiedCount}</p>
              <p className="text-sm text-gray-600">Satisfied</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-600">{exceptionCount}</p>
              <p className="text-sm text-gray-600">Exceptions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-600">{requirements.length}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Compliance Requirements</h2>
        
        {requirements.map((requirement) => (
          <div 
            key={requirement.id} 
            className={`bg-white rounded-lg border shadow-sm p-6 ${getStatusColor(requirement.status)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(requirement.status)}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {requirement.requirementTemplate.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {requirement.requirementTemplate.regime.name} v{requirement.requirementTemplate.regime.version}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  requirement.status === 'SATISFIED' ? 'bg-green-100 text-green-800' :
                  requirement.status === 'EXCEPTION' ? 'bg-red-100 text-red-800' :
                  requirement.status === 'NA' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {requirement.status}
                </span>
              </div>
            </div>
            
            <p className="text-gray-700 mb-4">{requirement.requirementTemplate.description}</p>
            
            {requirement.rationale && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Rationale:</strong> {requirement.rationale}
                </p>
              </div>
            )}
            
            {requirement.status === 'REQUIRED' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateRequirementStatus(requirement.id, 'SATISFIED')}
                  disabled={updating === requirement.id}
                  className="px-4 py-2 border border-green-600 text-green-600 bg-white rounded-md hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating === requirement.id ? 'Updating...' : 'Mark Satisfied'}
                </button>
                
                <button
                  onClick={() => updateRequirementStatus(requirement.id, 'EXCEPTION')}
                  disabled={updating === requirement.id}
                  className="px-4 py-2 border border-red-600 text-red-600 bg-white rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating === requirement.id ? 'Updating...' : 'Mark Exception'}
                </button>
              </div>
            )}
            
            {requirement.status === 'EXCEPTION' && requirement.exceptionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-red-800">
                  <strong>Exception Reason:</strong> {requirement.exceptionReason}
                </p>
              </div>
            )}
            
            {requirement.notes && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-gray-700">
                  <strong>Notes:</strong> {requirement.notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
