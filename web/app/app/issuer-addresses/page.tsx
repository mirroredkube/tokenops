'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, CheckCircle, XCircle, Clock, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { getTenantApiUrl } from '@/lib/tenantApi'
import FormField from '../../components/FormField'
import CustomDropdown from '../../components/CustomDropdown'

interface IssuerAddress {
  id: string
  organizationId: string
  address: string
  ledger: string
  network: string
  allowedUseTags: string[]
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REVOKED'
  approvedAt?: string
  approvedBy?: string
  suspendedAt?: string
  suspendedBy?: string
  reason?: string
  createdAt: string
  updatedAt: string
}

interface Organization {
  id: string
  name: string
  legalName: string
}

interface CreateAddressData {
  organizationId: string
  address: string
  ledger: 'XRPL' | 'ETHEREUM' | 'HEDERA'
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  allowedUseTags: ('ART' | 'EMT' | 'OTHER')[]
}

export default function IssuerAddressesPage() {
  const { t } = useTranslation(['issuerAddresses', 'common'])
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<IssuerAddress[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    organizationId: '',
    status: '',
    ledger: '',
    network: ''
  })
  
  // Current user's organization
  const [userOrganization, setUserOrganization] = useState<Organization | null>(null)
  
  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createData, setCreateData] = useState<CreateAddressData>({
    organizationId: '',
    address: '',
    ledger: 'XRPL',
    network: 'TESTNET',
    allowedUseTags: ['OTHER']
  })
  const [createLoading, setCreateLoading] = useState(false)
  
  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [pendingAddressId, setPendingAddressId] = useState<string | null>(null)
  const [approvalReason, setApprovalReason] = useState('')
  const [approvalLoading, setApprovalLoading] = useState(false)
  
  // Suspension modal state
  const [showSuspensionModal, setShowSuspensionModal] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState('')
  const [suspensionLoading, setSuspensionLoading] = useState(false)

  // Fetch data on component mount
  useEffect(() => {
    fetchAddresses()
    fetchOrganizations()
  }, [])

  // Update organization when user changes
  useEffect(() => {
    if (user?.organization) {
      setUserOrganization(user.organization as any)
      setFilters(prev => ({ ...prev, organizationId: user.organization!.id }))
      setCreateData(prev => ({ ...prev, organizationId: user.organization!.id }))
    }
  }, [user])

  // Fetch addresses when filters change
  useEffect(() => {
    fetchAddresses()
  }, [filters])

  const fetchAddresses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters.organizationId) params.append('organizationId', filters.organizationId)
      if (filters.status) params.append('status', filters.status)
      if (filters.ledger) params.append('ledger', filters.ledger)
      if (filters.network) params.append('network', filters.network)
      
      const response = await fetch(`${getTenantApiUrl()}/v1/issuer-addresses?${params.toString()}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch addresses')
      }
      
      setAddresses(data?.addresses || [])
    } catch (err: any) {
      console.error('Error fetching addresses:', err)
      setError(err.message || t('messages.fetchError'))
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await api.GET('/v1/organizations')
      if ((response.data as any)?.organizations) {
        const orgs = (response.data as any).organizations
        setOrganizations(orgs)
        
        // Use the user's organization from the auth context
        if (user?.organization) {
          setUserOrganization(user.organization as any)
          setFilters(prev => ({ ...prev, organizationId: user.organization!.id }))
          setCreateData(prev => ({ ...prev, organizationId: user.organization!.id }))
        } else if (orgs.length > 0) {
          // Fallback to first organization if user context not available
          const userOrg = orgs[0]
          setUserOrganization(userOrg)
          setFilters(prev => ({ ...prev, organizationId: userOrg.id }))
          setCreateData(prev => ({ ...prev, organizationId: userOrg.id }))
        }
      }
    } catch (err: any) {
      console.error('Error fetching organizations:', err)
    }
  }

  const handleCreateAddress = async () => {
    try {
      setCreateLoading(true)
      setError(null)
      
      const response = await api.POST('/v1/issuer-addresses', {
        body: createData
      })
      
      if (response.error) {
        throw new Error((response.error as any).error || t('messages.createError'))
      }
      
      setSuccessMessage(t('messages.createSuccess'))
      setShowCreateModal(false)
      setCreateData({
        organizationId: '',
        address: '',
        ledger: 'XRPL',
        network: 'TESTNET',
        allowedUseTags: ['OTHER']
      })
      fetchAddresses()
    } catch (err: any) {
      console.error('Error creating address:', err)
      setError(err.message || t('messages.createError'))
    } finally {
      setCreateLoading(false)
    }
  }

  const handleApproveAddress = async () => {
    if (!pendingAddressId || !approvalReason.trim()) return
    
    try {
      setApprovalLoading(true)
      setError(null)
      
      const response = await (api as any).PUT(`/v1/issuer-addresses/${pendingAddressId}/approve`, {
        body: {
          reason: approvalReason,
          allowedUseTags: createData.allowedUseTags
        }
      })
      
      if (response.error) {
        throw new Error((response.error as any).error || t('messages.approveError'))
      }
      
      setSuccessMessage(t('messages.approveSuccess'))
      setShowApprovalModal(false)
      setPendingAddressId(null)
      setApprovalReason('')
      fetchAddresses()
    } catch (err: any) {
      console.error('Error approving address:', err)
      setError(err.message || t('messages.approveError'))
    } finally {
      setApprovalLoading(false)
    }
  }

  const handleSuspendAddress = async (addressId: string) => {
    if (!suspensionReason.trim()) return
    
    try {
      setSuspensionLoading(true)
      setError(null)
      
      const response = await (api as any).PUT(`/v1/issuer-addresses/${addressId}/suspend`, {
        body: {
          reason: suspensionReason
        }
      })
      
      if (response.error) {
        throw new Error((response.error as any).error || t('messages.suspendError'))
      }
      
      setSuccessMessage(t('messages.suspendSuccess'))
      setShowSuspensionModal(false)
      setSuspensionReason('')
      fetchAddresses()
    } catch (err: any) {
      console.error('Error suspending address:', err)
      setError(err.message || t('messages.suspendError'))
    } finally {
      setSuspensionLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'SUSPENDED':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'REVOKED':
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800'
      case 'REVOKED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('description')}
            {userOrganization && (
              <span className="block text-sm text-gray-500 mt-1">
                {t('organization', { organizationName: userOrganization.name })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Plus className='h-5 w-5 mr-2' />
          {t('actions.registerAddress')}
        </button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">{successMessage}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">{t('filters.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label={t('filters.status')}>
            <CustomDropdown
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              options={[
                { value: '', label: t('filters.allStatuses') },
                { value: 'PENDING', label: t('status.pending') },
                { value: 'APPROVED', label: t('status.approved') },
                { value: 'SUSPENDED', label: t('status.suspended') },
                { value: 'REVOKED', label: t('status.revoked') }
              ]}
              placeholder={t('filters.selectStatus')}
            />
          </FormField>

          <FormField label={t('filters.ledger')}>
            <CustomDropdown
              value={filters.ledger}
              onChange={(value) => setFilters(prev => ({ ...prev, ledger: value }))}
              options={[
                { value: '', label: t('filters.allLedgers') },
                { value: 'XRPL', label: t('ledger.xrpl') },
                { value: 'ETHEREUM', label: t('ledger.ethereum') },
                { value: 'HEDERA', label: t('ledger.hedera') }
              ]}
              placeholder={t('filters.selectLedger')}
            />
          </FormField>

          <FormField label={t('filters.network')}>
            <CustomDropdown
              value={filters.network}
              onChange={(value) => setFilters(prev => ({ ...prev, network: value }))}
              options={[
                { value: '', label: t('filters.allNetworks') },
                { value: 'MAINNET', label: t('network.mainnet') },
                { value: 'TESTNET', label: t('network.testnet') },
                { value: 'DEVNET', label: t('network.devnet') }
              ]}
              placeholder={t('filters.selectNetwork')}
            />
          </FormField>
        </div>
      </div>

      {/* Addresses Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className='text-lg font-semibold'>{t('table.title', { count: addresses.length })}</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">{t('table.loading')}</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>{t('table.noAddresses')}</p>
            <p className="text-sm">{t('actions.registerAddress')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.address')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.ledgerNetwork')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.useTags')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.created')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {addresses.map((address) => (
                  <tr key={address.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {address.address}
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {address.ledger}/{address.network}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {address.allowedUseTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(address.status)}
                        <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(address.status)}`}>
                          {address.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(address.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {address.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setPendingAddressId(address.id)
                              setShowApprovalModal(true)
                            }}
                            className="text-green-600 hover:text-green-900"
                            title={t('actions.approveAddress')}
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        )}
                        {address.status === 'APPROVED' && (
                          <button
                            onClick={() => {
                              setPendingAddressId(address.id)
                              setShowSuspensionModal(true)
                            }}
                            className="text-red-600 hover:text-red-900"
                            title={t('actions.suspendAddress')}
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Address Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('modals.create.title')}</h3>
            
            <div className="space-y-4">
              <FormField label={t('modals.create.organization')} required>
                <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50">
                  <span className='text-gray-700'>{userOrganization?.name || t('modals.create.loading')}</span>
                </div>
              </FormField>

              <FormField label={t('modals.create.address')} required>
                <input
                  type="text"
                  value={createData.address}
                  onChange={(e) => setCreateData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('modals.create.addressPlaceholder')}
                />
              </FormField>

              <FormField label={t('modals.create.ledger')} required>
                <CustomDropdown
                  value={createData.ledger}
                  onChange={(value) => setCreateData(prev => ({ ...prev, ledger: value as any }))}
                  options={[
                    { value: 'XRPL', label: t('ledger.xrpl') },
                    { value: 'ETHEREUM', label: t('ledger.ethereum') },
                    { value: 'HEDERA', label: t('ledger.hedera') }
                  ]}
                  placeholder={t('filters.selectLedger')}
                />
              </FormField>

              <FormField label={t('modals.create.network')} required>
                <CustomDropdown
                  value={createData.network}
                  onChange={(value) => setCreateData(prev => ({ ...prev, network: value as any }))}
                  options={[
                    { value: 'MAINNET', label: t('network.mainnet') },
                    { value: 'TESTNET', label: t('network.testnet') },
                    { value: 'DEVNET', label: t('network.devnet') }
                  ]}
                  placeholder={t('filters.selectNetwork')}
                />
              </FormField>

              <FormField label={t('modals.create.allowedUseTags')} required>
                <div className="space-y-2">
                  {['ART', 'EMT', 'OTHER'].map((tag) => (
                    <label key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={createData.allowedUseTags.includes(tag as any)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateData(prev => ({
                              ...prev,
                              allowedUseTags: [...prev.allowedUseTags, tag as any]
                            }))
                          } else {
                            setCreateData(prev => ({
                              ...prev,
                              allowedUseTags: prev.allowedUseTags.filter(t => t !== tag)
                            }))
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{tag}</span>
                    </label>
                  ))}
                </div>
              </FormField>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAddress}
                disabled={createLoading || !createData.organizationId || !createData.address}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
              >
                {createLoading ? t('actions.creating') : t('actions.registerAddress')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('modals.approve.title')}</h3>
            
            <div className="space-y-4">
              <FormField label={t('modals.approve.reason')} required>
                <textarea
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter reason for approval..."
                  rows={3}
                />
              </FormField>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowApprovalModal(false)
                  setPendingAddressId(null)
                  setApprovalReason('')
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAddress}
                disabled={approvalLoading || !approvalReason.trim()}
                className="px-4 py-2 text-green-600 border border-green-600 rounded-md hover:bg-green-50 disabled:opacity-50"
              >
                {approvalLoading ? t('actions.approving') : t('actions.approveAddress')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspension Modal */}
      {showSuspensionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('modals.suspend.title')}</h3>
            
            <div className="space-y-4">
              <FormField label={t('modals.suspend.reason')} required>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter reason for suspension..."
                  rows={3}
                />
              </FormField>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowSuspensionModal(false)
                  setPendingAddressId(null)
                  setSuspensionReason('')
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => pendingAddressId && handleSuspendAddress(pendingAddressId)}
                disabled={suspensionLoading || !suspensionReason.trim()}
                className="px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
              >
                {suspensionLoading ? t('actions.suspending') : t('actions.suspendAddress')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
