'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface AuthorizationRequest {
  id: string
  assetId: string
  holderAddress: string
  requestedLimit: string
  authUrl: string
  status: 'INVITED' | 'CONSUMED' | 'EXPIRED' | 'CANCELLED'
  expiresAt: string
  consumedAt?: string
  createdAt: string
  asset: {
    id: string
    code: string
    ledger: string
    network: string
    issuingAddress: {
      address: string
    }
  }
}

interface TrustlineStatus {
  exists: boolean
  authorized: boolean
  limit: string
  balance: string
}

export default function AuthorizationPage() {
  const params = useParams()
  const token = params.token as string
  
  const [authRequest, setAuthRequest] = useState<AuthorizationRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trustlineStatus, setTrustlineStatus] = useState<TrustlineStatus | null>(null)
  const [xamanPayload, setXamanPayload] = useState<{
    uuid: string
    deepLink: string
    qrPng: string
  } | null>(null)
  const [signingStatus, setSigningStatus] = useState<'idle' | 'pending' | 'signed' | 'rejected' | 'expired'>('idle')
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  // Fetch authorization request details
  useEffect(() => {
    const fetchAuthRequest = async () => {
      try {
        // Use the new authorization request API endpoint
        const response = await fetch(`http://localhost:4000/v1/authorization-requests/token/${token}`)
        if (!response.ok) {
          throw new Error('Authorization request not found or expired')
        }
        const data = await response.json()
        setAuthRequest(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load authorization request')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchAuthRequest()
    }
  }, [token])

  // Check trustline status
  const checkTrustlineStatus = async () => {
    if (!authRequest) return

    try {
      // Check authorization status using the new API
      const response = await fetch(`http://localhost:4000/v1/assets/${authRequest.assetId}/authorizations/${authRequest.holderAddress}`)
      if (response.ok) {
        const data = await response.json()
        setTrustlineStatus({
          exists: data.exists || false,
          authorized: data.status === 'ISSUER_AUTHORIZED',
          limit: data.limit || '0',
          balance: data.balance || '0'
        })
      }
    } catch (err) {
      console.error('Failed to check trustline status:', err)
    }
  }

  // Start Xaman signing flow
  const startXamanFlow = async () => {
    if (!authRequest) return
    
    try {
      setSigningStatus('pending')
      
      // Call the holder auth endpoint to create Xaman payload
      const response = await fetch(`http://localhost:4000/v1/holder-auth/${authRequest.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start authorization flow')
      }
      
      const payload = await response.json()
      setXamanPayload(payload)
      
      // Check if mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      if (isMobile) {
        // Open Xaman app directly on mobile
        window.location.href = payload.deepLink
      }
      
      // Start polling for status updates
      pollSigningStatus(payload.uuid)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start authorization flow')
      setSigningStatus('idle')
    }
  }
  
  // Poll for signing status updates
  const pollSigningStatus = async (uuid: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:4000/v1/holder-auth/${authRequest?.id}/status`)
        if (response.ok) {
          const status = await response.json()
          
          if (status.status === 'CONSUMED') {
            setSigningStatus('signed')
            setTransactionHash('signed') // We don't have the actual tx hash in this simple implementation
            clearInterval(pollInterval)
            checkTrustlineStatus()
          }
        }
      } catch (err) {
        console.error('Error polling signing status:', err)
      }
    }, 2000) // Poll every 2 seconds
    
    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      if (signingStatus === 'pending') {
        setSigningStatus('expired')
      }
    }, 600000)
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authorization request...</p>
        </div>
      </div>
    )
  }

  if (error || !authRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Authorization Request Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The authorization request may have expired or been revoked.'}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Trustline Authorization</h1>
              <p className="text-gray-600 mt-1">Set up your trustline to receive {authRequest.asset.code} tokens</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Expires</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(authRequest.expiresAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Authorization Details */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Authorization Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{authRequest.asset.code}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Issuer Address</label>
                <p className="mt-1 text-sm text-gray-900 font-mono break-all">{authRequest.asset.issuingAddress.address}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Address</label>
                <p className="mt-1 text-sm text-gray-900 font-mono break-all">{authRequest.holderAddress}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Trust Limit</label>
                <p className="mt-1 text-sm text-gray-900">{authRequest.requestedLimit} {authRequest.asset.code}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Network</label>
                <p className="mt-1 text-sm text-gray-900">{authRequest.asset.network} ({authRequest.asset.ledger})</p>
              </div>
            </div>

            {/* Security Warnings */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Important Security Notice</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>This will create a trustline that allows you to hold {authRequest.asset.code} tokens</li>
                      <li>You will need to maintain a small XRP reserve (typically 2 XRP)</li>
                      <li>Only sign transactions from trusted sources</li>
                      <li>Verify the issuer address matches the expected issuer</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Xaman Integration */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Set Up Trustline with Xaman</h2>
            
            {signingStatus === 'idle' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sign with Xaman Wallet</h3>
                <p className="text-gray-600 mb-6">
                  Use your Xaman wallet to securely sign the trustline transaction. We never handle your private keys.
                </p>
                <button
                  onClick={startXamanFlow}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Start Authorization
                </button>
              </div>
            )}
            
            {signingStatus === 'pending' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Waiting for Signature</h3>
                <p className="text-gray-600 mb-6">
                  Please sign the transaction in your Xaman wallet. The page will update automatically when complete.
                </p>
                
                {xamanPayload && (
                  <div className="space-y-4">
                    {/* QR Code for Desktop */}
                    <div className="flex justify-center">
                      <img 
                        src={xamanPayload.qrPng} 
                        alt="Xaman QR Code" 
                        className="w-48 h-48 border border-gray-200 rounded-lg"
                      />
                    </div>
                    
                    {/* Deep Link Button */}
                    <div>
                      <button
                        onClick={() => window.open(xamanPayload.deepLink, '_blank')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Open in Xaman
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {signingStatus === 'signed' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Trustline Created Successfully!</h3>
                <p className="text-gray-600 mb-4">
                  Your trustline has been created on the XRPL network. The issuer will now authorize it.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    ✅ Trustline created and recorded in our system
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    The issuer will be notified and can now authorize your trustline.
                  </p>
                </div>
                <button
                  onClick={checkTrustlineStatus}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                >
                  Check Status
                </button>
              </div>
            )}
            
            {(signingStatus === 'rejected' || signingStatus === 'expired') && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {signingStatus === 'rejected' ? 'Transaction Rejected' : 'Request Expired'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {signingStatus === 'rejected' 
                    ? 'The transaction was rejected in your wallet. You can try again.'
                    : 'The authorization request has expired. Please request a new one.'
                  }
                </p>
                <button
                  onClick={() => {
                    setSigningStatus('idle')
                    setXamanPayload(null)
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Trustline Status */}
            {trustlineStatus && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Trustline Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exists:</span>
                    <span className={trustlineStatus.exists ? 'text-green-600' : 'text-red-600'}>
                      {trustlineStatus.exists ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Authorized:</span>
                    <span className={trustlineStatus.authorized ? 'text-green-600' : 'text-red-600'}>
                      {trustlineStatus.authorized ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Limit:</span>
                    <span className="text-gray-900">{trustlineStatus.limit}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
