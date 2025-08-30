'use client'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface CustomDropdownProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  required?: boolean
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  required = false
}: CustomDropdownProps) {
  const { t } = useTranslation(['common'])
  const defaultPlaceholder = t('select', 'Select an option')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`relative z-10 ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 pr-10 text-sm bg-white border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200 hover:border-gray-400 ${
          selectedOption ? 'text-gray-900' : 'text-gray-500'
        }`}
        
      >
        {selectedOption ? selectedOption.label : (placeholder || defaultPlaceholder)}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option.value)}
              className={`w-full px-4 py-3 text-sm text-left hover:bg-emerald-50 transition-colors duration-150 ${
                option.value === value 
                  ? 'bg-emerald-50 text-emerald-700 font-medium' 
                  : 'text-gray-900'
              } ${
                option.value === '' ? 'border-b border-gray-200' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
