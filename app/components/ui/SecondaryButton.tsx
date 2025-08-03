import React from 'react'

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export default function SecondaryButton({ 
  children, 
  className = '',
  ...props 
}: SecondaryButtonProps) {
  return (
    <button
      className={`bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-6 rounded-xl border-2 border-gray-200 shadow-md transform transition-all duration-200 hover:scale-105 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}