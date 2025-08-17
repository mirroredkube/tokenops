// app/layout.tsx
import './styles/globals.css'
import Providers from '@/providers'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

export const metadata = { title: 'TokenOps', description: 'Ledger-agnostic Token Ops' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans min-h-screen bg-neutral-50 text-neutral-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
