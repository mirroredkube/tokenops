'use client'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { History } from 'lucide-react'
import AuthorizationFlow from '../../components/AuthorizationFlow'

export default function ManageAuthorizationsPage() {
  const { t } = useTranslation(['authorizations', 'common'])
  const router = useRouter()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('authorizations:page.title', 'New Authorization')}</h1>
          <p className="text-gray-600 mt-1">{t('authorizations:page.description', 'Create asset authorizations for token issuance across multiple ledgers')}</p>
        </div>
        <button
          onClick={() => router.push('/app/authorizations/history')}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <History className="h-4 w-4 mr-2" />
          {t('authorizations:actions.viewHistory', 'View History')}
        </button>
      </div>
      <AuthorizationFlow />
    </div>
  )
}