'use client'

import React, { useState } from 'react'
import { X as XIcon, HelpCircle } from 'lucide-react'

interface InfoPopupProps {
  title: string
  children: React.ReactNode
  trigger?: React.ReactNode
}

export default function InfoPopup({ title, children, trigger }: InfoPopupProps) {
  const [isVisible, setIsVisible] = useState(false)

  const handleOpen = () => setIsVisible(true)
  const handleClose = () => setIsVisible(false)

  return (
    <>
      <div onClick={handleOpen} className="inline-block">
        {trigger || <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />}
      </div>

      {isVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
