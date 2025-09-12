'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantApiUrl } from '@/lib/tenantApi'
import { useAuth } from '@/contexts/AuthContext'
import { CanManageProducts } from '../../components/RoleGuard'
import CustomDropdown from '../../components/CustomDropdown'
import { trackPageView } from '../../lib/analytics'

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
  _count?: {
    assets: number
  }
}

interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export default function ProductsPage() {
  const { t } = useTranslation(['products', 'common'])
  const { user } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    assetClass: '',
    search: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20
  })

  // Track page view
  useEffect(() => {
    trackPageView('products_list')
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [filters, pagination])

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const apiUrl = getTenantApiUrl()
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.assetClass && { assetClass: filters.assetClass }),
        ...(filters.search && { search: filters.search })
      })
      
      const response = await fetch(`${apiUrl}/v1/products?${queryParams}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products')
      }

      if (!data || !data.products) {
        throw new Error('No products data received')
      }

      setProducts(data.products)
    } catch (err: any) {
      console.error('Error fetching products:', err)
      setError(err.message || 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm(t('products:delete.message'))) {
      return
    }

    try {
      const apiUrl = getTenantApiUrl()
      const response = await fetch(`${apiUrl}/v1/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete product')
      }

      // Refresh the list
      fetchProducts()
    } catch (err: any) {
      console.error('Error deleting product:', err)
      setError(err.message || 'Failed to delete product')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'DRAFT':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'PAUSED':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'RETIRED':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('products:title')}</h1>
          <p className="text-gray-600 mt-2">
            {t('products:description')}
          </p>
        </div>
        
        <CanManageProducts>
          <button
            onClick={() => router.push('/app/products/create')}
            className="flex items-center justify-center w-10 h-10 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            title={t('products:create.submit')}
          >
            <Plus className="h-5 w-5" />
          </button>
        </CanManageProducts>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="text-red-600 mr-2 h-5 w-5" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder={t('products:list.filters.search')}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <CustomDropdown
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            placeholder={t('products:list.filters.status')}
            options={[
              { value: '', label: t('products:list.filters.status') },
              { value: 'DRAFT', label: t('products:create.form.status.options.DRAFT') },
              { value: 'ACTIVE', label: t('products:create.form.status.options.ACTIVE') },
              { value: 'PAUSED', label: t('products:create.form.status.options.PAUSED') },
              { value: 'RETIRED', label: t('products:create.form.status.options.RETIRED') }
            ]}
          />

          {/* Asset Class Filter */}
          <CustomDropdown
            value={filters.assetClass}
            onChange={(value) => setFilters(prev => ({ ...prev, assetClass: value }))}
            placeholder={t('products:list.filters.assetClass')}
            options={[
              { value: '', label: t('products:list.filters.assetClass') },
              { value: 'ART', label: t('products:create.form.assetClass.options.ART') },
              { value: 'EMT', label: t('products:create.form.assetClass.options.EMT') },
              { value: 'OTHER', label: t('products:create.form.assetClass.options.OTHER') }
            ]}
          />

          {/* Reset Filters */}
          <button
            onClick={() => setFilters({ status: '', assetClass: '', search: '' })}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            {t('common:actions.reset')}
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('common:status.loading')}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('products:list.empty.title')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('products:list.empty.description')}
            </p>
            <CanManageProducts>
              <button
                onClick={() => router.push('/app/products/create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('products:list.empty.action')}
              </button>
            </CanManageProducts>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products:list.table.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products:list.table.assetClass')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products:list.table.targetMarkets')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products:list.table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products:list.table.assets')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products:list.table.created')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products:list.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.organization.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {t(`products:create.form.assetClass.options.${product.assetClass}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {product.targetMarkets.slice(0, 2).map((market) => (
                          <span
                            key={market}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {t(`products:create.form.targetMarkets.options.${market}`)}
                          </span>
                        ))}
                        {product.targetMarkets.length > 2 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            +{product.targetMarkets.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(product.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                          {t(`products:create.form.status.options.${product.status}`)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product._count?.assets || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(product.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/app/products/${product.id}`)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                          title={t('products:list.actions.view')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <CanManageProducts>
                          <button
                            onClick={() => router.push(`/app/products/${product.id}/edit`)}
                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                            title={t('products:list.actions.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                            title={t('products:list.actions.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </CanManageProducts>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {products.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {products.length} products
          </div>
          {/* Add pagination controls here if needed */}
        </div>
      )}
    </div>
  )
}
