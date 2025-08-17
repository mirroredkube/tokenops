// app/layout.tsx
import './styles/globals.css'   
import Providers from '@/providers'  // we'll set this alias below

export const metadata = { title: 'TokenOps', description: 'Ledger-agnostic Token Ops' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
