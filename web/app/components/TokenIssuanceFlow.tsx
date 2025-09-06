'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api, ensureJson } from '@/lib/api'
import FormField from './FormField'
import TransactionResult from './TransactionResult'
import LedgerLogo from './LedgerLogo'
import CustomDropdown from './CustomDropdown'

type LedgerType = 'XRPL' | 'HEDERA' | 'ETHEREUM'
type Step = 'ledger-selection' | 'asset-selection' | 'trustline-check' | 'token-issuance' | 'compliance-metadata' | 'success' | 'coming-soon'

interface TrustlineData {
  currencyCode: string
  holderAddress: string
  issuerAddress: string
  limit: string
  noRipple: boolean
  requireAuth: boolean
}

interface TrustlineCheckData {
  currencyCode: string
  holderAddress: string
  issuerAddress: string
}

interface TokenData {
  currencyCode: string
  amount: string
  destination: string
  metadata: Record<string, any>
  metadataRaw: string // Store raw text for editing
}

interface Asset {
  id: string
  assetRef: string
  ledger: string
  network: string
  issuer: string
  code: string
  decimals: number
  complianceMode: 'OFF' | 'RECORD_ONLY' | 'GATED_BEFORE'
  status: 'draft' | 'active' | 'paused' | 'retired'
  createdAt: string
  controls?: {
    requireAuth?: boolean
    freeze?: boolean
    clawback?: boolean
    transferFeeBps?: number
  }
  registry?: {
    lei?: string
    micaClass?: string
    jurisdiction?: string
    whitePaperRef?: string
    reserveAssets?: string
    custodian?: string
    riskAssessment?: string
  }
  product?: { id: string; name: string; assetClass?: string }
  organization?: { id: string; name: string; country?: string }
}

interface ComplianceData {
  isin: string
  micaClassification: 'stablecoin' | 'security_token' | 'utility_token' | 'asset_backed'
  kycRequirement: 'mandatory' | 'optional' | 'not_required'
  jurisdiction: string
  expirationDate?: string
  transferRestrictions: boolean
  maxTransferAmount?: string
}

interface ComplianceRecord {
  recordId: string
  sha256: string
  createdAt: string
}

interface IssuanceResult {
  txId?: string
  txHash?: string
  explorer?: string
  trustlineTxHash?: string
  trustlineExplorer?: string
  manifestHash?: string
  publicMetadata?: Record<string, any>
  complianceRecord?: ComplianceRecord
  compliance?: {
    status?: string
    requirementCount?: number
    requirements?: Array<{
      id: string
      status: string
      template?: {
        name: string
      }
    }>
  }
  id?: string
  authUrl?: string
  message?: string
}

interface TokenIssuanceFlowProps {
  preSelectedAssetId?: string | null
}

export default function TokenIssuanceFlow({ preSelectedAssetId }: TokenIssuanceFlowProps) {
  const { t } = useTranslation(['issuances', 'common'])
  const [currentStep, setCurrentStep] = useState<Step>('ledger-selection')
  const [selectedLedger, setSelectedLedger] = useState<LedgerType>('XRPL')
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetsError, setAssetsError] = useState<string | null>(null)
    const [trustlineCheckData, setTrustlineCheckData] = useState<TrustlineCheckData>({ 
    currencyCode: '', 
    holderAddress: '',
    issuerAddress: ''
  })
  
  const [trustlineData, setTrustlineData] = useState<TrustlineData>({
    currencyCode: '',
    holderAddress: '',
    issuerAddress: '',
    limit: '',
    noRipple: false,
    requireAuth: true // Default to true for institutional use cases
  })
  const [tokenData, setTokenData] = useState<TokenData>({
    currencyCode: '',
    amount: '',
    destination: '',
    metadata: {},
    metadataRaw: ''
  })
  const [complianceData, setComplianceData] = useState<ComplianceData>({
    isin: '',
    micaClassification: 'utility_token',
    kycRequirement: 'optional',
    jurisdiction: '',
    expirationDate: '',
    transferRestrictions: false,
    maxTransferAmount: ''
  })
  const [result, setResult] = useState<IssuanceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trustlineCheckResult, setTrustlineCheckResult] = useState<{
    exists: boolean
    details?: any
  } | null>(null)
  const [complianceRecord, setComplianceRecord] = useState<ComplianceRecord | null>(null)
  const [anchorCompliance, setAnchorCompliance] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [assetRegistryPrefill, setAssetRegistryPrefill] = useState<{ jurisdiction?: string; micaClass?: string } | null>(null)

  // Security: Always use wallet signing mode, never handle private keys

  // Fetch assets for the selected ledger
  const fetchAssets = async () => {
    setAssetsLoading(true)
    setAssetsError(null)
    
    try {
      const { data, error } = await api.GET('/v1/assets', {
        params: {
          query: {
            ledger: selectedLedger.toLowerCase() as 'xrpl' | 'hedera' | 'ethereum',
            status: 'active',
            limit: 50,
            offset: 0
          }
        }
      })

      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error((error as any).error || 'Failed to fetch assets')
      }

      if (!data || !data.assets) {
        throw new Error('No assets data received')
      }

      // Transform API response to match our Asset interface
      const transformedAssets: Asset[] = data.assets.map((asset: any) => ({
        id: asset.id || '',
        assetRef: asset.assetRef || '',
        ledger: asset.ledger || '',
        network: asset.network || '',
        issuer: asset.issuer || '',
        code: asset.code || '',
        decimals: asset.decimals || 0,
        complianceMode: asset.complianceMode || 'RECORD_ONLY',
        status: asset.status || 'draft',
        createdAt: asset.createdAt || new Date().toISOString(),
        controls: asset.controls,
        registry: asset.registry,
        product: asset.product,
        organization: asset.organization
      }))
      
      setAssets(transformedAssets)
      
      // Auto-select pre-selected asset if provided
      if (preSelectedAssetId) {
        const preSelectedAsset = transformedAssets.find(asset => asset.id === preSelectedAssetId)
        if (preSelectedAsset) {
          // Fetch full asset data for pre-selected asset
          try {
            const { data } = await api.GET(`/v1/assets/${preSelectedAssetId}` as any, {})
            const fullAsset = data as any
            
            const enhancedAsset = {
              ...preSelectedAsset,
              controls: fullAsset.controls,
              registry: fullAsset.registry,
              metadata: fullAsset.metadata,
              product: fullAsset.product,
              organization: fullAsset.organization
            }
            
            setSelectedAsset(enhancedAsset)
            console.log('Pre-selected enhanced asset with controls:', enhancedAsset)
            
            // Auto-proceed to next step
            setCurrentStep('trustline-check')
            // Update trustline check data with asset info
            setTrustlineCheckData(prev => ({
              ...prev,
              currencyCode: enhancedAsset.code,
              issuerAddress: enhancedAsset.issuer
            }))
          } catch (error) {
            console.error('Error fetching pre-selected asset data:', error)
            setSelectedAsset(preSelectedAsset)
            // Auto-proceed to next step
            setCurrentStep('trustline-check')
            // Update trustline check data with asset info
            setTrustlineCheckData(prev => ({
              ...prev,
              currencyCode: preSelectedAsset.code,
              issuerAddress: preSelectedAsset.issuer
            }))
          }
          // Update token data with asset info
          setTokenData(prev => ({
            ...prev,
            currencyCode: preSelectedAsset.code
          }))
        }
      } else {
        // Auto-select if only one asset (original behavior)
        if (transformedAssets.length === 1) {
          setSelectedAsset(transformedAssets[0])
        }
      }
    } catch (err: any) {
      console.error('Error fetching assets:', err)
      setAssetsError(err.message || 'Failed to fetch assets')
    } finally {
      setAssetsLoading(false)
    }
  }

  // Handle pre-selected asset ID
  useEffect(() => {
    if (preSelectedAssetId) {
      // Skip ledger selection and go directly to asset selection
      setCurrentStep('asset-selection')
      // Fetch assets to find the pre-selected one
      fetchAssets()
    }
  }, [preSelectedAssetId])

  // Fetch assets when entering asset selection step
  useEffect(() => {
    if (currentStep === 'asset-selection' && selectedLedger && !preSelectedAssetId) {
      fetchAssets()
    }
  }, [currentStep, selectedLedger, preSelectedAssetId])

  const ledgers: { type: LedgerType; name: string; description: string; status: 'live' | 'beta' | 'coming-soon' }[] = [
    {
      type: 'XRPL',
      name: 'XRPL (XRP Ledger)',
      description: 'Fast, energy-efficient blockchain for payments and tokenization',
      status: 'live'
    },
    {
      type: 'HEDERA',
      name: 'Hedera',
      description: 'Enterprise-grade public network for the decentralized economy',
      status: 'coming-soon'
    },
    {
      type: 'ETHEREUM',
      name: 'Ethereum',
      description: 'Decentralized platform for smart contracts and dApps',
      status: 'coming-soon'
    }
  ]

  const handleLedgerSelection = (ledger: LedgerType) => {
    setSelectedLedger(ledger)
    
    // Different flows for different ledgers
    if (ledger === 'XRPL') {
      setCurrentStep('asset-selection')
    } else {
      // For Hedera and Ethereum, show coming soon
      setCurrentStep('coming-soon')
    }
  }

  const handleAssetSelection = async (asset: Asset) => {
    // Fetch full asset data including controls and registry
    try {
      const { data } = await api.GET(`/v1/assets/${asset.id}` as any, {})
      const fullAsset = data as any
      
      // Merge the full asset data with the existing asset data
      const enhancedAsset = {
        ...asset,
        controls: fullAsset.controls,
        registry: fullAsset.registry,
        metadata: fullAsset.metadata,
        product: fullAsset.product,
        organization: fullAsset.organization
      }
      
      setSelectedAsset(enhancedAsset)
      console.log('Enhanced asset with controls:', enhancedAsset)
      
      // Update trustline check data with asset info
      setTrustlineCheckData(prev => ({
        ...prev,
        currencyCode: enhancedAsset.code,
        issuerAddress: enhancedAsset.issuer
      }))
      
      // Update token data with asset info
      setTokenData(prev => ({
        ...prev,
        currencyCode: enhancedAsset.code
      }))
    } catch (error) {
      console.error('Error fetching full asset data:', error)
      // Fallback to the basic asset data
      setSelectedAsset(asset)
      
      // Update trustline check data with asset info
      setTrustlineCheckData(prev => ({
        ...prev,
        currencyCode: asset.code,
        issuerAddress: asset.issuer
      }))
      
      // Update token data with asset info
      setTokenData(prev => ({
        ...prev,
        currencyCode: asset.code
      }))
    }
    
    // Proceed to next step
    setCurrentStep('trustline-check')
  }

  const handleTrustlineCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
       // Check if we have a selected asset
      if (!selectedAsset) {
        throw new Error('No asset selected. Please go back and select an asset.')
      }

      // Validate holder address format
      if (!trustlineCheckData.holderAddress || !trustlineCheckData.holderAddress.match(/^r[a-zA-Z0-9]{24,34}$/)) {
        throw new Error('Invalid holder address format. Must be a valid XRPL address starting with "r"')
      }

              // Use the real authorization check API
      console.log('Selected asset:', selectedAsset)
      console.log('Asset ID being used:', selectedAsset.id)
      console.log('Checking trustline for:', trustlineCheckData)
      
      const apiUrl = `/v1/assets/${selectedAsset.id}/authorizations/${trustlineCheckData.holderAddress}`
      console.log('API URL:', apiUrl)
      
      const { data, error } = await api.GET(apiUrl as any, {})

      console.log('API response:', { data, error })

      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error((error as any).error || 'Failed to check trustline')
      }

      if (!data) {
        throw new Error('No response data received')
      }

      // Handle the response data safely
      const responseData = data as any
      setTrustlineCheckResult({
        exists: responseData.exists,
        details: responseData.details || null
      })
    } catch (err: any) {
      console.error('Trustline check error:', err)
      setError(err.message || 'Failed to check trustline')
    } finally {
      setLoading(false)
    }
  }

  const handleOptInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Check if we have a selected asset
      if (!selectedAsset) {
        throw new Error('No asset selected. Please go back and select an asset.')
      }

      // Validate holder address format
      if (!trustlineCheckData.holderAddress || !trustlineCheckData.holderAddress.match(/^r[a-zA-Z0-9]{24,34}$/)) {
        throw new Error('Invalid holder address format. Must be a valid XRPL address starting with "r"')
      }

      // Use the real authorization setup API
      console.log('Creating trustline for asset:', selectedAsset)
      console.log('Trustline data:', trustlineData)
      console.log('Holder address being used:', trustlineCheckData.holderAddress)
      console.log('Holder address type:', typeof trustlineCheckData.holderAddress)
      
      const apiUrl = `/v1/assets/${selectedAsset.id}/authorizations/${trustlineCheckData.holderAddress}`
      console.log('API URL:', apiUrl)
      
      const { data, error } = await api.PUT(apiUrl as any, {
        body: {
          params: {
            limit: trustlineData.limit || '1000000000', // Default limit if not specified
            holderAddress: trustlineData.holderAddress,
            currencyCode: trustlineData.currencyCode,
            issuerAddress: trustlineData.issuerAddress
          },
          signing: {
            mode: 'wallet' // Always use wallet mode for security
          }
        }
      })

      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error((error as any).error || 'Failed to create trustline')
      }

      if (!data) {
        throw new Error('No response data received')
      }

      // Handle the response data safely
      const responseData = data as any
      setResult(prev => ({
        ...prev,
        trustlineTxHash: responseData.txId || 'pending',
        trustlineExplorer: responseData.explorer || `https://testnet.xrpl.org/transactions/${responseData.txId || 'pending'}`
      }))

      setCurrentStep('compliance-metadata')
    } catch (err: any) {
      console.error('Authorization submit error:', err)
      setError(err.message || 'Failed to create trustline')
    } finally {
      setLoading(false)
    }
  }

  // Create authorization request for the "Send Authorization Request" button
  const createAuthorizationRequest = async () => {
    if (!selectedAsset) {
      setError('Please select an asset first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await api.PUT('/v1/assets/{assetId}/authorizations/{holder}', {
        params: {
          path: {
            assetId: selectedAsset.id,
            holder: trustlineData.holderAddress
          },
          body: {
            params: {
              holderAddress: trustlineData.holderAddress,
              currencyCode: trustlineData.currencyCode,
              issuerAddress: trustlineData.issuerAddress,
              limit: trustlineData.limit,
              noRipple: trustlineData.noRipple,
              requireAuth: trustlineData.requireAuth,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
              callbackUrl: `${window.location.origin}/app/issuance/history`
            },
            signing: {
              mode: 'wallet'
            }
          }
        }
      })

      if (error) {
        throw new Error(error.error || 'Failed to create authorization request')
      }

      if (!data) {
        throw new Error('No data received from server')
      }

      // Show success message and the authorization URL
      setResult({
        txId: (data as any).id,
        explorer: (data as any).authUrl,
        message: 'Authorization request created successfully! The holder can now use the secure link to set up their trustline.'
      })
      
      setCurrentStep('success')
    } catch (err: any) {
      console.error('Error creating authorization request:', err)
      setError(err.message || 'Failed to create authorization request')
    } finally {
      setLoading(false)
    }
  }

  const handleTokenIssuance = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Check if we have a selected asset
      if (!selectedAsset) {
        throw new Error('No asset selected. Please go back and select an asset.')
      }

      // Prepare the issuance request with compliance facts
      const issuanceRequest = {
        holder: tokenData.destination,
        amount: tokenData.amount.toString(),
        issuanceFacts: {
          isin: complianceData.isin,
          legal_issuer: selectedAsset?.organization?.name || '',
          jurisdiction: complianceData.jurisdiction,
          mica_class: complianceData.micaClassification,
          kyc_requirement: complianceData.kycRequirement,
          transfer_restrictions: complianceData.transferRestrictions.toString()
        },
        anchor: anchorCompliance,
        publicMetadata: Object.keys(tokenData.metadata).length > 0 ? tokenData.metadata : undefined
      }

      // Generate idempotency key
      const idempotencyKey = `issuance_${selectedAsset.id}_${tokenData.destination}_${Date.now()}`

      console.log('Issuing token with request:', issuanceRequest)

      // Use the new asset-centric API with idempotency
      const { data, error } = await api.POST(`/v1/assets/${selectedAsset.id}/issuances` as any, {
        body: issuanceRequest,
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      })

      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error((error as any).error || 'Failed to issue token')
      }

      if (!data) {
        throw new Error('No response data received')
      }

      // Handle the response data safely
      const responseData = data as any
      console.log('🎯 Issuance response:', responseData)
      console.log('🔍 Transaction ID from response:', responseData.txId)
      console.log('🔍 Explorer URL from response:', responseData.explorer)

      setResult(prev => ({
        ...prev,
        txId: responseData.txId,
        txHash: responseData.txId, // Keep for backward compatibility
        explorer: responseData.explorer,
        manifestHash: responseData.manifestHash,
        publicMetadata: tokenData.metadata,
        compliance: responseData.compliance,
        complianceRecord: {
          recordId: responseData.manifestHash || responseData.issuanceId,
          sha256: responseData.manifestHash || '',
          createdAt: responseData.createdAt
        }
      }))

      setCurrentStep('success')
    } catch (err: any) {
      console.error('Token issuance error:', err)
      setError(err.message || 'Failed to issue token')
    } finally {
      setLoading(false)
    }
  }

  const handleComplianceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // First, evaluate compliance using the new v1 API
      const complianceRequest = {
        issuerCountry: (selectedAsset as any)?.organization?.country || 'DE',
        assetClass: (selectedAsset as any)?.product?.assetClass || 'OTHER',
        targetMarkets: (selectedAsset as any)?.product?.targetMarkets || ['DE'],
        ledger: selectedAsset?.ledger?.toUpperCase() || 'XRPL',
        distributionType: 'private', // Default for now
        investorAudience: 'professional', // Default for now
        isCaspInvolved: true, // Default for now
        transferType: 'CASP_TO_SELF_HOSTED' // Default for now
      }

      console.log('Evaluating compliance:', complianceRequest)

      const { data: evaluationData, error: evaluationError } = await api.POST('/v1/compliance/evaluate' as any, {
        body: complianceRequest
      })

      if (evaluationError && typeof evaluationError === 'object' && 'error' in evaluationError) {
        throw new Error((evaluationError as any).error || 'Failed to evaluate compliance')
      }

      if (!evaluationData) {
        throw new Error('No compliance evaluation data received')
      }

      console.log('Compliance evaluation result:', evaluationData)

      // Store compliance data for issuance (will be included in manifest)
      const issuanceFacts = {
        isin: complianceData.isin,
        legal_issuer: selectedAsset?.organization?.name || '',
        jurisdiction: complianceData.jurisdiction,
        mica_class: complianceData.micaClassification,
        kyc_requirement: complianceData.kycRequirement,
        transfer_restrictions: complianceData.transferRestrictions.toString()
      }

      console.log('Compliance facts for issuance:', issuanceFacts)

      // Store the compliance facts for use in issuance
      // Don't set compliance record yet - it will be generated during issuance
      setComplianceRecord(null)

      // Navigate to the Issue step
      setCurrentStep('token-issuance')
    } catch (err: any) {
      console.error('Compliance submit error:', err)
      setError(err.message || 'Failed to process compliance')
    } finally {
      setLoading(false)
    }
  }

  // Auto-populate token issuance data when reaching the issue step
  useEffect(() => {
    if (currentStep === 'token-issuance') {
      setTokenData(prev => ({
        ...prev,
        currencyCode: selectedAsset?.code || trustlineData.currencyCode || trustlineCheckData.currencyCode,
        destination: trustlineData.holderAddress || trustlineCheckData.holderAddress
      }))
    }
  }, [currentStep, selectedAsset, trustlineData, trustlineCheckData])

  // Prefill compliance from asset.registry when entering compliance step (read-only intent)
  useEffect(() => {
    const mapMica = (val?: string) => {
      if (!val) return undefined
      const v = val.toLowerCase()
      if (v.includes('asset-referenced')) return 'asset_referenced_token'
      if (v.includes('e-money')) return 'e_money_token'
      if (v.includes('utility')) return 'utility_token'
      return undefined
    }
    const prefillFromAsset = async () => {
      if (!selectedAsset?.id) return
      try {
        const { data } = await api.GET(`/v1/assets/${selectedAsset.id}` as any, {})
        const registry = (data as any)?.registry || {}
        console.log('Prefilling from asset registry:', registry)
        setAssetRegistryPrefill({ jurisdiction: registry.jurisdiction, micaClass: registry.micaClass })
        setComplianceData(prev => ({
          ...prev,
          jurisdiction: registry.jurisdiction || prev.jurisdiction,
          micaClassification: (mapMica(registry.micaClass) as any) || prev.micaClassification
        }))
      } catch (err) {
        console.error('Error prefilling from asset:', err)
      }
    }
    if (currentStep === 'compliance-metadata') prefillFromAsset()
  }, [currentStep, selectedAsset?.id])

  const getMicaLabel = (val: string) => {
    switch (val) {
      case 'asset_referenced_token':
        return 'Asset-Referenced Token (ART)'
      case 'e_money_token':
        return 'E-Money Token (EMT)'
      case 'utility_token':
        return 'Utility Token'
      default:
        return val
    }
  }

  const getRegimeFromJurisdiction = (jurisdiction: string) => {
    // EU countries - MiCA regime
    const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'IE', 'GR', 'CZ', 'HU', 'SE', 'PL', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'CY', 'LU', 'MT']
    
    if (euCountries.includes(jurisdiction.toUpperCase())) {
      return 'MiCA'
    }
    
    // Future regimes can be added here
    // if (jurisdiction === 'US') return 'SEC'
    // if (jurisdiction === 'UK') return 'FCA'
    // if (jurisdiction === 'SG') return 'MAS'
    
    return 'Custom'
  }

  const resetFlow = () => {
    setCurrentStep('ledger-selection')
    setSelectedAsset(null)
    setAssets([])
    setAssetsError(null)
    setTrustlineCheckData({ currencyCode: '', holderAddress: '', issuerAddress: '' })
    setTrustlineData({ currencyCode: '', holderAddress: '', issuerAddress: '', limit: '', noRipple: false, requireAuth: true })
    setTokenData({ currencyCode: '', amount: '', destination: '', metadata: {}, metadataRaw: '' })
    setComplianceData({
      isin: '',
      micaClassification: 'utility_token',
      kycRequirement: 'optional',
      jurisdiction: '',
      expirationDate: '',
      transferRestrictions: false,
      maxTransferAmount: ''
    })
    setResult(null)
    setError(null)
    setTrustlineCheckResult(null)
    setComplianceRecord(null)
    setAnchorCompliance(true)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Modern Progress Indicator */}
      <div className="mb-6">
        <div className="relative">
          {/* Background line */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 rounded-full"></div>
          
          {/* Progress line */}
          <div 
            className="absolute top-6 left-0 h-0.5 bg-gray-400 rounded-full transition-all duration-700 ease-out"
            style={{ 
              width: `${(['ledger-selection', 'asset-selection', 'trustline-check', 'compliance-metadata', 'token-issuance', 'success'].indexOf(currentStep) / 5) * 100}%` 
            }}
          ></div>
          
          <div className="flex items-center justify-between relative z-10">
            {[
              { 
                step: 'ledger-selection', 
                label: t('issuances:steps.selectLedger', 'Select Ledger'), 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                )
              },
              { 
                step: 'asset-selection', 
                label: t('issuances:steps.selectAsset', 'Select Asset'), 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                )
              },
              { 
                step: 'trustline-check', 
                label: t('issuances:steps.authorization', 'Authorization'), 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                )
              },
              { 
                step: 'compliance-metadata', 
                label: t('issuances:steps.compliance', 'Compliance'), 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )
              },
              { 
                step: 'token-issuance', 
                label: t('issuances:steps.issue', 'Issue'), 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                )
              },
              { 
                step: 'success', 
                label: t('issuances:steps.complete', 'Complete'), 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )
              }
            ].map((item, index) => {
              const stepIndex = ['ledger-selection', 'asset-selection', 'trustline-check', 'compliance-metadata', 'token-issuance', 'success'].indexOf(currentStep)
              const isActive = currentStep === item.step
              const isCompleted = index < stepIndex
              const isUpcoming = index > stepIndex
              
              return (
                <div key={item.step} className="flex flex-col items-center">
                  {/* Step Circle */}
                                     <div className={`
                     relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ease-out transform
                     ${isActive 
                       ? 'bg-gray-800 border-gray-800 text-white shadow-sm scale-110' 
                       : isCompleted 
                         ? 'bg-gray-600 border-gray-600 text-white' 
                         : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500'
                     }
                     ${isUpcoming ? 'opacity-60' : 'opacity-100'}
                   `}>
                                         {isCompleted ? (
                       <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                       </svg>
                     ) : (
                       <div className="w-5 h-5">{item.icon}</div>
                     )}
                    
                                                             {/* Enhanced pulse animation for active step (except Complete) */}
                    {isActive && item.step !== 'success' && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-gray-400 animate-ping opacity-40"></div>
                        <div className="absolute inset-0 rounded-full bg-gray-500 animate-pulse opacity-30"></div>
                      </>
                    )}
                  </div>
                  
                  {/* Step Label */}
                                     <div className="mt-3 text-center">
                     <span className={`
                       text-sm font-medium transition-all duration-300
                       ${isActive 
                         ? 'text-gray-900' 
                         : isCompleted 
                           ? 'text-gray-700' 
                           : 'text-gray-500'
                       }
                       ${isActive ? 'scale-105' : ''}
                     `}>
                       {item.label}
                     </span>
                     
                     {/* Step number */}
                     <div className={`
                       mt-1 text-xs font-mono transition-all duration-300
                       ${isActive 
                         ? 'text-gray-600' 
                         : isCompleted 
                           ? 'text-gray-500' 
                           : 'text-gray-400'
                       }
                     `}>
                       Step {index + 1}
                     </div>
                   </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Progress percentage */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-full">
            <span className="text-sm font-medium text-gray-600">
              {t('issuances:steps.progress', 'Progress')}: {Math.round((['ledger-selection', 'asset-selection', 'trustline-check', 'compliance-metadata', 'token-issuance', 'success'].indexOf(currentStep) / 5) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 'ledger-selection' && (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4 rounded-2xl">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('issuances:ledgerSelection.title', 'Select Target Ledger')}</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t('issuances:ledgerSelection.description', 'Choose the blockchain platform where you want to issue your token')}
              </p>
            </div>

            {/* Ledger Selection */}
            <div className="space-y-3">
              {/* Search/Filter Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('issuances:ledgerSelection.searchPlaceholder', 'Search ledgers...')}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

                            {/* Ledger Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(() => {
                  const filteredLedgers = ledgers.filter(ledger => 
                    searchQuery === '' || 
                    ledger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ledger.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ledger.type.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  
                  if (searchQuery && filteredLedgers.length === 0) {
                                         return (
                       <div className="col-span-full text-center py-8">
                         <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4">
                           <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                           </svg>
                         </div>
                         <h3 className="text-lg font-medium text-gray-900 mb-2">No ledgers found</h3>
                         <p className="text-gray-500 mb-4">Try searching for something else or check back later for more options.</p>
                         <button
                           onClick={() => setSearchQuery('')}
                           className="inline-flex items-center px-4 py-2 text-gray-600 border border-gray-600 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                         >
                           Clear search
                         </button>
                       </div>
                     )
                  }
                  
                  return filteredLedgers.map((ledger) => (
                    <button
                      key={ledger.type}
                      onClick={() => handleLedgerSelection(ledger.type)}
                      className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 text-left overflow-hidden transform hover:-translate-y-0.5"
                    >
                      <div className="p-4">
                        <div className="mb-3 flex justify-center">
                          <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors duration-200">
                            <LedgerLogo type={ledger.type} size="md" />
                          </div>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">{ledger.name}</h3>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{ledger.description}</p>
                        
                        {/* Status Badge */}
                        <div className="flex items-center justify-between">
                                                   {ledger.status === 'live' ? (
                           <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                             <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                             </svg>
                             {t('issuances:ledgerSelection.available', 'Available')}
                           </span>
                         ) : ledger.status === 'beta' ? (
                           <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                             <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                             </svg>
                             Beta
                           </span>
                         ) : (
                           <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                             <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                               <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                             </svg>
                             {t('issuances:ledgerSelection.comingSoon', 'Coming Soon')}
                           </span>
                         )}
                          
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))
                })()}
              </div>

              
            </div>
          </div>
        </div>
      )}

      {currentStep === 'asset-selection' && (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4 rounded-2xl">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('issuances:assetSelection.title', 'Select Asset')}</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t('issuances:assetSelection.description', 'Select an active asset on {{ledger}} to issue tokens', { ledger: selectedLedger })}
              </p>
            </div>

            {/* Asset Selection */}
            <div className="space-y-6">
              {/* Loading State */}
              {assetsLoading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">{t('issuances:trustlineDetails.loadingAssets', 'Loading assets...')}</p>
                </div>
              )}

              {/* Error State */}
              {assetsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-red-600 mr-2">⚠️</span>
                    <span className="text-red-800">{assetsError}</span>
                  </div>
                </div>
              )}

              {/* No Assets State */}
              {!assetsLoading && !assetsError && assets.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('issuances:trustlineDetails.noActiveAssetsFound', 'No active assets found')}</h3>
                  <p className="text-gray-500 mb-6">{t('issuances:trustlineDetails.createAssetFirst', 'You need to create an asset first before issuing tokens.')}</p>
                  <a
                    href="/app/assets/create"
                    target="_blank"
                    className="inline-flex items-center px-6 py-3 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                  >
                    {t('issuances:trustlineDetails.createAsset', 'Create Asset')}
                  </a>
                </div>
              )}

              {/* Assets Grid */}
              {!assetsLoading && !assetsError && assets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleAssetSelection(asset)}
                      className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 text-left overflow-hidden transform hover:-translate-y-0.5"
                    >
                      <div className="p-6">
                        <div className="mb-4 flex justify-center">
                          <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors duration-200">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{asset.code}</h3>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{asset.assetRef}</p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Network:</span>
                            <span className="font-medium text-gray-900">{asset.network}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Decimals:</span>
                            <span className="font-medium text-gray-900">{asset.decimals}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">{t('issuances:assetSelection.compliance', 'Compliance:')}</span>
                            <span className="font-medium text-gray-900">{asset.complianceMode}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Back Button */}
              <div className="text-center pt-6">
                <button
                  onClick={() => setCurrentStep('ledger-selection')}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold transition-all duration-200 hover:border-gray-400"
                >
                  {t('issuances:trustlineDetails.backToLedgerSelection', '← Back to Ledger Selection')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'trustline-check' && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">{t('issuances:trustlineConfiguration.title', 'Trustline Configuration')}</h1>
              <p className="text-gray-600">
                {t('issuances:trustlineConfiguration.description', 'We\'ll verify if a trustline exists and configure one if needed for your token issuance')}
              </p>
              {selectedAsset && (
                <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-blue-800">
                    {t('issuances:trustlineConfiguration.selectedAsset', 'Selected Asset: {{asset}} ({{network}})', { asset: selectedAsset.code, network: selectedAsset.network })}
                  </span>
                </div>
              )}
            </div>

            {/* Main Form Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Form Header */}
              <div className="bg-gray-800 px-8 py-6">
                <h2 className="text-2xl font-bold text-white mb-2">{t('issuances:trustlineDetails.title', 'Trustline Details')}</h2>
                <p className="text-gray-300">{t('issuances:trustlineDetails.description', 'Enter the basic information to check trustline status')}</p>
              </div>

              {/* Form Content */}
              <div className="p-8">
                <form onSubmit={handleTrustlineCheck} className="space-y-8">
                                     {/* Input Fields */}
                   <div className="space-y-6">
                     <div className="space-y-2">
                       <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                         {t('issuances:trustlineDetails.currencyCode', 'CURRENCY CODE *')}
                       </label>
                       <input
                         type="text"
                         value={trustlineCheckData.currencyCode}
                         onChange={(e) => setTrustlineCheckData(prev => ({ ...prev, currencyCode: e.target.value }))}
                         className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-400 text-base font-medium transition-all duration-200 bg-gray-50"
                         placeholder="USD, EUR, COMP"
                         required
                         readOnly={!!selectedAsset}
                       />
                       {selectedAsset && (
                         <p className="text-sm text-gray-500 mt-1">
                           {t('issuances:trustlineDetails.currencyCodeHint', 'Currency code is set from the selected asset')}
                         </p>
                       )}
                     </div>
                     
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                           {t('issuances:trustlineDetails.holderAddress', 'HOLDER ADDRESS *')}
                         </label>
                         <input
                           type="text"
                           value={trustlineCheckData.holderAddress}
                           onChange={(e) => setTrustlineCheckData(prev => ({ ...prev, holderAddress: e.target.value }))}
                           className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-400 text-base font-mono transition-all duration-200"
                           placeholder={t('issuances:trustlineDetails.holderAddressPlaceholder', 'rHolder123...')}
                           required
                         />
                       </div>
                       
                       <div className="space-y-2">
                         <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                           {t('issuances:trustlineDetails.issuerAddress', 'ISSUER ADDRESS *')}
                         </label>
                         <input
                           type="text"
                           value={trustlineCheckData.issuerAddress}
                           onChange={(e) => setTrustlineCheckData(prev => ({ ...prev, issuerAddress: e.target.value }))}
                           className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-400 text-base font-mono transition-all duration-200 bg-gray-50"
                           placeholder={t('issuances:trustlineDetails.issuerAddressPlaceholder', 'rIssuer456...')}
                           required
                           readOnly={!!selectedAsset}
                         />
                         {selectedAsset && (
                           <p className="text-sm text-gray-500 mt-1">
                             {t('issuances:trustlineDetails.issuerAddressHint', 'Issuer address is set from the selected asset')}
                           </p>
                         )}
                       </div>
                     </div>
                   </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-8 border-t border-gray-100">
                                                             <button
                      type="button"
                      onClick={() => setCurrentStep('asset-selection')}
                      className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold transition-all duration-200 hover:border-gray-400"
                    >
                     {t('issuances:trustlineDetails.backToAssetSelection', '← Back to Asset Selection')}
                   </button>
                                                             <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 font-semibold flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          Checking Trustline...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          {t('issuances:trustlineDetails.checkAndConfigureTrustline', 'Check & Configure Trustline')}
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Trustline Status Result */}
                {trustlineCheckResult && (
                  <div className={`mt-12 p-8 rounded-2xl border-2 ${
                    trustlineCheckResult.exists 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-start space-x-6">
                      <div className="flex-shrink-0">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          trustlineCheckResult.exists 
                            ? 'bg-green-100' 
                            : 'bg-amber-100'
                        }`}>
                          {trustlineCheckResult.exists ? (
                            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                                                                         <h3 className={`text-lg font-semibold mb-2 ${
                          trustlineCheckResult.exists ? 'text-green-800' : 'text-amber-800'
                        }`}>
                          {trustlineCheckResult.exists ? t('issuances:trustlineDetails.trustlineFound', 'Trustline Found') : t('issuances:trustlineDetails.trustlineNotFound', '⚠️ Trustline Not Found')}
                        </h3>
                        
                        <p className={`text-base leading-relaxed ${
                          trustlineCheckResult.exists ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          {trustlineCheckResult.exists 
                            ? t('issuances:trustlineDetails.trustlineFoundMessage', 'A trustline exists for {{currency}} from {{issuer}} with limit {{limit}} and balance {{balance}}.', {
                                currency: trustlineCheckData.currencyCode,
                                issuer: trustlineCheckData.issuerAddress,
                                limit: trustlineCheckResult.details?.limit || 'unknown',
                                balance: trustlineCheckResult.details?.balance || '0'
                              })
                            : t('issuances:trustlineDetails.trustlineNotFoundMessage', 'No trustline found for {{currency}} from {{issuer}}. Please provide additional details to create one.', {
                                currency: trustlineCheckData.currencyCode,
                                issuer: trustlineCheckData.issuerAddress
                              })
                          }
                        </p>
                        
                        {/* Additional Fields for Creation */}
                        {!trustlineCheckResult.exists && (
                          <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">{t('issuances:trustlineDetails.createNewTrustline', 'Create New Trustline')}</h4>
                                                         <div className="space-y-6">
                               <div className="space-y-2">
                                 <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                   {t('issuances:trustlineDetails.trustLimit', 'TRUST LIMIT *')}
                                 </label>
                                 <input
                                   type="text"
                                   value={trustlineData.limit}
                                   onChange={(e) => setTrustlineData(prev => ({ ...prev, limit: e.target.value }))}
                                   className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-400 text-base transition-all duration-200"
                                   placeholder={t('issuances:trustlineDetails.trustLimitPlaceholder', '1000000')}
                                   required
                                 />
                               </div>
                               
                               <div className="space-y-2">
                                 <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                   {t('issuances:trustlineDetails.authorizationRequest', 'AUTHORIZATION REQUEST *')}
                                 </label>
                                 <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                                   <div className="flex items-center gap-3">
                                     <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                     </svg>
                                     <div>
                                       <p className="text-sm font-medium text-green-900">Send Authorization Request</p>
                                       <p className="text-sm text-green-700">Send a secure authorization request to the holder to set up their trustline</p>
                                     </div>
                                   </div>
                                   <button
                                     type="button"
                                     onClick={createAuthorizationRequest}
                                     disabled={loading || !selectedAsset || !trustlineData.holderAddress || !trustlineData.currencyCode}
                                     className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                   >
                                     {loading ? 'Creating Request...' : 'Send Authorization Request'}
                                   </button>
                                 </div>
                                 <p className="text-sm text-gray-500 mt-2">The holder will receive a secure link to set up their trustline using their own wallet</p>
                               </div>
                             </div>
                            
                            <div className="mt-6">
                                                                                           <button
                                type="button"
                                onClick={handleOptInSubmit}
                                disabled={loading}
                                className="px-6 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                {loading ? 'Creating Trustline...' : 'Create Trustline'}
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Proceed Button for Existing Trustline */}
                        {trustlineCheckResult.exists && (
                          <div className="mt-8">
                                                                                     <button
                              type="button"
                              onClick={() => setCurrentStep('compliance-metadata')}
                              className="px-8 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                            >
                              {t('issuances:tokenIssuance.continueToIssue', 'Continue to Issue')}
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'coming-soon' && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Header Section */}
            <div className="mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
                <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('issuances:ledgerSelection.comingSoonTitle', 'Coming Soon!')}</h1>
              <p className="text-xl text-gray-600 mb-8">
                {selectedLedger} support is currently under development
              </p>
            </div>

            {/* Ledger Info Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gray-100 rounded-xl">
                  <LedgerLogo type={selectedLedger} size="lg" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedLedger} Integration</h2>
              <p className="text-gray-600 mb-6">
                We're working hard to bring {selectedLedger} support to our platform. 
                This will include token issuance, trustline management, and compliance features.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Token Issuance</h3>
                  <p className="text-sm text-gray-600">Issue tokens on {selectedLedger}</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Trust Management</h3>
                  <p className="text-sm text-gray-600">Manage authorizations and permissions</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Compliance</h3>
                  <p className="text-sm text-gray-600">
                    {getRegimeFromJurisdiction(complianceData.jurisdiction || selectedAsset?.registry?.jurisdiction || '')}-compliant token management
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setCurrentStep('ledger-selection')}
                className="px-8 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 font-semibold transition-all duration-200"
              >
                {t('issuances:trustlineDetails.backToLedgerSelection', '← Back to Ledger Selection')}
              </button>
              <button
                onClick={() => window.open('https://github.com/your-repo', '_blank')}
                className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-200"
              >
                {t('issuances:tokenIssuance.followDevelopment', 'Follow Development')}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'token-issuance' && (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4 rounded-2xl">
          <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('issuances:tokenIssuance.title', 'Issue Token')}</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t('issuances:tokenIssuance.description', 'Now issue tokens from the issuer to the holder on {{ledger}}.', { ledger: selectedLedger })}
              </p>
            </div>

            {/* Main Form Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Form Header */}
              <div className="bg-gray-800 px-8 py-6">
                <h2 className="text-2xl font-bold text-white mb-2">{t('issuances:tokenIssuance.tokenDetails', 'Token Details')}</h2>
                <p className="text-gray-300">{t('issuances:tokenIssuance.configureTokenIssuance', 'Configure the token issuance parameters')}</p>
              </div>

              {/* Form Content */}
              <div className="p-8">
                                <form onSubmit={handleTokenIssuance} className="space-y-6">
                  {/* Input Fields */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          {t('issuances:tokenIssuance.currencyCodeLocked', 'Currency Code (Locked)')}
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={tokenData.currencyCode}
                            onChange={(e) => setTokenData(prev => ({ ...prev, currencyCode: e.target.value }))}
                            className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-400 bg-gray-50 cursor-not-allowed text-base font-medium transition-all duration-200"
                            placeholder="USD, EUR, or custom code"
                            disabled
                            title="Currency is locked based on the trustline configuration"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">Currency locked based on trustline configuration</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          {t('issuances:tokenIssuance.amount', 'Amount')}
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          value={tokenData.amount}
                          onChange={(e) => setTokenData(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-400 text-base font-medium transition-all duration-200"
                          placeholder={t('issuances:tokenIssuance.amountPlaceholder', '100')}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        {t('issuances:tokenIssuance.destinationAddressLocked', 'Destination Address (Locked)')}
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={tokenData.destination}
                          onChange={(e) => setTokenData(prev => ({ ...prev, destination: e.target.value }))}
                          className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-400 bg-gray-50 cursor-not-allowed text-base font-mono transition-all duration-200"
                          placeholder="r..."
                          disabled
                          title="Destination address is locked based on the trustline configuration"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                                              <p className="text-xs text-gray-500">{t('issuances:tokenIssuance.destinationAddressLockedHint', 'Destination address locked based on trustline configuration')}</p>
                    </div>
                  </div>

                  {/* Metadata Section */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-amber-800">{t('issuances:compliance.metadata.publicOnChainMetadata', 'Public On-Chain Metadata')}</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          {t('issuances:compliance.metadata.warningMessage', 'This metadata will be stored permanently on the blockchain and is publicly visible. Do not include sensitive information like personal data, compliance details, or private business information.')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        {t('issuances:compliance.sections.additionalMetadata', 'Additional Metadata (JSON)')}
                      </label>
                      <textarea
                        value={tokenData.metadataRaw}
                        onChange={(e) => {
                          const value = e.target.value
                          setTokenData(prev => ({ ...prev, metadataRaw: value }))
                          
                          // Try to parse JSON and update metadata if valid
                          if (value.trim() === '') {
                            setTokenData(prev => ({ ...prev, metadata: {} }))
                          } else {
                            try {
                              const parsed = JSON.parse(value)
                              setTokenData(prev => ({ ...prev, metadata: parsed }))
                            } catch {
                              // Invalid JSON - keep the raw text but don't update metadata
                            }
                          }
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-400 text-base transition-all duration-200"
                        rows={4}
                        placeholder='{"description": "EUR-backed stablecoin", "website": "https://example.com", "logo": "https://example.com/logo.png"}'
                      />
                      <p className="text-xs text-gray-500">{t('issuances:compliance.metadata.description', 'Optional public metadata (e.g., token description, issuer website, logo URL)')}</p>
                    </div>
                  </div>

                  {/* Anchor Compliance Toggle */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center h-6">
                          <input
                            id="anchor-compliance"
                            type="checkbox"
                            checked={anchorCompliance}
                            onChange={(e) => setAnchorCompliance(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label htmlFor="anchor-compliance" className="text-sm font-medium text-blue-900">
                            {t('issuances:compliance.sections.anchorComplianceData', 'Anchor Compliance Data')}
                          </label>
                          <p className="text-xs text-blue-700 mt-1">
                            {t('issuances:compliance.metadata.includeComplianceRecord', 'Include compliance record in the blockchain transaction')}
                          </p>
                        </div>
                      </div>
                      
                      {complianceRecord ? (
                        <div className="bg-blue-100 rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-blue-800">{t('issuances:compliance.metadata.recordId', 'Record ID:')}</span>
                            <code className="text-xs text-blue-900 bg-blue-200 px-2 py-1 rounded font-mono">
                              {complianceRecord.recordId}
                            </code>
                          </div>
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-medium text-blue-800">{t('issuances:compliance.metadata.sha256Hash', 'SHA256 Hash:')}</span>
                            <code className="text-xs text-blue-900 bg-blue-200 px-2 py-1 rounded font-mono break-all max-w-xs">
                              {complianceRecord.sha256}
                            </code>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-100 rounded p-3">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-blue-800">
                              {t('issuances:compliance.metadata.willBeGenerated', 'Compliance record and hash will be generated during issuance')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-8 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('compliance-metadata')}
                      className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold transition-all duration-200 hover:border-gray-400"
                    >
                      {t('issuances:compliance.actions.backToCompliance', '← Back to Compliance')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 font-semibold flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent"></div>
                          Issuing Token...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          {t('issuances:tokenIssuance.issueToken', 'Issue Token')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'compliance-metadata' && (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4 rounded-2xl">
          <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
                          <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {getRegimeFromJurisdiction(complianceData.jurisdiction || selectedAsset?.registry?.jurisdiction || '')} Compliance Metadata
                          </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('issuances:compliance.description', 'Configure compliance metadata for regulatory reporting and audit trails.')}
            </p>
            </div>

            {/* Main Form Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Form Header */}
              <div className="bg-gray-800 px-8 py-6">
                <h2 className="text-2xl font-bold text-white mb-2">{t('issuances:compliance.complianceDetails', 'Compliance Details')}</h2>
                <p className="text-gray-300">{t('issuances:compliance.configureCompliance', 'Configure regulatory compliance information.')}</p>
              </div>

              {/* Form Content */}
              <div className="p-8">
                <form onSubmit={handleComplianceSubmit} className="space-y-6">
                  {/* Asset Information Display */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Asset Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Asset</label>
                        <p className="text-gray-900 font-medium">{selectedAsset?.code || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                        <p className="text-gray-900 font-medium">{(selectedAsset as any)?.product?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                        <p className="text-gray-900 font-medium">{(selectedAsset as any)?.organization?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ledger</label>
                        <p className="text-gray-900 font-medium">{selectedAsset?.ledger?.toUpperCase() || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Regulatory Regime</label>
                        <p className="text-gray-900 font-medium">
                          {getRegimeFromJurisdiction(selectedAsset?.registry?.jurisdiction || '')}
                          {selectedAsset?.registry?.jurisdiction && (
                            <span className="text-xs text-gray-500 ml-2">({selectedAsset.registry.jurisdiction})</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Basic Compliance Information (read-only from Asset) */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">{t('issuances:compliance.basicInformation', 'Basic Information')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Regulatory Classification</label>
                        <p className="text-gray-900 font-medium">{getMicaLabel(complianceData.micaClassification)}</p>
                        {assetRegistryPrefill?.micaClass && (
                          <p className="mt-1 text-xs text-gray-500">Pre-filled from Asset • Edit at Asset</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Legal Issuer Name</label>
                        <p className="text-gray-900 font-medium">{selectedAsset?.organization?.name || '—'}</p>
                        <p className="mt-1 text-xs text-gray-500">From Organization • Edit at Organization</p>
                      </div>
                    </div>
                  </div>

                  {/* Regulatory Classification & KYC (classification read-only) */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">
                      {getRegimeFromJurisdiction(complianceData.jurisdiction || selectedAsset?.registry?.jurisdiction || '')} Classification & KYC
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Token Classification</label>
                        <p className="text-gray-900 font-medium">{getMicaLabel(complianceData.micaClassification)}</p>
                      </div>
                      <FormField label={t('issuances:compliance.fields.kycRequirement', 'KYC Requirement *')} required>
                        <CustomDropdown
                          value={complianceData.kycRequirement}
                          onChange={(value) => setComplianceData(prev => ({ ...prev, kycRequirement: value as any }))}
                          options={[
                            { value: 'required', label: t('issuances:compliance.options.required', 'Required') },
                            { value: 'optional', label: t('issuances:compliance.options.optional', 'Optional') }
                          ]}
                          placeholder={t('issuances:compliance.fields.kycRequirementPlaceholder', 'Select KYC requirement')}
                        />
                      </FormField>
                    </div>
                  </div>

                  {/* Jurisdiction (read-only) */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">{t('issuances:compliance.sections.jurisdiction', 'Jurisdiction')}</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Jurisdiction</label>
                        <p className="text-gray-900 font-medium">{complianceData.jurisdiction || '—'}</p>
                        {assetRegistryPrefill?.jurisdiction && (
                          <p className="mt-1 text-xs text-gray-500">Pre-filled from Asset • Edit at Asset</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ledger Controls (read-only from Asset) */}
                  {selectedAsset?.controls && (
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">Ledger Controls</h3>
                      <div className="space-y-3">
                        {selectedAsset.controls.requireAuth !== undefined && (
                          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">Require Authorization</h4>
                              <p className="text-sm text-gray-600">Holders must be authorized to hold this asset</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              selectedAsset.controls.requireAuth 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedAsset.controls.requireAuth ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        )}
                        {selectedAsset.controls.freeze !== undefined && (
                          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">Freeze</h4>
                              <p className="text-sm text-gray-600">Asset can be frozen by the issuer</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              selectedAsset.controls.freeze 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedAsset.controls.freeze ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        )}
                        {selectedAsset.controls.clawback !== undefined && (
                          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">Clawback</h4>
                              <p className="text-sm text-gray-600">Issuer can reclaim tokens from holders</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              selectedAsset.controls.clawback 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedAsset.controls.clawback ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        )}
                        {selectedAsset.controls.transferFeeBps !== undefined && (
                          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">Transfer Fee</h4>
                              <p className="text-sm text-gray-600">Fee charged on transfers (basis points)</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {selectedAsset.controls.transferFeeBps} bps
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-gray-500">From Asset Configuration</p>
                    </div>
                  )}

                  {/* Transfer Restrictions */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">{t('issuances:compliance.sections.transferRestrictions', 'Transfer Restrictions')}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="transferRestrictions"
                          checked={complianceData.transferRestrictions}
                          onChange={(e) => setComplianceData(prev => ({ ...prev, transferRestrictions: e.target.checked }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <label htmlFor="transferRestrictions" className="ml-2 text-sm text-gray-700">
                          {t('issuances:compliance.metadata.enableTransferRestrictions', 'Enable transfer restrictions')}
                        </label>
                      </div>
                      {complianceData.transferRestrictions && (
                        <FormField label="Maximum Transfer Amount">
                          <input
                            type="text"
                            value={complianceData.maxTransferAmount}
                            onChange={(e) => setComplianceData(prev => ({ ...prev, maxTransferAmount: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="10000"
                          />
                        </FormField>
                      )}
                    </div>
                  </div>

                  {/* Expiration */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">{t('issuances:compliance.sections.expiration', 'Expiration (Optional)')}</h3>
                    <FormField label={t('issuances:compliance.fields.expirationDate', 'Expiration Date')}>
                      <input
                        type="date"
                        value={complianceData.expirationDate}
                        onChange={(e) => setComplianceData(prev => ({ ...prev, expirationDate: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </FormField>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-8 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('trustline-check')}
                      className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold transition-all duration-200 hover:border-gray-400"
                    >
                      {t('issuances:compliance.actions.backToAuthorization', '← Back to Authorization')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 font-semibold flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent"></div>
                          Processing Compliance...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {t('issuances:tokenIssuance.continueToIssue', 'Continue to Issue')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'success' && result && (
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 py-8 px-4 rounded-2xl">
          <div className="max-w-4xl mx-auto text-center">
            {/* Success Icon */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-xl mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{t('issuances:success.title', 'Token Issued Successfully!')}</h1>
              <p className="text-lg text-gray-600">
                {t('issuances:success.description', 'Your token has been issued on {{ledger}} and stored in the local database.', { ledger: selectedLedger })}
              </p>
            </div>

            {/* Transaction Details */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('issuances:success.transactionDetails', 'Transaction Details')}</h2>
              <div className="space-y-4">
                {result.trustlineTxHash && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Trustline Transaction:</p>
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded font-mono break-all">
                        {result.trustlineTxHash}
                      </code>
                      {result.trustlineExplorer && (
                        <a
                          href={result.trustlineExplorer}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 inline-flex items-center px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors duration-200 shadow-sm hover:shadow-md"
                        >
                          {t('issuances:success.viewOnExplorer', 'View on Explorer →')}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('issuances:success.tokenIssuanceTransaction', 'Token Issuance Transaction:')}</p>
                  <div className="flex items-center justify-between">
                    {result.txId ? (
                      <>
                        <code className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded font-mono break-all">
                          {result.txId}
                        </code>
                        {result.explorer && (
                          <a
                            href={result.explorer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 inline-flex items-center px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors duration-200 shadow-sm hover:shadow-md"
                          >
                            {t('issuances:success.viewOnExplorer', 'View on Explorer →')}
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded">
                          Pending transaction confirmation...
                        </span>
                        <span className="ml-4 text-sm text-gray-500">
                          Transaction submitted to network
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {result.manifestHash && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-700 mb-2">{t('issuances:success.complianceRecord', 'Compliance Record:')}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-600">{t('issuances:success.sha256', 'SHA256 Hash:')}</span>
                        <code className="text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded font-mono break-all">
                          {result.manifestHash}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-600">{t('issuances:success.anchored', 'Anchored:')}</span>
                        <span className="text-sm font-medium text-blue-700">
                          {result.manifestHash ? t('issuances:success.successfullyAnchored', 'Successfully anchored') : t('issuances:success.pending', 'Pending')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {result.publicMetadata && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-700 mb-2">Public Metadata:</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-600">Metadata:</span>
                        <code className="text-sm text-green-700 bg-green-100 px-3 py-2 rounded font-mono break-all">
                          {JSON.stringify(result.publicMetadata, null, 2)}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-600">Anchored:</span>
                        <span className="text-sm font-medium text-green-700">
                          Successfully anchored to blockchain
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {result.compliance && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-700 mb-2">Compliance Evaluation:</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-600">Status:</span>
                        <span className="text-sm font-medium text-blue-700">
                          {result.compliance.status || 'Evaluated'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-600">Requirements:</span>
                        <span className="text-sm font-medium text-blue-700">
                          {result.compliance.requirementCount || 0} evaluated
                        </span>
                      </div>
                      {result.compliance.requirements && result.compliance.requirements.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-blue-600 mb-2">Key Requirements:</p>
                          <div className="space-y-1">
                            {result.compliance.requirements.slice(0, 3).map((req: any, index: number) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <span className="text-blue-600">{req.template?.name || 'Requirement'}</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  req.status === 'SATISFIED' ? 'bg-green-100 text-green-800' :
                                  req.status === 'REQUIRED' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={resetFlow}
                                          className="px-8 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {t('issuances:success.issueAnotherToken', 'Issue Another Token')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
