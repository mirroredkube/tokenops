'use client'
import { useState } from 'react'
import { api, ensureJson } from '@/lib/api'
import FormField from './FormField'
import TransactionResult from './TransactionResult'
import LedgerLogo from './LedgerLogo'

type LedgerType = 'XRPL' | 'HEDERA' | 'ETHEREUM'
type Step = 'ledger-selection' | 'trustline-check' | 'token-issuance' | 'compliance-metadata' | 'success' | 'coming-soon'

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
    
    // Different flows for different ledgers
    if (ledger === 'XRPL') {
      setCurrentStep('trustline-check')
    } else {
      // For Hedera and Ethereum, show coming soon
      setCurrentStep('coming-soon')
    }
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
        // Stay on current step, additional fields will appear
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
        // Trustline exists, stay on current step and show result
        // User will explicitly click "Continue to Token Issuance"
        // Copy data to token issuance form
        setTokenData(prev => ({
          ...prev,
          currencyCode: trustlineCheckData.currencyCode,
          destination: trustlineCheckData.holderAddress
        }))
      } else {
        // Trustline doesn't exist, copy data for creation form
        setTrustlineData(prev => ({
          ...prev,
          currencyCode: trustlineCheckData.currencyCode,
          holderAddress: trustlineCheckData.holderAddress,
          issuerAddress: trustlineCheckData.issuerAddress
        }))
        // Also pre-populate token data for after trustline creation
        setTokenData(prev => ({
          ...prev,
          currencyCode: trustlineCheckData.currencyCode,
          destination: trustlineCheckData.holderAddress
        }))
        // Stay on same step, additional fields will appear
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

      // Populate token data with trustline information
      setTokenData(prev => ({
        ...prev,
        currencyCode: trustlineData.currencyCode,
        destination: trustlineData.holderAddress,
        amount: '100' // Default amount
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
      // Only send token data - compliance data is collected separately and stored off-chain
      const { data, error } = await api.POST('/tokens/issue', {
        body: tokenData
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
    setLoading(true)
    setError(null)

    try {
      // Store compliance data off-chain in database
      const { data, error } = await api.POST('/compliance/store', {
        body: {
          tokenTxHash: result?.txHash,
          complianceData: complianceData
        }
      })

      if (error || !data) {
        throw new Error(error?.error || 'Failed to store compliance data')
      }

      setCurrentStep('success')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
            { step: 'trustline-check', label: 'Setup Trustline' },
            { step: 'token-issuance', label: 'Issue Token' },
            { step: 'compliance-metadata', label: 'Compliance' },
            { step: 'success', label: 'Complete' }
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep === item.step 
                  ? (item.step === 'success' ? 'bg-green-500 border-green-500 text-white' : 'bg-blue-500 border-blue-500 text-white')
                  : index < ['ledger-selection', 'trustline-check', 'token-issuance', 'compliance-metadata', 'success'].indexOf(currentStep)
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
              {index < 4 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  index < ['ledger-selection', 'trustline-check', 'token-issuance', 'compliance-metadata', 'success'].indexOf(currentStep)
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-6">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Select Target Ledger</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Choose the blockchain platform where you want to issue your token
              </p>
            </div>

            {/* Ledger Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {ledgers.map((ledger) => (
                <button
                  key={ledger.type}
                  onClick={() => handleLedgerSelection(ledger.type)}
                  className="group bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-emerald-300 transition-all duration-300 text-left overflow-hidden transform hover:-translate-y-1"
                >
                  <div className="p-8">
                    <div className="mb-6 flex justify-center">
                      <div className="p-4 bg-gray-100 rounded-xl group-hover:bg-emerald-50 transition-colors duration-300">
                        <LedgerLogo type={ledger.type} size="lg" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{ledger.name}</h3>
                    <p className="text-gray-600 leading-relaxed mb-6">{ledger.description}</p>
                    
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      {ledger.type === 'XRPL' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Coming Soon
                        </span>
                      )}
                      
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentStep === 'trustline-check' && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Trustline Configuration</h1>
              <p className="text-gray-600">
                We'll verify if a trustline exists and configure one if needed for your token issuance
              </p>
            </div>

            {/* Main Form Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-6">
                <h2 className="text-2xl font-bold text-white mb-2">Trustline Details</h2>
                <p className="text-emerald-100">Enter the basic information to check trustline status</p>
              </div>

              {/* Form Content */}
              <div className="p-8">
                <form onSubmit={handleTrustlineCheck} className="space-y-8">
                                     {/* Input Fields */}
                   <div className="space-y-6">
                     <div className="space-y-2">
                       <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                         Currency Code
                         <span className="text-red-500 ml-1">*</span>
                       </label>
                       <input
                         type="text"
                         value={trustlineCheckData.currencyCode}
                         onChange={(e) => setTrustlineCheckData(prev => ({ ...prev, currencyCode: e.target.value }))}
                         className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 text-base font-medium transition-all duration-200"
                         placeholder="USD, EUR, COMP"
                         required
                       />
                     </div>
                     
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                           Holder Address
                           <span className="text-red-500 ml-1">*</span>
                         </label>
                         <input
                           type="text"
                           value={trustlineCheckData.holderAddress}
                           onChange={(e) => setTrustlineCheckData(prev => ({ ...prev, holderAddress: e.target.value }))}
                           className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 text-base font-mono transition-all duration-200"
                           placeholder="rHolder123..."
                           required
                         />
                       </div>
                       
                       <div className="space-y-2">
                         <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                           Issuer Address
                           <span className="text-red-500 ml-1">*</span>
                         </label>
                         <input
                           type="text"
                           value={trustlineCheckData.issuerAddress}
                           onChange={(e) => setTrustlineCheckData(prev => ({ ...prev, issuerAddress: e.target.value }))}
                           className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 text-base font-mono transition-all duration-200"
                           placeholder="rIssuer456..."
                           required
                         />
                       </div>
                     </div>
                   </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-8 border-t border-gray-100">
                                         <button
                       type="button"
                       onClick={() => setCurrentStep('ledger-selection')}
                       className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold transition-all duration-200 hover:border-gray-400"
                     >
                      ← Back to Ledger Selection
                    </button>
                                         <button
                       type="submit"
                       disabled={loading}
                       className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
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
                          Check & Configure Trustline
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Trustline Status Result */}
                {trustlineCheckResult && (
                  <div className={`mt-12 p-8 rounded-2xl border-2 ${
                    trustlineCheckResult.exists 
                      ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200' 
                      : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                  }`}>
                    <div className="flex items-start space-x-6">
                      <div className="flex-shrink-0">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          trustlineCheckResult.exists 
                            ? 'bg-emerald-100' 
                            : 'bg-amber-100'
                        }`}>
                          {trustlineCheckResult.exists ? (
                            <svg className="w-8 h-8 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
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
                           trustlineCheckResult.exists ? 'text-emerald-800' : 'text-amber-800'
                         }`}>
                          {trustlineCheckResult.exists ? '✅ Trustline Found!' : '⚠️ Trustline Not Found'}
                        </h3>
                        
                                                 <p className={`text-base leading-relaxed ${
                           trustlineCheckResult.exists ? 'text-emerald-700' : 'text-amber-700'
                         }`}>
                          {trustlineCheckResult.exists 
                            ? `A trustline exists for ${trustlineCheckData.currencyCode} from ${trustlineCheckData.issuerAddress} with limit ${trustlineCheckResult.details?.limit || 'unknown'} and balance ${trustlineCheckResult.details?.balance || '0'}.`
                            : `No trustline found for ${trustlineCheckData.currencyCode} from ${trustlineCheckData.issuerAddress}. Please provide additional details to create one.`
                          }
                        </p>
                        
                        {/* Additional Fields for Creation */}
                        {!trustlineCheckResult.exists && (
                          <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">Create New Trustline</h4>
                                                         <div className="space-y-6">
                               <div className="space-y-2">
                                 <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                   Trust Limit
                                   <span className="text-red-500 ml-1">*</span>
                                 </label>
                                 <input
                                   type="text"
                                   value={trustlineData.limit}
                                   onChange={(e) => setTrustlineData(prev => ({ ...prev, limit: e.target.value }))}
                                   className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 text-base transition-all duration-200"
                                   placeholder="1000000"
                                   required
                                 />
                               </div>
                               
                               <div className="space-y-2">
                                 <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                   Holder Secret (Family Seed)
                                   <span className="text-red-500 ml-1">*</span>
                                 </label>
                                 <input
                                   type="password"
                                   value={trustlineData.holderSecret}
                                   onChange={(e) => setTrustlineData(prev => ({ ...prev, holderSecret: e.target.value }))}
                                   className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 text-base font-mono transition-all duration-200"
                                   placeholder="sEd7..."
                                   required
                                 />
                                 <p className="text-sm text-gray-500 mt-2">Private key of the holder account</p>
                               </div>
                             </div>
                            
                            <div className="mt-6">
                                                             <button
                                 type="button"
                                 onClick={handleTrustlineSubmit}
                                 disabled={loading}
                                 className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
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
                               onClick={() => setCurrentStep('token-issuance')}
                               className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                             >
                              Continue to Token Issuance
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
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Coming Soon!</h1>
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
                  <p className="text-sm text-gray-600">Manage trustlines and permissions</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Compliance</h3>
                  <p className="text-sm text-gray-600">MiCA-compliant token management</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setCurrentStep('ledger-selection')}
                className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-all duration-200"
              >
                ← Back to Ledger Selection
              </button>
              <button
                onClick={() => window.open('https://github.com/your-repo', '_blank')}
                className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-200"
              >
                Follow Development
              </button>
            </div>
          </div>
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
              <FormField label="Currency Code (Locked)" required>
                <div className="relative">
                  <input
                    type="text"
                    value={tokenData.currencyCode}
                    onChange={(e) => setTokenData(prev => ({ ...prev, currencyCode: e.target.value }))}
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 cursor-not-allowed"
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
                <p className="text-xs text-gray-500 mt-1">Currency locked based on trustline configuration</p>
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
            <FormField label="Destination Address (Locked)" required>
              <div className="relative">
                <input
                  type="text"
                  value={tokenData.destination}
                  onChange={(e) => setTokenData(prev => ({ ...prev, destination: e.target.value }))}
                  className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 cursor-not-allowed"
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
              <p className="text-xs text-gray-500 mt-1">Destination address locked based on trustline configuration</p>
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
                onClick={() => setCurrentStep('trustline-check')}
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
