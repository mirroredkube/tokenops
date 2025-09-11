'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { History } from 'lucide-react'
import { useEffect } from 'react'
import { CanCreateIssuances } from '../../../components/RoleGuard'
import TokenIssuanceFlow from '../../../components/TokenIssuanceFlow'

export default function NewIssuancePage() {
  return (
    <CanCreateIssuances fallback={<RedirectToHistory />}>
      <NewIssuancePageContent />
    </CanCreateIssuances>
  )
}

function RedirectToHistory() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to issuance history page
    router.replace('/app/issuance/history')
  }, [router])

  // Show a brief loading message while redirecting
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <History className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Redirecting...</h3>
        <p className="text-gray-600">Taking you to issuance history.</p>
      </div>
    </div>
  )
}

function NewIssuancePageContent() {
  const { t } = useTranslation(['issuances', 'common'])
  const router = useRouter()
  const searchParams = useSearchParams()
  const assetId = searchParams.get('assetId')

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('issuances:pages.newIssuance.title', 'New Issuance')}</h1>
        <button
          onClick={() => router.push('/app/issuance/history')}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <History className="h-4 w-4 mr-2" />
          {t('issuances:pages.newIssuance.viewHistory', 'View History')}
        </button>
      </div>
      <TokenIssuanceFlow preSelectedAssetId={assetId} />
    </div>
  )
}
