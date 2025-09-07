'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api, ensureJson } from '@/lib/api'
import { getTenantApiUrl } from '@/lib/tenantApi'
import FormField from './FormField'
import TransactionResult from './TransactionResult'
import LedgerLogo from './LedgerLogo'
import CustomDropdown from './CustomDropdown'
import InfoPopup from './InfoPopup'

type LedgerType = 'XRPL' | 'HEDERA' | 'ETHEREUM'
type Step = 'ledger-selection' | 'asset-selection' | 'authorization-setup' | 'success' | 'coming-soon'

interface AuthorizationData {
  currencyCode: string
  holderAddress: string
  issuerAddress: string
  limit: string
  noRipple: boolean
  requireAuth: boolean
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
}

interface AuthorizationResult {
  txId?: string
  explorer?: string
  authorizationId?: string
  id?: string
  authUrl?: string
  message?: string
}

export default function AuthorizationFlow() {
  const { t } = useTranslation(['authorizations', 'common'])
  const [currentStep, setCurrentStep] = useState<Step>('ledger-selection')
  const [selectedLedger, setSelectedLedger] = useState<LedgerType>('XRPL')
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetsError, setAssetsError] = useState<string | null>(null)
  const [authorizationData, setAuthorizationData] = useState<AuthorizationData>({
    currencyCode: '',
    holderAddress: '',
    issuerAddress: '',
    limit: '1000000000',
    noRipple: false,
    requireAuth: true // Default to true for institutional use cases
  })
  const [result, setResult] = useState<AuthorizationResult>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authorizationStatus, setAuthorizationStatus] = useState<'checking' | 'external' | 'none' | 'requested' | 'awaiting_authorization'>('checking')
  const [existingAuthorization, setExistingAuthorization] = useState<any>(null)

  // Check authorization status when holder address or asset changes
  const checkAuthorizationStatus = async () => {
    if (!selectedAsset || !authorizationData.holderAddress || authorizationData.holderAddress.trim() === '') {
      setAuthorizationStatus('checking')
      setExistingAuthorization(null)
      return
    }

    // Only proceed if we have a valid XRPL address format
    if (!authorizationData.holderAddress.match(/^r[a-zA-Z0-9]{24,34}$/)) {
      setAuthorizationStatus('checking')
      setExistingAuthorization(null)
      return
    }

    try {
      // Check authorization status (this now checks both ledger and database)
      const response = await fetch(`${getTenantApiUrl()}/v1/assets/${selectedAsset.id}/authorizations/${authorizationData.holderAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setExistingAuthorization(data)
        
        if (data.exists) {
          // Trustline exists - check status
          if (data.status === 'EXTERNAL' || data.status === 'ISSUER_AUTHORIZED') {
            setAuthorizationStatus('external')
          } else if (data.status === 'AWAITING_ISSUER_AUTHORIZATION') {
            setAuthorizationStatus('awaiting_authorization')
          } else {
            setAuthorizationStatus('requested')
          }
        } else {
          setAuthorizationStatus('none')
        }
      } else {
        setAuthorizationStatus('none')
      }
    } catch (error) {
      console.error('Error checking authorization status:', error)
      setAuthorizationStatus('none')
    }
  }

  // Check authorization status when holder address or asset changes
  useEffect(() => {
    checkAuthorizationStatus()
  }, [selectedAsset, authorizationData.holderAddress])

  // Restore issuance data when coming from issuance flow
  useEffect(() => {
    const issuanceData = sessionStorage.getItem('issuanceData')
    if (issuanceData) {
      try {
        const data = JSON.parse(issuanceData)
        if (data.selectedAssetId) {
          // Pre-select the asset if it exists
          setSelectedAsset(assets.find(asset => asset.id === data.selectedAssetId) || null)
        }
        if (data.holderAddress) {
          setAuthorizationData(prev => ({
            ...prev,
            holderAddress: data.holderAddress,
            currencyCode: data.currencyCode || prev.currencyCode,
            issuerAddress: data.issuerAddress || prev.issuerAddress
          }))
        }
        // Clear the stored data
        sessionStorage.removeItem('issuanceData')
      } catch (error) {
        console.error('Error parsing issuance data:', error)
      }
    }
  }, [assets])

  // Security: Always use wallet signing mode, never handle private keys

  // Check if trustline exists on XRPL ledger
  const checkTrustlineExists = async () => {
    if (!selectedAsset || !authorizationData.holderAddress) return null
    
    try {
      const { data } = await api.GET('/v1/assets/{assetId}/authorizations/{holder}', {
        params: {
          path: {
            assetId: selectedAsset.id,
            holder: authorizationData.holderAddress
          }
        }
      })
      
      // If we get a response, check if trustline exists
      return data?.exists || false
    } catch (error) {
      console.error('Error checking trustline existence:', error)
      return false
    }
  }

  // Check for existing authorization request in database
  const checkExistingAuthorization = async () => {
    if (!selectedAsset || !authorizationData.holderAddress) return null
    
    try {
      const { data } = await api.GET('/v1/authorizations', {
        params: {
          query: {
            assetId: selectedAsset.id,
            holder: authorizationData.holderAddress,
            limit: 10
          }
        }
      })
      
      return data?.authorizations?.find((auth: any) => 
        auth.assetId === selectedAsset.id && 
        auth.holder === authorizationData.holderAddress
      )
    } catch (error) {
      console.error('Error checking existing authorization:', error)
      return null
    }
  }

  // Check if limit has changed for existing authorization
  const checkLimitChange = async (existingAuth: any) => {
    if (!existingAuth || !authorizationData.holderAddress) return false
    
    try {
      // Get current trustline from ledger to compare limits
      const { data } = await api.GET('/v1/balances/{account}', {
        params: {
          path: { account: authorizationData.holderAddress },
          query: { 
            issuer: selectedAsset?.issuer,
            currency: selectedAsset?.code
          }
        }
      })
      
      const currentTrustline = data?.trustLines?.find((line: any) => 
        line.currency === selectedAsset?.code && 
        line.issuer === selectedAsset?.issuer
      )
      
      const currentLimit = currentTrustline?.limit || '0'
      const newLimit = authorizationData.limit
      
      // Return true if limits are different (allowing for limit updates)
      return currentLimit !== newLimit
    } catch (error) {
      console.error('Error checking limit change:', error)
      return false
    }
  }

  // Create external trustline entry
  const createExternalTrustlineEntry = async () => {
    if (!selectedAsset) {
      setError('No asset selected')
      return
    }
    
    try {
      const { data, error } = await api.POST('/v1/authorizations/external', {
        body: {
          assetId: selectedAsset.id,
          holder: authorizationData.holderAddress,
          currency: selectedAsset.code,
          issuerAddress: selectedAsset.issuer,
          limit: authorizationData.limit,
          externalSource: 'xrpl_external'
        }
      })

      if (error) {
        throw new Error(error.error || 'Failed to create external trustline entry')
      }

      setResult({
        authorizationId: data.id,
        explorer: '',
        message: `External trustline added to our system successfully! Status: ${data.status}`
      })
      setCurrentStep('success')
    } catch (err: any) {
      console.error('Error creating external trustline entry:', err)
      setError(err.message || 'Failed to create external trustline entry')
    } finally {
      setLoading(false)
    }
  }

  // Create limit update authorization entry
  const createLimitUpdateAuthorization = async () => {
    if (!selectedAsset) {
      setError('No asset selected')
      return
    }
    
    try {
      const { data, error } = await api.POST('/v1/authorizations/external', {
        body: {
          assetId: selectedAsset.id,
          holder: authorizationData.holderAddress,
          currency: selectedAsset.code,
          issuerAddress: selectedAsset.issuer,
          limit: authorizationData.limit,
          externalSource: 'xrpl_limit_update'
        }
      })

      if (error) {
        throw new Error(error.error || 'Failed to create limit update authorization entry')
      }

      setResult({
        authorizationId: data.id,
        explorer: '',
        message: `Trustline limit update recorded successfully! Status: ${data.status}`
      })
      setCurrentStep('success')
    } catch (err: any) {
      console.error('Error creating limit update authorization:', err)
      setError(err.message || 'Failed to create limit update authorization entry')
    } finally {
      setLoading(false)
    }
  }

  // Create external authorization for existing trustline
  const createExternalAuthorization = async () => {
    if (!selectedAsset) {
      setError('Please select an asset first')
      return
    }

    if (!authorizationData.holderAddress) {
      setError('Please enter a holder address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getTenantApiUrl()}/v1/assets/${selectedAsset.id}/authorizations/${authorizationData.holderAddress}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          params: {
            limit: authorizationData.limit,
            holderAddress: authorizationData.holderAddress,
            currencyCode: selectedAsset.code,
            issuerAddress: selectedAsset.issuer,
            noRipple: false,
            requireAuth: true,
            status: 'EXTERNAL'
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create external authorization')
      }

      const data = await response.json()
      setResult({
        authorizationId: data.id,
        message: 'External authorization created successfully. You can now proceed with issuance.'
      })
      setCurrentStep('success')
      
      // Refresh authorization status
      await checkAuthorizationStatus()
    } catch (err: any) {
      console.error('Error creating external authorization:', err)
      setError(err.message || 'Failed to create external authorization')
    } finally {
      setLoading(false)
    }
  }

  // Authorize existing request
  const authorizeExistingRequest = async () => {
    if (!existingAuthorization?.id) {
      setError('No authorization request found to authorize')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getTenantApiUrl()}/v1/authorization-requests/${existingAuthorization.id}/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          issuerLimit: authorizationData.limit
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to authorize request')
      }

      const data = await response.json()
      setResult({
        authorizationId: data.authorizationId,
        txId: data.txHash,
        explorer: data.explorer,
        message: 'Authorization completed successfully. You can now proceed with issuance.'
      })
      setCurrentStep('success')
      
      // Refresh authorization status
      await checkAuthorizationStatus()
    } catch (err: any) {
      console.error('Error authorizing request:', err)
      setError(err.message || 'Failed to authorize request')
    } finally {
      setLoading(false)
    }
  }

  // Create authorization request
  const createAuthorizationRequest = async () => {
    if (!selectedAsset) {
      setError('Please select an asset first')
      return
    }

    if (!authorizationData.holderAddress) {
      setError('Please enter a holder address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Creating authorization request with data:', {
        assetId: selectedAsset.id,
        holderAddress: authorizationData.holderAddress,
        requestedLimit: authorizationData.limit
      })

      // First, check if authorization already exists
      const existingAuthResponse = await fetch(`http://localhost:4000/v1/assets/${selectedAsset.id}/authorizations/${authorizationData.holderAddress}`)
      
      if (existingAuthResponse.ok) {
        const existingAuth = await existingAuthResponse.json()
        if (existingAuth.exists) {
          setError(`Authorization already exists for this holder and asset. Status: ${existingAuth.status}. You can view it in the authorization history.`)
          setLoading(false)
          return
        }
      }

      // Use the new authorization request API endpoint
      const response = await fetch('http://localhost:4000/v1/authorization-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          holderAddress: authorizationData.holderAddress,
          requestedLimit: authorizationData.limit
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Use the user-friendly message from the API if available
        const errorMessage = errorData.message || errorData.error || 'Failed to create authorization request'
        setError(errorMessage)
        return
      }

      const data = await response.json()

      if (!data) {
        throw new Error('No data received from server')
      }

      // Store the result and show success
      setResult({
        id: data.id,
        authUrl: data.authUrl
      })
      
      setCurrentStep('success')
    } catch (err: any) {
      console.error('Error creating authorization request:', err)
      setError(err.message || 'Failed to create authorization request')
    } finally {
      setLoading(false)
    }
  }

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
        createdAt: asset.createdAt || new Date().toISOString()
      }))
      
      setAssets(transformedAssets)
    } catch (err: any) {
      console.error('Error fetching assets:', err)
      setAssetsError(err.message || 'Failed to fetch assets')
    } finally {
      setAssetsLoading(false)
    }
  }

  // Fetch assets when entering asset selection step
  useEffect(() => {
    if (currentStep === 'asset-selection' && selectedLedger) {
      fetchAssets()
    }
  }, [currentStep, selectedLedger])

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

  const handleAssetSelection = (asset: Asset) => {
    setSelectedAsset(asset)
    
    // Update authorization data with asset info
    setAuthorizationData(prev => ({
      ...prev,
      currencyCode: asset.code,
      issuerAddress: asset.issuer
    }))
    
    // Proceed to next step
    setCurrentStep('authorization-setup')
  }

  const handleAuthorizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Check if we have a selected asset
      if (!selectedAsset) {
        throw new Error('No asset selected. Please go back and select an asset.')
      }

      // Validate holder address format
      if (!authorizationData.holderAddress || !authorizationData.holderAddress.match(/^r[a-zA-Z0-9]{24,34}$/)) {
        throw new Error('Invalid holder address format. Must be a valid XRPL address starting with "r"')
      }

      console.log('Creating authorization for asset:', selectedAsset)
      console.log('Authorization data:', authorizationData)
      
      const apiUrl = `/v1/assets/${selectedAsset.id}/authorizations/${authorizationData.holderAddress}`
      console.log('API URL:', apiUrl)
      
      const { data, error } = await api.PUT(apiUrl as any, {
        body: {
          params: {
            limit: authorizationData.limit || '1000000000',
            holderAddress: authorizationData.holderAddress,
            currencyCode: authorizationData.currencyCode,
            issuerAddress: authorizationData.issuerAddress,
            noRipple: authorizationData.noRipple,
            requireAuth: authorizationData.requireAuth
          },
          signing: {
            mode: 'wallet' // Always use wallet mode for security
          }
        }
      })

      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error((error as any).error || 'Failed to create authorization')
      }

      if (!data) {
        throw new Error('No response data received')
      }

      // Handle the response data safely
      const responseData = data as any
      setResult({
        txId: responseData.txId || 'pending',
        explorer: responseData.explorer || `https://testnet.xrpl.org/transactions/${responseData.txId || 'pending'}`,
        authorizationId: responseData.authorizationId
      })

      setCurrentStep('success')
    } catch (err: any) {
      console.error('Authorization submit error:', err)
      setError(err.message || 'Failed to create authorization')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'retired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (currentStep === 'ledger-selection') {
    return (
      <div className="max-w-4xl mx-auto">
                {/* Flow Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center relative">
            {/* Background Lines */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-80 h-0.5 bg-gray-300"></div>
            
            {/* Step 1: Select Ledger - Active */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center mb-2 relative">
                <div className="absolute inset-0 bg-gray-800 rounded-full animate-ping opacity-20"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{t('authorizations:flow.steps.selectLedger', 'Select Ledger')}</div>
                <div className="text-xs text-gray-500">{t('authorizations:flow.step1', 'Step 1')}</div>
              </div>
            </div>
            
            {/* Step 2: Select Asset - Inactive */}
            <div className="flex flex-col items-center relative z-10 ml-16">
              <div className="w-12 h-12 border-2 border-gray-300 text-gray-400 rounded-full flex items-center justify-center mb-2 relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{t('authorizations:flow.steps.selectAsset', 'Select Asset')}</div>
                <div className="text-xs text-gray-500">{t('authorizations:flow.step2', 'Step 2')}</div>
              </div>
            </div>
            
            {/* Step 3: Authorization - Inactive */}
            <div className="flex flex-col items-center relative z-10 ml-16">
              <div className="w-12 h-12 border-2 border-gray-300 text-gray-400 rounded-full flex items-center justify-center mb-2 relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{t('authorizations:flow.steps.authorizationSetup', 'Authorization')}</div>
                <div className="text-xs text-gray-500">{t('authorizations:flow.step3', 'Step 3')}</div>
              </div>
            </div>
          </div>
          
          {/* Progress Percentage */}
          <div className="text-center mt-4">
            <span className="text-sm font-medium text-gray-800">{t('authorizations:flow.progress', 'Progress')}: 33%</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('authorizations:ledgerSelection.title', 'Select Ledger')}</h1>
          <p className="text-lg text-gray-600">{t('authorizations:ledgerSelection.description', 'Choose the blockchain network for your authorization')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ledgers.map((ledger) => (
            <button
              key={ledger.type}
              onClick={() => handleLedgerSelection(ledger.type)}
              className={`p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                ledger.status === 'coming-soon'
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-gray-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer'
              }`}
              disabled={ledger.status === 'coming-soon'}
            >
              <div className="flex items-center justify-center mb-4">
                <LedgerLogo type={ledger.type} size="lg" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{ledger.name}</h3>
              <p className="text-gray-600 mb-4">{ledger.description}</p>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 text-sm rounded-full ${
                  ledger.status === 'live' ? 'bg-green-100 text-green-800' :
                  ledger.status === 'beta' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {ledger.status === 'live' ? t('authorizations:ledgerSelection.available', 'Live') :
                   ledger.status === 'beta' ? 'Beta' :
                   t('authorizations:ledgerSelection.comingSoon', 'Coming Soon')}
                </span>
                {ledger.status === 'coming-soon' && (
                  <span className="text-sm text-gray-500">{t('authorizations:ledgerSelection.notAvailableYet', 'Not available yet')}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (currentStep === 'asset-selection') {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Flow Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center relative">
            {/* Background Lines */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-80 h-0.5 bg-gray-800"></div>
            
            {/* Step 1: Select Ledger - Completed */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center mb-2 relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{t('authorizations:flow.steps.selectLedger', 'Select Ledger')}</div>
                <div className="text-xs text-gray-500">{t('authorizations:flow.step1', 'Step 1')}</div>
              </div>
            </div>
            
            {/* Step 2: Select Asset - Active */}
            <div className="flex flex-col items-center relative z-10 ml-16">
              <div className="w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center mb-2 relative">
                <div className="absolute inset-0 bg-gray-800 rounded-full animate-ping opacity-20"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{t('authorizations:flow.steps.selectAsset', 'Select Asset')}</div>
                <div className="text-xs text-gray-500">{t('authorizations:flow.step2', 'Step 2')}</div>
              </div>
            </div>
            
            {/* Step 3: Authorization - Inactive */}
            <div className="flex flex-col items-center relative z-10 ml-16">
              <div className="w-12 h-12 border-2 border-gray-300 text-gray-400 rounded-full flex items-center justify-center mb-2 relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{t('authorizations:flow.steps.authorizationSetup', 'Authorization')}</div>
                <div className="text-xs text-gray-500">{t('authorizations:flow.step3', 'Step 3')}</div>
              </div>
            </div>
          </div>
          
          {/* Progress Percentage */}
          <div className="text-center mt-4">
            <span className="text-sm font-medium text-gray-800">{t('authorizations:flow.progress', 'Progress')}: 67%</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setCurrentStep('ledger-selection')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('authorizations:assetSelection.title', 'Select Asset')}</h1>
            <p className="text-gray-600">{t('authorizations:assetSelection.description', 'Choose the asset for authorization on {{ledger}}', { ledger: selectedLedger })}</p>
          </div>
        </div>

        {assetsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('authorizations:assetSelection.loadingAssets', 'Loading assets...')}</p>
          </div>
        ) : assetsError ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold mb-2">Failed to load assets</p>
            <p className="text-gray-600 mb-4">{assetsError}</p>
            <button
              onClick={fetchAssets}
              className="px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50"
            >
              {t('common:actions.tryAgain', 'Try Again')}
            </button>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold mb-2">{t('authorizations:assetSelection.noActiveAssetsFound', 'No active assets found')}</p>
            <p className="text-gray-600 mb-4">{t('authorizations:assetSelection.createAssetFirst', 'Create an asset first to set up authorizations')}</p>
            <button
              onClick={() => window.location.href = '/app/assets/create'}
              className="px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50"
            >
              {t('authorizations:assetSelection.createAsset', 'Create Asset')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => handleAssetSelection(asset)}
                className="p-6 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{asset.code}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(asset.status)}`}>
                    {asset.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Issuer:</strong> {asset.issuer.substring(0, 8)}...{asset.issuer.substring(asset.issuer.length - 8)}</p>
                  <p><strong>Network:</strong> {asset.ledger}/{asset.network}</p>
                  <p><strong>Decimals:</strong> {asset.decimals}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (currentStep === 'authorization-setup') {
    return (
      <div className="max-w-2xl mx-auto">
                {/* Flow Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center relative">
            {/* Background Lines */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-80 h-0.5 bg-gray-800"></div>
            
            {/* Step 1: Select Ledger - Completed */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center mb-2 relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{t('authorizations:flow.steps.selectLedger', 'Select Ledger')}</div>
                <div className="text-xs text-gray-500">{t('authorizations:flow.step1', 'Step 1')}</div>
              </div>
            </div>
            
            {/* Step 2: Select Asset - Completed */}
            <div className="flex flex-col items-center relative z-10 ml-16">
              <div className="w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center mb-2 relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{t('authorizations:flow.steps.selectAsset', 'Select Asset')}</div>
                <div className="text-xs text-gray-500">{t('authorizations:flow.step2', 'Step 2')}</div>
              </div>
            </div>
            
            {/* Step 3: Authorization - Active */}
            <div className="flex flex-col items-center relative z-10 ml-16">
              <div className="w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center mb-2 relative">
                <div className="absolute inset-0 bg-gray-800 rounded-full animate-ping opacity-20"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{t('authorizations:flow.steps.authorizationSetup', 'Authorization')}</div>
                <div className="text-xs text-gray-500">{t('authorizations:flow.step3', 'Step 3')}</div>
              </div>
            </div>
          </div>
          
          {/* Progress Percentage */}
          <div className="text-center mt-4">
            <span className="text-sm font-medium text-gray-800">{t('authorizations:flow.progress', 'Progress')}: 100%</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setCurrentStep('asset-selection')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{t('authorizations:authorizationSetup.title', 'Authorization Setup')}</h1>
            <p className="text-gray-600">{t('authorizations:authorizationSetup.description', 'Configure authorization for {{asset}}', { asset: selectedAsset?.code })}</p>
          </div>
          <InfoPopup title="Authorization Information">
            {selectedLedger === 'XRPL' ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">XRPL Trustlines</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Trustlines allow accounts to hold tokens from specific issuers on XRPL.
                  </p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Limit:</strong> Maximum amount the holder is willing to accept from this issuer.</p>
                    <p><strong>NoRipple:</strong> Prevents the authorization from being used in rippling transactions.</p>
                    <p><strong>RequireAuth:</strong> Issuer must explicitly authorize the trustline before tokens can be sent.</p>
                    <p><strong>Reserve:</strong> Each authorization consumes XRP reserve from the holder account.</p>
                  </div>
                </div>
              </div>
            ) : selectedLedger === 'HEDERA' ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Hedera Token Approvals</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Token approvals allow accounts to spend tokens on behalf of other accounts.
                  </p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Spender:</strong> Account that can spend tokens on behalf of the owner.</p>
                    <p><strong>Amount:</strong> Maximum amount the spender can spend.</p>
                    <p><strong>Token ID:</strong> Specific token that the approval applies to.</p>
                    <p><strong>Expiry:</strong> When the approval expires (optional).</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Ethereum Token Approvals</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    ERC-20 token approvals allow contracts to spend tokens on behalf of users.
                  </p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Spender:</strong> Contract address that can spend tokens.</p>
                    <p><strong>Amount:</strong> Maximum amount the spender can spend.</p>
                    <p><strong>Token Contract:</strong> ERC-20 token contract address.</p>
                    <p><strong>Gas:</strong> Transaction fee for the approval.</p>
                  </div>
                </div>
              </div>
            )}
          </InfoPopup>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleAuthorizationSubmit} className="space-y-6">
            <FormField label={t('common:fields.asset', 'Asset')} required>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{selectedAsset?.code}</p>
                    <p className="text-sm text-gray-600">{selectedAsset?.assetRef}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedAsset?.status || '')}`}>
                    {selectedAsset?.status}
                  </span>
                </div>
              </div>
            </FormField>

            <FormField label={t('authorizations:authorizationSetup.fields.holderAddress', 'Holder Address')} required>
              <input
                type="text"
                value={authorizationData.holderAddress}
                onChange={(e) => setAuthorizationData(prev => ({ ...prev, holderAddress: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t('authorizations:authorizationSetup.fields.holderAddressPlaceholder', 'rHolder123...')}
                required
              />
              <p className="text-sm text-gray-500 mt-1">XRPL address that will receive tokens</p>
            </FormField>

            <FormField label={t('authorizations:authorizationSetup.fields.limit', 'Trust Limit')} required>
              <input
                type="text"
                value={authorizationData.limit}
                onChange={(e) => setAuthorizationData(prev => ({ ...prev, limit: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t('authorizations:authorizationSetup.fields.limitPlaceholder', '1000000000')}
                required
              />
              <p className="text-sm text-gray-500 mt-1">{t('authorizations:authorizationSetup.fields.limitHint', 'Maximum amount the holder is willing to accept')}</p>
            </FormField>

            {/* Dynamic Authorization Status Section */}
            {authorizationStatus === 'checking' && selectedAsset && authorizationData.holderAddress && authorizationData.holderAddress.match(/^r[a-zA-Z0-9]{24,34}$/) && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Checking Authorization Status</p>
                    <p className="text-sm text-blue-700">Please wait while we check the current authorization status...</p>
                  </div>
                </div>
              </div>
            )}

            {authorizationStatus === 'external' && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-900">Trustline Already Exists</p>
                    <p className="text-sm text-green-700">A trustline already exists for this holder. You can proceed with issuance or create an external authorization record.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={createExternalAuthorization}
                  disabled={loading}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating External Authorization...' : 'Create External Authorization'}
                </button>
              </div>
            )}

            {authorizationStatus === 'none' && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">No Trustline Found</p>
                    <p className="text-sm text-blue-700">No trustline exists for this holder. Send an authorization request to the holder to set up their trustline.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={createAuthorizationRequest}
                  disabled={loading || !selectedAsset || !authorizationData.holderAddress || !authorizationData.currencyCode}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending Request...' : 'Send Authorization Request'}
                </button>
              </div>
            )}

            {authorizationStatus === 'awaiting_authorization' && (
              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-orange-900">Awaiting Your Authorization</p>
                    <p className="text-sm text-orange-700">The holder has set up their trustline. You can now authorize it to complete the process.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={authorizeExistingRequest}
                  disabled={loading}
                  className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Authorizing...' : 'Authorize Trustline'}
                </button>
              </div>
            )}

            {authorizationStatus === 'requested' && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Authorization Request Sent</p>
                    <p className="text-sm text-yellow-700">An authorization request has been sent to the holder. Please wait for them to set up their trustline.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="noRipple"
                  checked={authorizationData.noRipple}
                  onChange={(e) => setAuthorizationData(prev => ({ ...prev, noRipple: e.target.checked }))}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="noRipple" className="ml-2 text-sm text-gray-700">
                  {t('authorizations:authorizationSetup.options.noRipple', 'Set NoRipple flag')} ({t('authorizations:authorizationSetup.options.noRippleHint', 'prevents rippling through this trustline')})
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireAuth"
                  checked={authorizationData.requireAuth}
                  onChange={(e) => setAuthorizationData(prev => ({ ...prev, requireAuth: e.target.checked }))}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="requireAuth" className="ml-2 text-sm text-gray-700">
                  {t('authorizations:authorizationSetup.options.requireAuth', 'Require authorization')} ({t('authorizations:authorizationSetup.options.requireAuthHint', 'issuer must approve trustline')})
                </label>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-red-600 mr-2">⚠️</span>
                  <span className="text-red-800">{error}</span>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep('asset-selection')}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold transition-all duration-200 hover:border-gray-400"
              >
                {t('authorizations:actions.backToAssets', '← Back to Assets')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (currentStep === 'success') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 py-8 px-4 rounded-2xl">
          <div className="text-center">
            {/* Success Icon */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-xl mb-6">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{t('authorizations:success.title', 'Authorization Request Created Successfully!')}</h1>
              <p className="text-lg text-gray-600">
                {t('authorizations:success.description', 'A secure authorization request has been created and is waiting for the holder to set up their trustline. Share the link below with the holder to complete the process.', { ledger: selectedLedger })}
              </p>
            </div>

            {/* Authorization Request Details */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Authorization Request Details</h2>
              <div className="space-y-4">
                {result.id && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-700 mb-2">Request ID:</p>
                    <code className="text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded font-mono">
                      {result.id}
                    </code>
                  </div>
                )}
                {result.authUrl && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-700 mb-2">Authorization URL:</p>
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-green-700 bg-green-100 px-3 py-2 rounded font-mono break-all flex-1 mr-4">
                        {result.authUrl}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(result.authUrl || '')}
                        className="inline-flex items-center px-3 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200 text-sm"
                      >
                        Copy Link
                      </button>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      Share this secure link with the holder to set up their trustline
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                             <button
                 onClick={() => window.location.href = '/app/authorizations/history'}
                 className="px-6 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors duration-200 shadow-sm hover:shadow-md"
               >
                 {t('authorizations:actions.viewHistory', 'View History')}
               </button>
              <button
                onClick={() => {
                  setCurrentStep('ledger-selection')
                  setResult({})
                  setSelectedAsset(null)
                  setAuthorizationData({
                    currencyCode: '',
                    holderAddress: '',
                    issuerAddress: '',
                    limit: '1000000000',
                    noRipple: false,
                    requireAuth: true // Default to true for institutional use cases
                  })
                }}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors duration-200"
              >
                {t('authorizations:success.createAnotherAuthorization', 'Create Another Authorization')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === 'coming-soon') {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 py-12 px-6 rounded-2xl">
          <div className="text-gray-400 mb-6">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Coming Soon</h1>
          <p className="text-lg text-gray-600 mb-8">
            Authorization support for {selectedLedger} is currently under development.
          </p>
          <button
            onClick={() => setCurrentStep('ledger-selection')}
            className="px-6 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors duration-200"
          >
            ← Back to Ledger Selection
          </button>
        </div>
      </div>
    )
  }

  return null
}
