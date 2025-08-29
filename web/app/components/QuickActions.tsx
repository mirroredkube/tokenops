'use client'

import { useRouter } from 'next/navigation'
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

  const actions = [
    {
      id: 'create-asset',
      title: 'Create Asset',
      description: 'Create a new token asset',
      icon: Plus,
      href: '/app/assets/create',
      disabled: !canCreateAsset,
      color: 'slate'
    },
    {
      id: 'start-issuance',
      title: 'Start Issuance',
      description: 'Issue assets to an address',
      icon: Coins,
      href: '/app/issuance/new',
      disabled: !canStartIssuance,
      color: 'slate'
    },
                {
              id: 'verify-compliance',
              title: 'Verify Compliance Record',
              description: 'Review and verify compliance records',
              icon: Shield,
              href: '/app/compliance',
              disabled: !canVerifyCompliance,
              color: 'slate'
            },
            {
              id: 'authorizations',
              title: 'Setup Authorization',
              description: 'Create and manage asset authorizations',
              icon: CheckSquare,
              href: '/app/authorizations',
              disabled: false,
              color: 'slate'
            }
  ]

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
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <p className="text-sm text-gray-600">Common tasks to get started</p>
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
