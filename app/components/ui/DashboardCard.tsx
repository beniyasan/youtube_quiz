import React from 'react'

interface DashboardCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export default function DashboardCard({ 
  children, 
  className = '', 
  hover = false 
}: DashboardCardProps) {
  const hoverClasses = hover 
    ? 'transition-all duration-200 hover:shadow-xl hover:scale-105' 
    : ''
  
  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl ${hoverClasses} ${className}`}>
      {children}
    </div>
  )
}