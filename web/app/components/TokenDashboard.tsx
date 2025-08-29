'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

interface TokenStats {
  recentTransactions: Array<{
    id: string
    currencyCode: string
    amount: string
    destination: string
    txId: string
    createdAt: string
  }>
}

export default function TokenDashboard() {
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch issuances from new v1 endpoints
        const issuancesResponse = await api.GET('/v1/issuances' as any, { params: { query: { limit: '50', offset: '0' } } })

        const issuances = issuancesResponse.data?.items || []

        setStats({
          recentTransactions: issuances.slice(0, 10).map((issuance: any) => ({
            id: issuance.id,
            currencyCode: issuance.assetRef?.split(':').pop()?.split('.').pop() || 'Unknown',
            amount: issuance.amount,
            destination: issuance.to,
            txId: issuance.txId || 'Pending',
            createdAt: issuance.createdAt
          }))
        })
      } catch (err) {
        console.error('Error fetching token data:', err)
        setStats({
          recentTransactions: []
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Recent Transactions */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Token Issuances</h3>
        </div>

        {stats.recentTransactions.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No issuances yet. Once you issue a token, it will show up here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tx.currencyCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {tx.destination?.substring(0, 8) || 'Unknown'}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <code className="text-xs">{tx.txId.substring(0, 12)}...</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
