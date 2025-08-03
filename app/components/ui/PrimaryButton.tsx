import React from 'react'

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  loading?: boolean
}

export default function PrimaryButton({ 
  children, 
  loading = false,
  className = '',
  disabled,
  ...props 
}: PrimaryButtonProps) {
  return (
    <button
      className={`bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:transform-none ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          処理中...
        </div>
      ) : children}
    </button>
  )
}