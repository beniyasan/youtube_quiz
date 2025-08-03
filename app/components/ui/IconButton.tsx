import React from 'react'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string | React.ReactNode
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export default function IconButton({ 
  icon,
  children, 
  variant = 'primary',
  className = '',
  ...props 
}: IconButtonProps) {
  const baseClasses = "font-semibold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 flex items-center gap-3"
  const variantClasses = variant === 'primary' 
    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
    : "bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200"
  
  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      <span className="text-xl">{icon}</span>
      {children}
    </button>
  )
}