'use client'

import { ReactNode } from 'react'
import { Eye, ExternalLink, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface QueueColumn {
  key: string
  label: string
  width?: string
  render: (item: any) => ReactNode
}

export interface QueueTableProps {
  title: string
  items: any[]
  columns: QueueColumn[]
  emptyMessage: string
  viewAllLink?: string
  loading?: boolean
  maxItems?: number
  showViewAll?: boolean
  emptyStateCTA?: {
    text: string
    action: () => void
  }
}

export default function QueueTable({
  title,
  items,
  columns,
  emptyMessage,
  viewAllLink,
  loading = false,
  maxItems = 5,
  showViewAll = true,
  emptyStateCTA
}: QueueTableProps) {
  const router = useRouter()
  
  const displayItems = items.slice(0, maxItems)
  const hasMoreItems = items.length > maxItems

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-48"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {showViewAll && viewAllLink && (
            <button
              onClick={() => router.push(viewAllLink)}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          )}
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p className="mb-4">{emptyMessage}</p>
          {emptyStateCTA && (
            <button
              onClick={emptyStateCTA.action}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {emptyStateCTA.text}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <colgroup>
              {columns.map((column, index) => (
                <col key={column.key} className={column.width || 'w-auto'} />
              ))}
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayItems.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMoreItems && showViewAll && viewAllLink && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => router.push(viewAllLink)}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            View {items.length - maxItems} more {items.length - maxItems === 1 ? 'item' : 'items'}
          </button>
        </div>
      )}
    </div>
  )
}
