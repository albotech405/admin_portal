import React from 'react'

interface BadgeProps {
  status: string
  children: React.ReactNode
}

const statusStyles: Record<string, string> = {
  // Document/verification statuses
  not_started: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-800',
  under_review: 'bg-brand-100 text-brand-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-red-100 text-red-800',
  // User statuses
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-slate-100 text-slate-500',
  // SOS statuses
  resolved: 'bg-green-100 text-green-800',
  cancelled: 'bg-slate-100 text-slate-500',
  // Ride request statuses
  stale: 'bg-accent-100 text-accent-800',
  fresh: 'bg-green-100 text-green-800',
  // Generic statuses (used in code)
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-brand-100 text-brand-800',
  error: 'bg-red-100 text-red-800',
  neutral: 'bg-slate-100 text-slate-700',
  default: 'bg-slate-100 text-slate-700',
}

export const Badge: React.FC<BadgeProps> = ({ status, children }) => {
  const styles = statusStyles[status] ?? statusStyles.default
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  )
}
