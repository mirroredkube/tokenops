'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, X } from 'lucide-react'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user && !loading) {
      // Redirect to dashboard if already logged in
      router.push('/app/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'organization_mismatch') {
      setErrorMessage('You tried to access an organization that you don\'t belong to. Please log in with the correct organization subdomain.')
    } else if (error === 'auth_failed') {
      setErrorMessage('Authentication failed. Please try logging in again.')
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Full-width Background Image with Gradient Overlay */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:%231e293b;stop-opacity:1" /><stop offset="70%" style="stop-color:%23f8fafc;stop-opacity:1" /><stop offset="100%" style="stop-color:%23ffffff;stop-opacity:1" /></linearGradient><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="%23ffffff" stroke-width="1" opacity="0.1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grad1)"/><rect width="100%" height="100%" fill="url(%23grid)"/><circle cx="200" cy="150" r="90" fill="%2310b981" opacity="0.15"/><circle cx="1000" cy="300" r="120" fill="%23ffffff" opacity="0.08"/><circle cx="800" cy="600" r="70" fill="%2310b981" opacity="0.12"/><path d="M 0 400 Q 300 200 600 400 T 1200 400" stroke="%2310b981" stroke-width="3" fill="none" opacity="0.2"/><path d="M 0 500 Q 400 300 800 500 T 1200 500" stroke="%23ffffff" stroke-width="2" fill="none" opacity="0.2"/></svg>')`
          }}
        />
        {/* Gradient overlay for seamless transition - stops before login form */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/80 lg:to-white/60"></div>
        
        {/* Floating elements - only on left side */}
        <div className="absolute inset-0 flex items-center justify-start pl-8 lg:pl-16">
          <div className="text-white text-center space-y-8 max-w-md mx-8">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold">Token Issuance</span>
              </div>
              <p className="text-lg opacity-90">Multi-ledger tokenization platform</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                  <span className="font-medium">Mica Aware</span>
                </div>
                <p className="opacity-80">Compliant with EU crypto regulations</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  <span className="font-medium">Enterprise Ready</span>
                </div>
                <p className="opacity-80">Production-grade security and scalability</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center p-8 ml-auto">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img
                src="/brand/logo.svg"
                width={32}
                height={32}
                alt="Regula logo"
                className="h-8 w-8"
              />
              <span className="text-2xl font-semibold">Regula</span>
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
              Welcome to Regula
            </h1>
            <p className="text-neutral-600">
              Sign in to access your tokenization dashboard
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div>
            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-700 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-500">
                By signing in, you agree to our{' '}
                <a href="/terms" className="text-slate-600 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-slate-600 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="/"
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
