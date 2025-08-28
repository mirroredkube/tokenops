'use client'

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compliance</h1>
        <p className="text-gray-600 mt-2">
          Manage compliance records and verification workflow.
        </p>
      </div>

      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
        <div className="max-w-md mx-auto">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming in Phase 2</h2>
          <p className="text-gray-600 mb-4">
            Compliance management will be available in the next phase. You'll be able to create, 
            list, and verify compliance records for your assets.
          </p>
          <div className="text-sm text-gray-500">
            <p>• Create compliance records</p>
            <p>• List and filter records</p>
            <p>• Verify compliance (auditor/regulator)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Placeholder icon component
function Shield({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}
