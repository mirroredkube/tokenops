// app/layout.tsx
import './styles/globals.css'
import Providers from '@/providers'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

export const metadata = {
  title: 'Regula',
  description: 'Compliance-grade tokenization, delivered as an API.',
  icons: {
    // Safari & general fallbacks
    icon: [
      { url: '/brand/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/brand/apple-touch-icon.png',
    other: [
      { rel: 'mask-icon', url: '/brand/safari-pinned-tab.svg', color: '#10B981' },
    ],
  },
  themeColor: '#10B981', // optional
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans min-h-screen bg-neutral-50 text-neutral-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
