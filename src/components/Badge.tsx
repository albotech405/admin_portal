import React from 'react'

interface BadgeProps {
  status:
    | 'not_started'
    | 'pending'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'suspended'
  children: React.ReactNode
}

const statusStyles = {
  not_started: 'bg-slate-100 text-slate-700',
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
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
