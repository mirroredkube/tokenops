'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { History } from 'lucide-react'
import TokenIssuanceFlow from '../../../components/TokenIssuanceFlow'

export default function NewIssuancePage() {
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
