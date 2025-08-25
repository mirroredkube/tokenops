'use client'
import { useState } from 'react'
import { api, ensureJson } from '@/lib/api'
import FormField from './FormField'
import TransactionResult from './TransactionResult'

type LedgerType = 'XRPL' | 'HEDERA' | 'ETHEREUM'
type Step = 'ledger-selection' | 'trustline-setup' | 'token-issuance' | 'success'

interface TrustlineData {
  currencyCode: string
  limit: string
  holderSecret: string
}

interface TokenData {
  currencyCode: string
  amount: string
  destination: string
  metadata: Record<string, any>
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
  const [trustlineData, setTrustlineData] = useState<TrustlineData>({
    currencyCode: '',
    limit: '',
    holderSecret: ''
  })
  const [tokenData, setTokenData] = useState<TokenData>({
    currencyCode: '',
    amount: '',
    destination: '',
    metadata: {}
  })
  const [result, setResult] = useState<IssuanceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ledgers: { type: LedgerType; name: string; description: string; icon: string }[] = [
    {
      type: 'XRPL',
      name: 'XRPL (XRP Ledger)',
      description: 'Fast, energy-efficient blockchain for payments and tokenization',
      icon: '🌊'
    },
    {
      type: 'HEDERA',
      name: 'Hedera',
      description: 'Enterprise-grade public network for the decentralized economy',
      icon: '🌿'
    },
    {
      type: 'ETHEREUM',
      name: 'Ethereum',
      description: 'Decentralized platform for smart contracts and dApps',
      icon: '🔷'
    }
  ]

  const handleLedgerSelection = (ledger: LedgerType) => {
    setSelectedLedger(ledger)
    setCurrentStep('trustline-setup')
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

      setCurrentStep('success')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetFlow = () => {
    setCurrentStep('ledger-selection')
    setTrustlineData({ currencyCode: '', limit: '', holderSecret: '' })
    setTokenData({ currencyCode: '', amount: '', destination: '', metadata: {} })
    setResult(null)
    setError(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { step: 'ledger-selection', label: 'Select Ledger' },
            { step: 'trustline-setup', label: 'Setup Trustline' },
            { step: 'token-issuance', label: 'Issue Token' },
            { step: 'success', label: 'Complete' }
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep === item.step 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : index < ['ledger-selection', 'trustline-setup', 'token-issuance', 'success'].indexOf(currentStep)
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 text-gray-500'
              }`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm ${
                currentStep === item.step ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}>
                {item.label}
              </span>
              {index < 3 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  index < ['ledger-selection', 'trustline-setup', 'token-issuance', 'success'].indexOf(currentStep)
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
                <div className="text-3xl mb-3">{ledger.icon}</div>
                <h3 className="font-semibold mb-2">{ledger.name}</h3>
                <p className="text-sm text-gray-600">{ledger.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentStep === 'trustline-setup' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Setup Trustline</h2>
            <p className="text-gray-600">
              Before issuing tokens on {selectedLedger}, the holder needs to establish a trustline with the issuer.
            </p>
          </div>
          <form onSubmit={handleTrustlineSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Currency Code" required>
                <input
                  type="text"
                  value={trustlineData.currencyCode}
                  onChange={(e) => setTrustlineData(prev => ({ ...prev, currencyCode: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="USD, EUR, or custom code"
                  required
                />
              </FormField>
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
                {loading ? 'Creating Trustline...' : 'Create Trustline'}
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
            <FormField 
              label="Metadata (JSON)" 
              helperText="Optional metadata to be stored with the token transaction"
            >
              <textarea
                value={JSON.stringify(tokenData.metadata, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setTokenData(prev => ({ ...prev, metadata: parsed }))
                  } catch {
                    // Ignore invalid JSON while typing
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder='{"jurisdiction": "DE", "purpose": "payment"}'
              />
            </FormField>
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
