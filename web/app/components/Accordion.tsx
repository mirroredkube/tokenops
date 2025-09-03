'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  step?: number
}

export default function Accordion({ title, children, defaultOpen = false, step }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {step !== undefined && (
            <div className="w-6 h-6 bg-emerald-600 text-white text-xs font-semibold rounded-full flex items-center justify-center">
              {step}
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900">
            {step !== undefined ? `Step ${step}: ${title}` : title}
          </h3>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>
      
      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  )
}
