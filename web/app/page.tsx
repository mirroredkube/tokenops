import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">TokenOps</h1>
      <p className="mt-2 text-neutral-600">B2B dashboard for token operations — ledger‑agnostic.</p>
      <div className="mt-6">
        <Link href="/app/dashboard" className="rounded-lg bg-black px-4 py-2 text-white">Open Dashboard</Link>
      </div>
    </main>
  )
}