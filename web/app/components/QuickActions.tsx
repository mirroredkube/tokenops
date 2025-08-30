'use client'

import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Plus, Coins, Shield, CheckSquare } from 'lucide-react'

interface QuickActionsProps {
  canCreateAsset?: boolean
  canStartIssuance?: boolean
  canVerifyCompliance?: boolean
}

export default function QuickActions({
  canCreateAsset = true,
  canStartIssuance = true,
  canVerifyCompliance = true
}: QuickActionsProps) {
  const router = useRouter()
  const { t, ready } = useTranslation(['common', 'dashboard'])

  const actions = [
    {
      id: 'create-asset',
      title: t('dashboard:quickActions.createAsset', 'Create Asset'),
      description: t('dashboard:quickActions.createAssetDesc', 'Create a new token asset'),
      icon: Plus,
      href: '/app/assets/create',
      disabled: !canCreateAsset,
      color: 'slate'
    },
    {
      id: 'start-issuance',
      title: t('dashboard:quickActions.startIssuance', 'Start Issuance'),
      description: t('dashboard:quickActions.startIssuanceDesc', 'Issue assets to an address'),
      icon: Coins,
      href: '/app/issuance/new',
      disabled: !canStartIssuance,
      color: 'slate'
    },
    {
      id: 'verify-compliance',
      title: t('dashboard:quickActions.verifyCompliance', 'Verify Compliance Record'),
      description: t('dashboard:quickActions.verifyComplianceDesc', 'Review and verify compliance records'),
      icon: Shield,
      href: '/app/compliance',
      disabled: !canVerifyCompliance,
      color: 'slate'
    },
    {
      id: 'authorizations',
      title: t('dashboard:quickActions.setupAuthorization', 'Setup Authorization'),
      description: t('dashboard:quickActions.setupAuthorizationDesc', 'Create and manage asset authorizations'),
      icon: CheckSquare,
      href: '/app/authorizations',
      disabled: false,
      color: 'slate'
    }
  ]

  // Show loading state if translations aren't ready
  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-100 p-4 rounded-lg border-2 animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getColorClasses = (color: string, disabled: boolean) => {
    if (disabled) {
      return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
    }
    
    switch (color) {
      case 'blue':
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
      case 'green':
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
      case 'slate':
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('dashboard:quickActions.title', 'Quick Actions')}</h2>
        <p className="text-sm text-gray-600">{t('dashboard:quickActions.subtitle', 'Common tasks to get started')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => !action.disabled && router.push(action.href)}
              disabled={action.disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                ${getColorClasses(action.color, action.disabled)}
                ${!action.disabled ? 'hover:shadow-md' : ''}
              `}
            >
              <div className="flex items-start space-x-3">
                                 <div className={`
                   p-2 rounded-lg
                   ${action.disabled 
                     ? 'bg-gray-200' 
                     : 'bg-slate-100'
                   }
                 `}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-sm">{action.title}</h3>
                  <p className="text-xs mt-1 opacity-75">{action.description}</p>
                </div>
              </div>
              
              {action.disabled && (
                <div className="absolute top-2 right-2">
                  <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded">
                    No Access
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
