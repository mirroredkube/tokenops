import Link from 'next/link'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr]">
      <aside className="border-r bg-white p-4">
        <div className="mb-6 font-semibold">TokenOps</div>
        <nav className="space-y-2 text-sm">
          <Link href="/app/dashboard" className="block hover:underline">Dashboard</Link>
          <Link href="/app/trustlines" className="block hover:underline">Create Trust Line</Link>
          <Link href="/app/issuance" className="block hover:underline">Issue Token</Link>
          <Link href="/app/balances" className="block hover:underline">View Balances</Link>
          <a href={(process.env.NEXT_PUBLIC_API_URL ?? '') + '/docs'} target="_blank" className="block hover:underline">API Docs</a>
        </nav>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  )
}