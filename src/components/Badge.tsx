import React from 'react'

interface BadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  children: React.ReactNode
}

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-red-100 text-red-800',
}

export const Badge: React.FC<BadgeProps> = ({ status, children }) => {
  const styles = statusStyles[status]
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${styles}`}>
      {children}
    </span>
  )
}
