'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface LanguageContextType {
  currentLanguage: string
  setLanguage: (language: string) => void
  availableLanguages: { value: string; label: string }[]
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const [currentLanguage, setCurrentLanguage] = useState('en')

  const availableLanguages = [
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' }
  ]

  useEffect(() => {
    // Get language from localStorage or default to 'en'
    const savedLanguage = localStorage.getItem('i18nextLng') || 'en'
    setCurrentLanguage(savedLanguage)
    i18n.changeLanguage(savedLanguage)
  }, [i18n])

  const setLanguage = (language: string) => {
    setCurrentLanguage(language)
    i18n.changeLanguage(language)
    localStorage.setItem('i18nextLng', language)
  }

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
