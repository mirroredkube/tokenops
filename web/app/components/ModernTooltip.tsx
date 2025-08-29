'use client'

import React, { useState } from 'react'

interface ModernTooltipProps {
  children: React.ReactNode
  content: string
}

export default function ModernTooltip({ children, content }: ModernTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const handleMouseEnter = () => {
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  return (
    <div className="relative inline-block w-full" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {isVisible && (
        <div
          className="absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: '50%',
            top: '-10px',
          }}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  )
}
