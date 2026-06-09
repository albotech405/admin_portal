import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-6 xl:p-7 ${className}`}
    >
      {children}
    </div>
  )
}
