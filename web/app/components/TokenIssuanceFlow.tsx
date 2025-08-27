'use client'
import { useState } from 'react'
import { api, ensureJson } from '@/lib/api'
import FormField from './FormField'
import TransactionResult from './TransactionResult'
import LedgerLogo from './LedgerLogo'

type LedgerType = 'XRPL' | 'HEDERA' | 'ETHEREUM'
type Step = 'ledger-selection' | 'trustline-check' | 'trustline-setup' | 'token-issuance' | 'compliance-metadata' | 'success'

interface TrustlineData {
  currencyCode: string
  holderAddress: string
  issuerAddress: string
  limit: string
  holderSecret: string
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

interface ComplianceData {
  isin: string
  legalIssuerName: string
  micaClassification: 'stablecoin' | 'security_token' | 'utility_token' | 'asset_backed'
  kycRequirement: 'mandatory' | 'optional' | 'not_required'
  jurisdiction: string
  purpose: string
  expirationDate?: string
  transferRestrictions: boolean
  maxTransferAmount?: string
}

interface IssuanceResult {
  txHash?: string
  explorer?: string
  trustlineTxHash?: string
  trustlineExplorer?: string
}

export default function TokenIssuanceFlow() {
  const [currentStep, setCurrentStep] = useState<Step>('ledger-selection')
  const [selectedLedger, setSelectedLedger] = useState<LedgerType>('XRPL')
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
    holderSecret: '' 
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
    legalIssuerName: '',
    micaClassification: 'utility_token',
    kycRequirement: 'optional',
    jurisdiction: '',
    purpose: '',
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

  const ledgers: { type: LedgerType; name: string; description: string }[] = [
    {
      type: 'XRPL',
      name: 'XRPL (XRP Ledger)',
      description: 'Fast, energy-efficient blockchain for payments and tokenization'
    },
    {
      type: 'HEDERA',
      name: 'Hedera',
      description: 'Enterprise-grade public network for the decentralized economy'
    },
    {
      type: 'ETHEREUM',
      name: 'Ethereum',
      description: 'Decentralized platform for smart contracts and dApps'
    }
  ]

  const handleLedgerSelection = (ledger: LedgerType) => {
    setSelectedLedger(ledger)
    setCurrentStep('trustline-check')
  }

  const handleTrustlineCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Check if trustline exists using account_lines command
      const { data, error } = await api.POST('/trustlines/check', {
        body: {
          account: trustlineCheckData.holderAddress,
          peer: trustlineCheckData.issuerAddress,
          currency: trustlineCheckData.currencyCode,
          ledger_index: "validated"
        }
      })

      if (error) {
        // If the account doesn't exist or other error, assume trustline doesn't exist
        console.log('Trustline check failed, proceeding to create:', error)
        setTrustlineData(prev => ({
          ...prev,
          currencyCode: trustlineCheckData.currencyCode,
          holderAddress: trustlineCheckData.holderAddress,
          issuerAddress: trustlineCheckData.issuerAddress
        }))
        setCurrentStep('trustline-setup')
        return
      }

      // Check if the trustline exists in the response (API now filters by currency)
      const lines = data?.lines || []
      const existingTrustline = lines.length > 0 ? lines[0] : null
      
      const trustlineExists = !!existingTrustline
      
      // Store the check result
      setTrustlineCheckResult({
        exists: trustlineExists,
        details: existingTrustline
      })
      
      if (trustlineExists) {
        // Trustline exists, skip to token issuance
        setCurrentStep('token-issuance')
      } else {
        // Trustline doesn't exist, copy data and proceed to setup
        setTrustlineData(prev => ({
          ...prev,
          currencyCode: trustlineCheckData.currencyCode,
          holderAddress: trustlineCheckData.holderAddress,
          issuerAddress: trustlineCheckData.issuerAddress
        }))
        setCurrentStep('trustline-setup')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTrustlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await api.POST('/trustlines/create', {
        body: trustlineData
      })

      if (error || !data) {
        throw new Error(error?.error || 'Failed to create trustline')
      }

      // Store trustline result for later
      setResult(prev => ({
        ...prev,
        trustlineTxHash: data.txHash || undefined,
        trustlineExplorer: data.explorer || undefined
      }))

      setCurrentStep('token-issuance')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTokenIssuance = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Combine token data with compliance metadata
      const enrichedTokenData = {
        ...tokenData,
        metadata: {
          ...tokenData.metadata,
          compliance: complianceData
        }
      }

      const { data, error } = await api.POST('/tokens/issue', {
        body: enrichedTokenData
      })

      if (error || !data) {
        throw new Error(error?.error || 'Failed to issue token')
      }

      setResult(prev => ({
        ...prev,
        txHash: data.txHash,
        explorer: data.explorer
      }))

      setCurrentStep('compliance-metadata')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleComplianceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentStep('success')
  }

  const resetFlow = () => {
    setCurrentStep('ledger-selection')
    setTrustlineCheckData({ currencyCode: '', holderAddress: '', issuerAddress: '' })
    setTrustlineData({ currencyCode: '', holderAddress: '', issuerAddress: '', limit: '', holderSecret: '' })
    setTokenData({ currencyCode: '', amount: '', destination: '', metadata: {}, metadataRaw: '' })
    setComplianceData({
      isin: '',
      legalIssuerName: '',
      micaClassification: 'utility_token',
      kycRequirement: 'optional',
      jurisdiction: '',
      purpose: '',
      expirationDate: '',
      transferRestrictions: false,
      maxTransferAmount: ''
    })
    setResult(null)
    setError(null)
    setTrustlineCheckResult(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { step: 'ledger-selection', label: 'Select Ledger' },
            { step: 'trustline-check', label: 'Check Trustline' },
            { step: 'trustline-setup', label: 'Setup Trustline' },
            { step: 'token-issuance', label: 'Issue Token' },
            { step: 'compliance-metadata', label: 'Compliance' },
            { step: 'success', label: 'Complete' }
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep === item.step 
                  ? (item.step === 'success' ? 'bg-green-500 border-green-500 text-white' : 'bg-blue-500 border-blue-500 text-white')
                  : index < ['ledger-selection', 'trustline-check', 'trustline-setup', 'token-issuance', 'compliance-metadata', 'success'].indexOf(currentStep)
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 text-gray-500'
              }`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm ${
                currentStep === item.step 
                  ? (item.step === 'success' ? 'text-green-600 font-medium' : 'text-blue-600 font-medium')
                  : 'text-gray-500'
              }`}>
                {item.label}
              </span>
              {index < 5 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  index < ['ledger-selection', 'trustline-check', 'trustline-setup', 'token-issuance', 'compliance-metadata', 'success'].indexOf(currentStep)
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
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
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Select Target Ledger</h2>
            <p className="text-gray-600">Choose the blockchain platform where you want to issue your token.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ledgers.map((ledger) => (
                             <button
                 key={ledger.type}
                 onClick={() => handleLedgerSelection(ledger.type)}
                 className="p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
               >
                 <div className="mb-3">
                   <LedgerLogo type={ledger.type} size="lg" />
                 </div>
                 <h3 className="font-semibold mb-2">{ledger.name}</h3>
                 <p className="text-sm text-gray-600">{ledger.description}</p>
               </button>
            ))}
          </div>
        </div>
      )}

      {currentStep === 'trustline-check' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Check Trustline Status</h2>
            <p className="text-gray-600">
              Let's check if a trustline already exists for this currency and holder.
            </p>
          </div>
          
          <form onSubmit={handleTrustlineCheck} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Currency Code" required>
                <input
                  type="text"
                  value={trustlineCheckData.currencyCode}
                  onChange={(e) => setTrustlineCheckData(prev => ({ ...prev, currencyCode: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="USD, EUR, or custom code"
                  required
                />
              </FormField>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Holder Address" required>
                <input
                  type="text"
                  value={trustlineCheckData.holderAddress}
                  onChange={(e) => setTrustlineCheckData(prev => ({ ...prev, holderAddress: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="rHolder123..."
                  required
                />
              </FormField>
              <FormField label="Issuer Address" required>
                <input
                  type="text"
                  value={trustlineCheckData.issuerAddress}
                  onChange={(e) => setTrustlineCheckData(prev => ({ ...prev, issuerAddress: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="rIssuer456..."
                  required
                />
              </FormField>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep('ledger-selection')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check Trustline'}
              </button>
            </div>
          </form>

          {/* Trustline Check Result */}
          {trustlineCheckResult && (
            <div className={`p-4 rounded-lg border ${
              trustlineCheckResult.exists 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {trustlineCheckResult.exists ? (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h4 className={`text-sm font-medium ${
                    trustlineCheckResult.exists ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {trustlineCheckResult.exists ? 'Trustline Found!' : 'Trustline Not Found'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    trustlineCheckResult.exists ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {trustlineCheckResult.exists 
                      ? `A trustline exists for ${trustlineCheckData.currencyCode} from ${trustlineCheckData.issuerAddress} with limit ${trustlineCheckResult.details?.limit || 'unknown'} and balance ${trustlineCheckResult.details?.balance || '0'}.`
                      : `No trustline found for ${trustlineCheckData.currencyCode} from ${trustlineCheckData.issuerAddress}. You'll need to create one.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {currentStep === 'trustline-setup' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Create New Trustline</h2>
            <p className="text-gray-600">
              The trustline doesn't exist. Let's create a new one with the additional required information.
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Trustline Details</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Currency:</strong> {trustlineCheckData.currencyCode}</p>
              <p><strong>Holder:</strong> {trustlineCheckData.holderAddress}</p>
              <p><strong>Issuer:</strong> {trustlineCheckData.issuerAddress}</p>
            </div>
          </div>
          
          <form onSubmit={handleTrustlineSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Trust Limit" required>
                <input
                  type="text"
                  value={trustlineData.limit}
                  onChange={(e) => setTrustlineData(prev => ({ ...prev, limit: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1000000"
                  required
                />
              </FormField>
            </div>
            
            <FormField 
              label="Holder Secret (Family Seed)" 
              required
              helperText="This is the private key of the holder account that will receive the tokens."
            >
              <input
                type="password"
                value={trustlineData.holderSecret}
                onChange={(e) => setTrustlineData(prev => ({ ...prev, holderSecret: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="sEd7..."
                required
              />
            </FormField>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep('trustline-check')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Trustline'}
              </button>
            </div>
          </form>
        </div>
      )}

      {currentStep === 'token-issuance' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Issue Token</h2>
            <p className="text-gray-600">
              Now issue tokens from the issuer to the holder on {selectedLedger}.
            </p>
          </div>
          <form onSubmit={handleTokenIssuance} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Currency Code" required>
                <input
                  type="text"
                  value={tokenData.currencyCode}
                  onChange={(e) => setTokenData(prev => ({ ...prev, currencyCode: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="USD, EUR, or custom code"
                  required
                />
              </FormField>
              <FormField label="Amount" required>
                <input
                  type="text"
                  value={tokenData.amount}
                  onChange={(e) => setTokenData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="100"
                  required
                />
              </FormField>
            </div>
            <FormField label="Destination Address" required>
              <input
                type="text"
                value={tokenData.destination}
                onChange={(e) => setTokenData(prev => ({ ...prev, destination: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="r..."
                required
              />
            </FormField>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-800">Public On-Chain Metadata</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This metadata will be stored permanently on the blockchain and is publicly visible. 
                    Do not include sensitive information like personal data, compliance details, or private business information.
                  </p>
                </div>
              </div>
              
              <FormField 
                label="Additional Metadata (JSON)" 
                helperText="Optional public metadata (e.g., token description, issuer website, logo URL)"
              >
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder='{"description": "EUR-backed stablecoin", "website": "https://example.com", "logo": "https://example.com/logo.png"}'
                />
              </FormField>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep('trustline-setup')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Issuing Token...' : 'Issue Token'}
              </button>
            </div>
          </form>
        </div>
      )}

      {currentStep === 'compliance-metadata' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">MiCA Compliance Metadata</h2>
            <p className="text-gray-600">
              Configure compliance metadata for regulatory reporting and audit trails.
            </p>
          </div>
          <form onSubmit={handleComplianceSubmit} className="space-y-6">
            {/* Basic Compliance Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="ISIN Code" required>
                  <input
                    type="text"
                    value={complianceData.isin}
                    onChange={(e) => setComplianceData(prev => ({ ...prev, isin: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="DE0001234567"
                    required
                  />
                </FormField>
                <FormField label="Legal Issuer Name" required>
                  <input
                    type="text"
                    value={complianceData.legalIssuerName}
                    onChange={(e) => setComplianceData(prev => ({ ...prev, legalIssuerName: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Acme Bank AG"
                    required
                  />
                </FormField>
              </div>
            </div>

            {/* MiCA Classification */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">MiCA Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Token Classification" required>
                  <select
                    value={complianceData.micaClassification}
                    onChange={(e) => setComplianceData(prev => ({ ...prev, micaClassification: e.target.value as any }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="stablecoin">Stablecoin</option>
                    <option value="security_token">Security Token</option>
                    <option value="utility_token">Utility Token</option>
                    <option value="asset_backed">Asset-Backed Token</option>
                  </select>
                </FormField>
                <FormField label="KYC Requirement" required>
                  <select
                    value={complianceData.kycRequirement}
                    onChange={(e) => setComplianceData(prev => ({ ...prev, kycRequirement: e.target.value as any }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="mandatory">Mandatory</option>
                    <option value="optional">Optional</option>
                    <option value="not_required">Not Required</option>
                  </select>
                </FormField>
              </div>
            </div>

            {/* Jurisdiction and Purpose */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Jurisdiction & Purpose</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Jurisdiction" required>
                  <input
                    type="text"
                    value={complianceData.jurisdiction}
                    onChange={(e) => setComplianceData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="DE, EEA, EU"
                    required
                  />
                </FormField>
                <FormField label="Purpose" required>
                  <input
                    type="text"
                    value={complianceData.purpose}
                    onChange={(e) => setComplianceData(prev => ({ ...prev, purpose: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Payment, Investment, Utility"
                    required
                  />
                </FormField>
              </div>
            </div>

            {/* Transfer Restrictions */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Transfer Restrictions</h3>
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
                    Enable transfer restrictions
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
              <h3 className="text-lg font-semibold mb-4">Expiration (Optional)</h3>
              <FormField label="Expiration Date">
                <input
                  type="date"
                  value={complianceData.expirationDate}
                  onChange={(e) => setComplianceData(prev => ({ ...prev, expirationDate: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </FormField>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep('token-issuance')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Complete Issuance
              </button>
            </div>
          </form>
        </div>
      )}

      {currentStep === 'success' && result && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-semibold mb-2">Token Issued Successfully!</h2>
            <p className="text-gray-600">
              Your token has been issued on {selectedLedger} and stored in the local database.
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Transaction Details</h3>
            <div className="space-y-3">
              {result.trustlineTxHash && (
                <TransactionResult
                  title="Trustline Transaction"
                  txHash={result.trustlineTxHash}
                  explorer={result.trustlineExplorer}
                />
              )}
              {result.txHash && (
                <TransactionResult
                  title="Token Issuance Transaction"
                  txHash={result.txHash}
                  explorer={result.explorer}
                />
              )}
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={resetFlow}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Issue Another Token
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
