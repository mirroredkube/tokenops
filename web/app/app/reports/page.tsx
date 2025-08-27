'use client'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-gray-600 mt-2">
          Generate comprehensive audit reports and export compliance data.
        </p>
      </div>

      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-yellow-800">Coming Soon</h3>
            <p className="text-yellow-700 mt-1">
              Comprehensive audit and reporting functionality will be available in the next update. 
              This will include CSV/JSON exports, compliance reports, and regulatory audit trails.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Token Issuance Reports</h3>
          <p className="text-gray-600 text-sm mb-4">
            Export detailed reports of all token issuances with compliance metadata.
          </p>
          <div className="text-xs text-gray-500">
            • CSV/JSON export formats<br/>
            • Filter by date range<br/>
            • Include compliance data<br/>
            • Transaction hashes
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Compliance Audit Trail</h3>
          <p className="text-gray-600 text-sm mb-4">
            Generate regulatory compliance reports for MiCA and other frameworks.
          </p>
          <div className="text-xs text-gray-500">
            • MiCA compliance status<br/>
            • KYC/AML tracking<br/>
            • Jurisdiction reports<br/>
            • Audit-ready format
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Trustline Management</h3>
          <p className="text-gray-600 text-sm mb-4">
            Track and report on trustline creation and authorization status.
          </p>
          <div className="text-xs text-gray-500">
            • Trustline status reports<br/>
            • Authorization tracking<br/>
            • Limit utilization<br/>
            • Risk assessment
          </div>
        </div>
      </div>
    </div>
  )
}
