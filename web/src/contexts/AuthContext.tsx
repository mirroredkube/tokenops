'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, getCurrentUser, loginWithGoogle, logout } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async () => {
    await loginWithGoogle()
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout: handleLogout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
