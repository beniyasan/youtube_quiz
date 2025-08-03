import React from 'react'

interface GradientLayoutProps {
  children: React.ReactNode
  className?: string
}

export default function GradientLayout({ children, className = '' }: GradientLayoutProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800 ${className}`}>
      {children}
    </div>
  )
}