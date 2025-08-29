'use client'
import { useRouter } from 'next/navigation'
import { History } from 'lucide-react'
import AuthorizationFlow from '../../components/AuthorizationFlow'

export default function ManageAuthorizationsPage() {
  const router = useRouter()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">New Authorization</h1>
          <p className="text-gray-600 mt-1">Create asset authorizations for token issuance across multiple ledgers</p>
        </div>
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