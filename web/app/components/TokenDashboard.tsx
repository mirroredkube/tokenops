'use client'
import { useState, useEffect } from 'react'
import LedgerLogo from './LedgerLogo'
import { TokenIcon, IssuanceIcon } from './FancyStatIcons'
import { api } from '@/lib/api'

interface TokenStats {
  totalTokens: number
  totalIssuances: number
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
        // Fetch assets and issuances from new v1 endpoints
        const [assetsResponse, issuancesResponse] = await Promise.all([
          api.GET('/v1/assets' as any, { params: { query: { limit: '50', offset: '0' } } }),
          api.GET('/v1/issuances' as any, { params: { query: { limit: '50', offset: '0' } } })
        ])

        const assets = assetsResponse.data?.assets || assetsResponse.data?.items || []
        const issuances = issuancesResponse.data?.items || []

        setStats({
          totalTokens: assets.length,
          totalIssuances: issuances.length,
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
          totalTokens: 0,
          totalIssuances: 0,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Tokens */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <TokenIcon size="md" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Tokens</p>
              <p className="text-2xl font-semibold">{stats.totalTokens}</p>
            </div>
          </div>
        </div>

        {/* Total Issuances */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <IssuanceIcon size="md" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Issuances</p>
              <p className="text-2xl font-semibold">{stats.totalIssuances}</p>
            </div>
          </div>
        </div>

        {/* Active Ledger */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <LedgerLogo type="XRPL" size="md" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active Ledger</p>
              <p className="text-2xl font-semibold">XRPL</p>
            </div>
          </div>
        </div>
      </div>

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
