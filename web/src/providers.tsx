'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState, useEffect } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TenantProvider } from '@/contexts/TenantContext'
import './lib/i18n' // Initialize i18n

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  const [isI18nReady, setIsI18nReady] = useState(false)

  useEffect(() => {
    // Ensure i18n is initialized before rendering
    setIsI18nReady(true)
  }, [])

  if (!isI18nReady) {
    return null // or a loading spinner
  }

  return (
    <QueryClientProvider client={client}>
      <TenantProvider>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </TenantProvider>
    </QueryClientProvider>
  )
}