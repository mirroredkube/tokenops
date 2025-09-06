'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api, ensureJson } from '@/lib/api'
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

  // Security: Always use wallet signing mode, never handle private keys

  // Check if trustline exists on XRPL ledger
  const checkTrustlineExists = async () => {
    if (!selectedAsset || !authorizationData.holderAddress) return null
    
    try {
      const { data } = await api.GET('/v1/authorizations/{id}/status', {
        params: {
          path: {
            id: 'temp-check' // We'll use a temporary ID for this check
          },
          query: {
            holder: authorizationData.holderAddress,
            currency: selectedAsset.code,
            issuer: selectedAsset.issuer
          }
        }
      })
      
      // If we get a response, check if trustline exists
      return data?.trustlineExists || false
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

  // Create external trustline entry
  const createExternalTrustlineEntry = async () => {
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
      // First check if trustline already exists on XRPL
      const trustlineExists = await checkTrustlineExists()
      if (trustlineExists) {
        // Check if we already have this external trustline in our database
        const existingAuth = await checkExistingAuthorization()
        if (existingAuth) {
          setError(`A trustline already exists for this holder and asset. Status: ${existingAuth.status}. You can view it in the authorization history.`)
          setLoading(false)
          return
        }
        
        // Trustline exists externally but not in our DB - create external entry
        await createExternalTrustlineEntry()
        return
      }

      // Trustline doesn't exist on XRPL - check for existing authorization request in database
      const existingAuth = await checkExistingAuthorization()
      if (existingAuth) {
        setError(`An authorization request already exists for this holder and asset. Status: ${existingAuth.status}. You can view it in the authorization history.`)
        setLoading(false)
        return
      }

      console.log('Creating authorization request with data:', {
        assetId: selectedAsset.id,
        holder: authorizationData.holderAddress,
        currencyCode: selectedAsset.code,
        issuerAddress: selectedAsset.issuer,
        limit: authorizationData.limit,
        noRipple: authorizationData.noRipple,
        requireAuth: authorizationData.requireAuth
      })

      const { data, error } = await api.PUT('/v1/assets/{assetId}/authorizations/{holder}', {
        params: {
          path: {
            assetId: selectedAsset.id,
            holder: authorizationData.holderAddress
          },
          body: {
            params: {
              holderAddress: authorizationData.holderAddress,
              currencyCode: selectedAsset.code, // Use asset code
              issuerAddress: selectedAsset.issuer, // Use asset issuer
              limit: authorizationData.limit,
              noRipple: authorizationData.noRipple,
              requireAuth: authorizationData.requireAuth,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
              callbackUrl: `${window.location.origin}/app/authorizations`
            },
            signing: {
              mode: 'wallet'
            }
          }
        }
      })

      if (error) {
        console.error('API Error:', error)
        const errorMessage = typeof error === 'object' && error.error 
          ? error.error 
          : typeof error === 'string' 
            ? error 
            : 'Failed to create authorization request'
        throw new Error(errorMessage)
      }

      if (!data) {
        throw new Error('No data received from server')
      }

      // Store the result and show success
      setResult({
        authorizationId: (data as any).id,
        explorer: (data as any).authUrl
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

            <FormField 
              label={t('authorizations:authorizationSetup.fields.authorizationRequest', 'Authorization Request')} 
              required
              helperText={t('authorizations:authorizationSetup.fields.authorizationRequestHint', 'Send a secure authorization request to the holder')}
            >
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
                  disabled={loading || !selectedAsset || !authorizationData.holderAddress || !authorizationData.currencyCode}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Request...' : 'Send Authorization Request'}
                </button>
              </div>
            </FormField>

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
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 font-semibold flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent"></div>
                    {t('authorizations:actions.creatingAuthorization', 'Creating Authorization...')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('authorizations:actions.createAuthorization', 'Create Authorization')}
                  </>
                )}
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
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{t('authorizations:success.title', 'Authorization Created Successfully!')}</h1>
              <p className="text-lg text-gray-600">
                {t('authorizations:success.description', 'Your authorization has been submitted to {{ledger}} and recorded in the database.', { ledger: selectedLedger })}
              </p>
            </div>

            {/* Transaction Details */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('authorizations:success.transactionDetails', 'Transaction Details')}</h2>
              <div className="space-y-4">
                {result.txId && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">{t('authorizations:success.authorizationTransaction', 'Transaction ID:')}</p>
                    <div className="flex items-center justify-between">
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
                          {t('authorizations:success.viewOnExplorer', 'View on Explorer →')}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {result.authorizationId && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-700 mb-2">Authorization ID:</p>
                    <code className="text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded font-mono">
                      {result.authorizationId}
                    </code>
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
