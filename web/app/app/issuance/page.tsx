'use client'
import TokenIssuanceFlow from '../../components/TokenIssuanceFlow'

export default function IssuePage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Token Issuance</h1>
      <TokenIssuanceFlow />
    </div>
  )
}