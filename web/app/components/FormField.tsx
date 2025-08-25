import React from 'react'

interface FormFieldProps {
  label: string
  children: React.ReactNode
  required?: boolean
  helperText?: string
  error?: string
}

export default function FormField({ 
  label, 
  children, 
  required = false, 
  helperText, 
  error 
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {helperText && (
        <p className="text-xs text-gray-500 mt-1">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}
