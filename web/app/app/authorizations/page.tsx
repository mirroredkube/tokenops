'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, History } from 'lucide-react'
import AuthorizationFlow from '../../components/AuthorizationFlow'

export default function ManageAuthorizationsPage() {
  const router = useRouter()
  const [showNewAuthorization, setShowNewAuthorization] = useState(false)

  if (showNewAuthorization) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowNewAuthorization(false)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            ← Back to Authorizations
          </button>
          <button
            onClick={() => router.push('/app/authorizations/history')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <History className="h-4 w-4 mr-2" />
            View History
          </button>
        </div>
        <AuthorizationFlow />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Asset Authorizations</h1>
          <p className="text-gray-600 mt-2">
            Create and manage asset authorizations for token issuance across multiple ledgers.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNewAuthorization(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Authorization
          </button>
          <button
            onClick={() => router.push('/app/authorizations/history')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <History className="h-4 w-4 mr-2" />
            View History
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-emerald-500 text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Authorizations</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-500 text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500 text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-6">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Authorizations Yet</h3>
        <p className="text-gray-600 mb-6">Create your first authorization to get started with token issuance.</p>
        <button
          onClick={() => setShowNewAuthorization(true)}
          className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create First Authorization
        </button>
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Asset Authorization Information</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Asset Authorizations</strong> allow accounts to hold tokens from specific issuers on XRPL.</p>
          <p><strong>Limit:</strong> Maximum amount the holder is willing to accept from this issuer.</p>
          <p><strong>NoRipple:</strong> Prevents the authorization from being used in rippling transactions.</p>
          <p><strong>RequireAuth:</strong> Issuer must explicitly authorize the trustline before tokens can be sent.</p>
          <p><strong>Reserve:</strong> Each authorization consumes XRP reserve from the holder account.</p>
        </div>
      </div>
    </div>
  )
}