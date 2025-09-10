'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, Check, X as XIcon, Info } from 'lucide-react'

interface Permission {
  category: string
  permissions: {
    [key: string]: boolean
  }
}

interface RolePermissions {
  [role: string]: {
    [category: string]: {
      [permission: string]: boolean
    }
  }
}

const PERMISSIONS_MATRIX: RolePermissions = {
  ADMIN: {
    users: {
      view: true,
      create: true,
      update: true,
      delete: true
    },
    organization: {
      view: true,
      update: true
    },
    assets: {
      view: true,
      create: true,
      update: true,
      delete: true
    },
    products: {
      view: true,
      create: true,
      update: true,
      delete: true
    },
    issuances: {
      view: true,
      create: true,
      update: true,
      delete: true
    },
    compliance: {
      view: true,
      verify: true,
      approve: true,
      export: true
    },
    authorizations: {
      view: true,
      approve: true,
      reject: true
    },
    reports: {
      view: true,
      export: true
    },
    settings: {
      view: true,
      update: true
    }
  },
  COMPLIANCE_OFFICER: {
    users: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    organization: {
      view: true,
      update: false
    },
    assets: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    products: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    issuances: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    compliance: {
      view: true,
      verify: true,
      approve: true,
      export: true
    },
    authorizations: {
      view: true,
      approve: true,
      reject: true
    },
    reports: {
      view: true,
      export: true
    },
    settings: {
      view: true,
      update: false
    }
  },
  ISSUER_ADMIN: {
    users: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    organization: {
      view: true,
      update: false
    },
    assets: {
      view: true,
      create: true,
      update: true,
      delete: false
    },
    products: {
      view: true,
      create: true,
      update: true,
      delete: false
    },
    issuances: {
      view: true,
      create: true,
      update: true,
      delete: false
    },
    compliance: {
      view: true,
      verify: true,
      approve: false,
      export: true
    },
    authorizations: {
      view: true,
      approve: true,
      reject: false
    },
    reports: {
      view: true,
      export: true
    },
    settings: {
      view: false,
      update: false
    }
  },
  COMPLIANCE_REVIEWER: {
    users: {
      view: false,
      create: false,
      update: false,
      delete: false
    },
    organization: {
      view: false,
      update: false
    },
    assets: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    products: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    issuances: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    compliance: {
      view: true,
      verify: true,
      approve: false,
      export: false
    },
    authorizations: {
      view: true,
      approve: false,
      reject: false
    },
    reports: {
      view: true,
      export: false
    },
    settings: {
      view: false,
      update: false
    }
  },
  VIEWER: {
    users: {
      view: false,
      create: false,
      update: false,
      delete: false
    },
    organization: {
      view: false,
      update: false
    },
    assets: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    products: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    issuances: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    compliance: {
      view: true,
      verify: false,
      approve: false,
      export: false
    },
    authorizations: {
      view: true,
      approve: false,
      reject: false
    },
    reports: {
      view: true,
      export: false
    },
    settings: {
      view: false,
      update: false
    }
  }
}

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  ISSUER_ADMIN: 'Issuer Admin',
  COMPLIANCE_REVIEWER: 'Compliance Reviewer',
  VIEWER: 'Viewer'
}

const CATEGORY_LABELS = {
  users: 'User Management',
  organization: 'Organization',
  assets: 'Assets',
  products: 'Products',
  issuances: 'Issuances',
  compliance: 'Compliance',
  authorizations: 'Authorizations',
  reports: 'Reports',
  settings: 'Settings'
}

const PERMISSION_LABELS = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  verify: 'Verify',
  approve: 'Approve',
  reject: 'Reject',
  export: 'Export'
}

export default function PermissionsMatrix() {
  const { t } = useTranslation(['users', 'common'])
  const [selectedRole, setSelectedRole] = useState<string>('ADMIN')

  const roles = Object.keys(PERMISSIONS_MATRIX)
  const categories = Object.keys(PERMISSIONS_MATRIX[selectedRole] || {})

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          {t('users:permissions.title', 'Role Permissions Matrix')}
        </h3>
      </div>

      {/* Role Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('users:selectRole', 'Select Role')}
        </label>
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                selectedRole === role
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                {t('users:permissions.category', 'Category')}
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                {t('users:permissions.permissions', 'Permissions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((category) => {
              const permissions = PERMISSIONS_MATRIX[selectedRole][category]
              const permissionKeys = Object.keys(permissions)
              
              return (
                <tr key={category} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-900">
                      {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-3">
                      {permissionKeys.map((permission) => {
                        const hasPermission = permissions[permission]
                        return (
                          <div
                            key={permission}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                              hasPermission
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {hasPermission ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <XIcon className="h-3 w-3" />
                            )}
                            {PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS]}
                          </div>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Role Description */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">
              {ROLE_LABELS[selectedRole as keyof typeof ROLE_LABELS]}
            </h4>
            <p className="text-sm text-blue-800">
              {t(`users:roleDescriptions.${selectedRole}`, 'Role description not available')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
