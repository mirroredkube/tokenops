'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

export default function LanguageSwitcher() {
  const { currentLanguage, setLanguage } = useLanguage()
  const { t } = useTranslation(['common'])
  const [isOpen, setIsOpen] = useState(false)

  const languages = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'de', label: 'DE', name: 'Deutsch' }
  ]

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition-colors"
        aria-label={`Current language: ${currentLang.name}`}
      >
        <span className="font-semibold">{currentLang.label}</span>
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[80px]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                  currentLanguage === lang.code ? 'bg-gray-50 text-gray-900 font-semibold' : 'text-gray-700'
                }`}
              >
                <span className="font-medium">{lang.label}</span>
                {currentLanguage === lang.code && (
                  <span className="text-emerald-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
