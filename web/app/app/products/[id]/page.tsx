'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { 
  Package, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Plus,
  Building,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye
} from 'lucide-react'
import { getTenantApiUrl } from '@/lib/tenantApi'
import { CanManageProducts } from '../../../components/RoleGuard'
import ConfirmationDialog from '../../../components/ConfirmationDialog'

interface Product {
  id: string
  name: string
  assetClass: 'ART' | 'EMT' | 'OTHER'
  targetMarkets: string[]
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'RETIRED'
  createdAt: string
  updatedAt: string
  organization: {
    id: string
    name: string
  }
  policyPresets?: {
    kycTier: 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL'
    sanctionsPosture: 'STRICT' | 'MODERATE' | 'PERMISSIVE'
  }
  documents?: {
    authorizationRef?: string
    whitePaperRef?: string
  }
  _count?: {
    assets: number
  }
}

interface Asset {
  id: string
  code: string
  ledger: string
  status: string
  createdAt: string
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { t } = useTranslation(['products', 'common'])
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
  }>({
    isOpen: false
  })

  useEffect(() => {
    fetchProduct()
    fetchAssets()
  }, [params.id])

  const fetchProduct = async () => {
    try {
      const apiUrl = getTenantApiUrl()
      const response = await fetch(`${apiUrl}/v1/products/${params.id}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch product')
      }

      setProduct(data)
    } catch (err: any) {
      console.error('Error fetching product:', err)
      setError(err.message || 'Failed to fetch product')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssets = async () => {
    try {
      const apiUrl = getTenantApiUrl()
      const response = await fetch(`${apiUrl}/v1/assets?productId=${params.id}&limit=50`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch assets')
      }

      setAssets(data.assets || [])
    } catch (err: any) {
      console.error('Error fetching assets:', err)
      // Don't set error for assets, just log it
    }
  }

  const handleDeleteClick = () => {
    setDeleteDialog({ isOpen: true })
  }

  const handleDeleteConfirm = async () => {
    try {
      const apiUrl = getTenantApiUrl()
      const response = await fetch(`${apiUrl}/v1/products/${params.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete product')
      }

      router.push('/app/products')
    } catch (err: any) {
      console.error('Error deleting product:', err)
      setError(err.message || 'Failed to delete product')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'DRAFT':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'PAUSED':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case 'RETIRED':
        return <XCircle className="h-5 w-5 text-gray-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800'
      case 'PAUSED':
        return 'bg-orange-100 text-orange-800'
      case 'RETIRED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">{t('common:status.loading')}</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
        <p className="text-gray-600">{error || 'Product not found'}</p>
        <button
          onClick={() => router.push('/app/products')}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Products
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: t('products:detail.tabs.overview'), icon: <Package className="h-4 w-4" /> },
    { id: 'assets', label: t('products:detail.tabs.assets'), icon: <Building className="h-4 w-4" /> },
    { id: 'documents', label: t('products:detail.tabs.documents'), icon: <FileText className="h-4 w-4" /> },
    { id: 'settings', label: t('products:detail.tabs.settings'), icon: <Settings className="h-4 w-4" /> },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common:actions.back')}
          </button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(product.status)}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                  {t(`products:create.form.status.options.${product.status}`)}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {t('products:create.form.assetClass.options.' + product.assetClass)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CanManageProducts>
            <button
              onClick={() => router.push(`/app/products/${product.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-4 w-4" />
              {t('common:actions.edit')}
            </button>
            
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              {t('common:actions.delete')}
            </button>
          </CanManageProducts>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">{t('products:detail.sections.basicInfo')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900">{product.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Class</label>
                <p className="text-gray-900">{t(`products:create.form.assetClass.options.${product.assetClass}`)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex items-center gap-2">
                  {getStatusIcon(product.status)}
                  <span className="text-gray-900">{t(`products:create.form.status.options.${product.status}`)}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                <p className="text-gray-900">{product.organization.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <p className="text-gray-900">{formatDate(product.createdAt)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                <p className="text-gray-900">{formatDate(product.updatedAt)}</p>
              </div>
            </div>

            {product.targetMarkets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Markets</label>
                <div className="flex flex-wrap gap-2">
                  {product.targetMarkets.map((market) => (
                    <span
                      key={market}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {t(`products:create.form.targetMarkets.options.${market}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.policyPresets && (
              <div>
                <h3 className="text-lg font-medium mb-3">{t('products:detail.sections.compliance')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">KYC Tier</label>
                    <p className="text-gray-900">{t(`products:create.form.policyPresets.kycTier.options.${product.policyPresets.kycTier}`)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sanctions Posture</label>
                    <p className="text-gray-900">{t(`products:create.form.policyPresets.sanctionsPosture.options.${product.policyPresets.sanctionsPosture}`)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('products:detail.sections.associatedAssets')}</h2>
              <CanManageProducts>
                <button
                  onClick={() => router.push(`/app/assets/create?productId=${product.id}`)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {t('products:list.actions.createAsset')}
                </button>
              </CanManageProducts>
            </div>

            {assets.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('products:detail.emptyAssets.title')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('products:detail.emptyAssets.description')}
                </p>
                <CanManageProducts>
                  <button
                    onClick={() => router.push(`/app/assets/create?productId=${product.id}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('products:detail.emptyAssets.action')}
                  </button>
                </CanManageProducts>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asset Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ledger
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{asset.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {asset.ledger}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(asset.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/app/assets/${asset.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">{t('products:detail.sections.documents')}</h2>
            
            {product.documents ? (
              <div className="space-y-4">
                {product.documents.authorizationRef && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('products:create.form.documents.authorizationRef.label')}
                    </label>
                    <p className="text-gray-900">{product.documents.authorizationRef}</p>
                  </div>
                )}
                
                {product.documents.whitePaperRef && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('products:create.form.documents.whitePaperRef.label')}
                    </label>
                    <p className="text-gray-900">{product.documents.whitePaperRef}</p>
                  </div>
                )}
                
                {!product.documents.authorizationRef && !product.documents.whitePaperRef && (
                  <p className="text-gray-500">No documents attached to this product.</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No documents attached to this product.</p>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">{t('products:detail.tabs.settings')}</h2>
            <p className="text-gray-500">Product settings and configuration options will be available here.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title={t('products:delete.title')}
        message={t('products:delete.message', { name: product?.name || '' })}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />
    </div>
  )
}
