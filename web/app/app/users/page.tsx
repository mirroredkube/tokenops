'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  Mail, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Search,
  Filter,
  X as XIcon
} from 'lucide-react'
import { api } from '@/lib/api'
import { AdminOnly } from '@app/components/RoleGuard'
import PermissionsMatrix from '@app/components/PermissionsMatrix'
import CustomDropdown from '@app/components/CustomDropdown'

interface User {
  id: string
  email: string
  name?: string
  role: 'ADMIN' | 'COMPLIANCE_OFFICER' | 'ISSUER_ADMIN' | 'COMPLIANCE_REVIEWER' | 'VIEWER'
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  createdAt: string
  updatedAt: string
  twoFactorEnabled: boolean
}

interface UserListResponse {
  users: User[]
  total: number
  page: number
  limit: number
  pages: number
}

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  ISSUER_ADMIN: 'Issuer Admin',
  COMPLIANCE_REVIEWER: 'Compliance Reviewer',
  VIEWER: 'Viewer'
}

const ROLE_DESCRIPTIONS = {
  ADMIN: 'Full organization control and user management',
  COMPLIANCE_OFFICER: 'Compliance oversight and policy enforcement',
  ISSUER_ADMIN: 'Asset and issuance operations management',
  COMPLIANCE_REVIEWER: 'Day-to-day compliance verification',
  VIEWER: 'Read-only access for monitoring and reporting'
}

const STATUS_COLORS = {
  ACTIVE: 'text-green-600 bg-green-50',
  SUSPENDED: 'text-yellow-600 bg-yellow-50',
  INACTIVE: 'text-gray-600 bg-gray-50'
}

export default function UsersPage() {
  return (
    <AdminOnly fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">You don't have permission to access user management.</p>
        </div>
      </div>
    }>
      <UsersPageContent />
    </AdminOnly>
  )
}

function UsersPageContent() {
  const { t } = useTranslation(['users', 'common'])
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsMatrix, setShowPermissionsMatrix] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20
  })

  // Fetch users
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['users', pagination.page, pagination.limit, searchTerm, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter })
      })
      
      const response = await api.GET(`/v1/users?${params}`)
      return response.data as UserListResponse
    }
  })

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await api.PATCH(`/v1/users/${userId}`, {
        role
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowEditModal(false)
      setSelectedUser(null)
    }
  })

  // Update user status mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await api.PATCH(`/v1/users/${userId}`, {
        status
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserRoleMutation.mutate({ userId, role: newRole })
  }

  const handleStatusChange = (userId: string, newStatus: string) => {
    updateUserStatusMutation.mutate({ userId, status: newStatus })
  }

  const filteredUsers = usersData?.users || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            {t('users:title', 'User Management')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('users:subtitle', 'Manage organization users and their roles')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPermissionsMatrix(true)}
            className="border border-emerald-600 text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-50 flex items-center gap-2 transition-colors"
          >
            <Shield className="h-4 w-4" />
            {t('users:viewPermissions', 'View Permissions')}
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="border border-emerald-600 text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-50 flex items-center gap-2 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {t('users:inviteUser', 'Invite User')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('users:searchUsers', 'Search users...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors hover:border-gray-400"
            />
          </div>
          
          <CustomDropdown
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: '', label: t('users:allRoles', 'All Roles') },
              ...Object.entries(ROLE_LABELS).map(([value, label]) => ({
                value,
                label
              }))
            ]}
            placeholder={t('users:allRoles', 'All Roles')}
          />

          <CustomDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: t('users:allStatuses', 'All Statuses') },
              { value: 'ACTIVE', label: t('users:active', 'Active') },
              { value: 'SUSPENDED', label: t('users:suspended', 'Suspended') },
              { value: 'INACTIVE', label: t('users:inactive', 'Inactive') }
            ]}
            placeholder={t('users:allStatuses', 'All Statuses')}
          />

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {usersData?.total || 0} {t('users:totalUsers', 'total users')}
            </span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">{t('common:loading', 'Loading...')}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{t('users:errorLoading', 'Error loading users')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users:user', 'User')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users:role', 'Role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users:status', 'Status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users:security', 'Security')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users:joined', 'Joined')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users:actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || t('users:noName', 'No name')}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ROLE_LABELS[user.role]}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ROLE_DESCRIPTIONS[user.role]}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[user.status]}`}>
                        {user.status === 'ACTIVE' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {user.status === 'SUSPENDED' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {user.status === 'INACTIVE' && <XCircle className="h-3 w-3 mr-1" />}
                        {t(`users:${user.status.toLowerCase()}`, user.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {user.twoFactorEnabled ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">2FA Enabled</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">2FA Disabled</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title={t('users:editUser', 'Edit user')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(user.id, user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                          className={`p-1 ${
                            user.status === 'ACTIVE' 
                              ? 'text-yellow-600 hover:text-yellow-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={user.status === 'ACTIVE' ? t('users:suspendUser', 'Suspend user') : t('users:activateUser', 'Activate user')}
                        >
                          {user.status === 'ACTIVE' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {usersData && usersData.pages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {t('users:showingResults', 'Showing')} {((pagination.page - 1) * pagination.limit) + 1} {t('users:to', 'to')} {Math.min(pagination.page * pagination.limit, usersData.total)} {t('users:of', 'of')} {usersData.total} {t('users:results', 'results')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  {t('common:previous', 'Previous')}
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= usersData.pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  {t('common:next', 'Next')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          onSave={handleRoleChange}
          isLoading={updateUserRoleMutation.isPending}
        />
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Permissions Matrix Modal */}
      {showPermissionsMatrix && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('users:permissions.title', 'Role Permissions Matrix')}
                </h3>
                <button
                  onClick={() => setShowPermissionsMatrix(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="h-6 w-6" />
                </button>
              </div>
              <PermissionsMatrix />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Edit User Modal Component
function EditUserModal({ 
  user, 
  onClose, 
  onSave, 
  isLoading 
}: { 
  user: User
  onClose: () => void
  onSave: (userId: string, role: string) => void
  isLoading: boolean
}) {
  const { t } = useTranslation(['users', 'common'])
  const [selectedRole, setSelectedRole] = useState(user.role)

  const handleSave = () => {
    if (selectedRole !== user.role) {
      onSave(user.id, selectedRole)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('users:editUser', 'Edit User')}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('users:user', 'User')}
            </label>
            <div className="text-sm text-gray-900">
              {user.name || t('users:noName', 'No name')}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('users:role', 'Role')}
            </label>
            <CustomDropdown
              value={selectedRole}
              onChange={(value) => setSelectedRole(value as any)}
              options={Object.entries(ROLE_LABELS).map(([value, label]) => ({
                value,
                label
              }))}
              placeholder={t('users:selectRole', 'Select a role')}
            />
            <p className="text-xs text-gray-500 mt-1">
              {ROLE_DESCRIPTIONS[selectedRole]}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('common:cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors"
          >
            {isLoading ? t('common:saving', 'Saving...') : t('common:save', 'Save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Invite User Modal Component
function InviteUserModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['users', 'common'])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('VIEWER')
  const [isLoading, setIsLoading] = useState(false)

  const handleInvite = async () => {
    if (!email) return
    
    setIsLoading(true)
    try {
      // TODO: Implement invite API call
      console.log('Inviting user:', { email, role })
      onClose()
    } catch (error) {
      console.error('Error inviting user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('users:inviteUser', 'Invite User')}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('users:emailAddress', 'Email Address')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('users:role', 'Role')}
            </label>
            <CustomDropdown
              value={role}
              onChange={setRole}
              options={Object.entries(ROLE_LABELS).map(([value, label]) => ({
                value,
                label
              }))}
              placeholder={t('users:selectRole', 'Select a role')}
            />
            <p className="text-xs text-gray-500 mt-1">
              {ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS]}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('common:cancel', 'Cancel')}
          </button>
          <button
            onClick={handleInvite}
            disabled={!email || isLoading}
            className="px-4 py-2 text-sm font-medium border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors"
          >
            {isLoading ? t('users:inviting', 'Inviting...') : t('users:sendInvite', 'Send Invite')}
          </button>
        </div>
      </div>
    </div>
  )
}
