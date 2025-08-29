'use client'
import TokenIssuanceFlow from '../../../components/TokenIssuanceFlow'

export default function NewIssuancePage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">New Issuance</h1>
      <TokenIssuanceFlow />
    </div>
  )
}
