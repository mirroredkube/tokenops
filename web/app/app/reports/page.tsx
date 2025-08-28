'use client'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-gray-600 mt-2">
          View and export asset issuances and compliance reports.
        </p>
      </div>

      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
        <div className="max-w-md mx-auto">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming in Phase 3</h2>
          <p className="text-gray-600 mb-4">
            Reports and analytics will be available in Phase 3. You'll be able to view 
            asset issuances, export data, and generate compliance reports.
          </p>
          <div className="text-sm text-gray-500">
            <p>• Asset issuance reports</p>
            <p>• Compliance audit trails</p>
            <p>• Export to CSV/JSON</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Placeholder icon component
function BarChart3({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
