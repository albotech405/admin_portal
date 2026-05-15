import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth, AdminRole } from '../context/AuthContext'

type NavItem = {
  label: string
  to: string
  description: string
  requiredRole?: AdminRole | AdminRole[]
}

const navSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Live Operations',
    items: [
      { label: 'Dashboard', to: '/', description: 'Launch readiness, live metrics, and blockers' },
      { label: 'Rides', to: '/rides', description: 'Trip browser and active ride monitoring' },
      { label: 'Safety', to: '/safety', description: 'SOS queue, cancellations, and intervention rules' },
      { label: 'Cancellations', to: '/cancellations', description: 'Reason code analytics, safety flags, repeat detection' },
      { label: 'Disputes', to: '/disputes', description: 'Disputed trips queue with refund/charge/dismiss actions' },
    ],
  },
  {
    title: 'Users',
    items: [
      { label: 'Customers', to: '/customers', description: 'Lookup, profile tabs, and support actions' },
      { label: 'Drivers', to: '/drivers', description: 'KYC queue, category review, and suspension tools' },
      { label: 'Support', to: '/support', description: 'Tickets, FAQ, macros, and durable user messages', requiredRole: 'support' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Payments', to: '/payments', description: 'Top-up approvals and proof verification', requiredRole: 'finance' },
      { label: 'Finance', to: '/finance', description: 'Pricing, wallets, payouts, and reconciliation', requiredRole: 'finance' },
      { label: 'Pricing', to: '/pricing', description: 'Base fare, per-km, per-min rates per category', requiredRole: 'finance' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'System', to: '/system', description: 'Access control, feature flags, zones, and integrations' },
      { label: 'Audit', to: '/audit', description: 'Audit trail, privacy, and compliance reporting' },
      { label: 'Notifications', to: '/notifications', description: 'Broadcast push and message composer', requiredRole: 'operations' },
      { label: 'Admin Users', to: '/admin-users', description: 'Manage admin accounts and roles', requiredRole: 'super_admin' },
    ],
  },
]

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  operations: 'bg-blue-100 text-blue-700',
  finance: 'bg-green-100 text-green-700',
  support: 'bg-yellow-100 text-yellow-700',
  readonly: 'bg-brand-100 text-brand-600',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  operations: 'Operations',
  finance: 'Finance',
  support: 'Support',
  readonly: 'Read Only',
}

export const AdminLayout: React.FC = () => {
  const { user, logout, canAccess, sessionExpiresAt } = useAuth()

  const minutesLeft = sessionExpiresAt
    ? Math.max(0, Math.round((sessionExpiresAt - Date.now()) / 60000))
    : null

  return (
    <div className="min-h-screen bg-brand-50 text-brand-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-brand-800 bg-brand-950 text-white lg:block">
          <div className="border-b border-brand-800 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-400">AlboTaxi</p>
            <h1 className="mt-3 text-2xl font-bold text-white">Admin Console</h1>
            <p className="mt-2 text-sm text-brand-300">Operations, safety, finance, and compliance.</p>
          </div>

          <nav className="space-y-8 px-4 py-6">
            {navSections.map(section => (
              <div key={section.title}>
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
                  {section.title}
                </p>
                <div className="mt-3 space-y-1">
                  {section.items.map(item => {
                    const visible = !item.requiredRole || canAccess(item.requiredRole)
                    if (!visible) return null
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                          [
                            'block rounded-xl px-3 py-3 transition-all duration-200',
                            isActive
                              ? 'bg-brand-800 text-white shadow-sm'
                              : 'text-brand-300 hover:bg-brand-900/50 hover:text-brand-100',
                          ].join(' ')
                        }
                      >
                        <p className="font-semibold">{item.label}</p>
                        <p className="mt-0.5 text-xs opacity-60">{item.description}</p>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User info + logout at bottom of sidebar */}
          {user && (
            <div className="border-t border-brand-800 px-4 py-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                  {(user.full_name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {user.full_name || user.email}
                  </p>
                  <p className="truncate text-xs text-brand-400">{user.email}</p>
                </div>
              </div>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.admin_role] ?? ROLE_COLORS.readonly}`}>
                {ROLE_LABELS[user.admin_role] ?? user.admin_role}
              </span>
              {minutesLeft !== null && minutesLeft <= 5 && (
                <p className="mt-1 text-xs text-red-400">Session expires in {minutesLeft}m</p>
              )}
              <button
                onClick={() => logout()}
                className="mt-3 w-full rounded-lg border border-brand-700 px-3 py-1.5 text-xs font-medium text-brand-300 transition-colors hover:border-red-600 hover:text-red-400"
              >
                Sign out
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-500">
                  DRC Operations
                </p>
                <p className="mt-1 text-sm font-medium text-brand-700">
                  English / Français · CDF-first · mobile-money aware
                </p>
              </div>
              {user && (
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLORS[user.admin_role] ?? ROLE_COLORS.readonly}`}>
                    {ROLE_LABELS[user.admin_role] ?? user.admin_role}
                  </span>
                  <span className="text-sm text-brand-600 hidden sm:inline">{user.full_name || user.email}</span>
                  <button
                    onClick={() => logout()}
                    className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-500 transition-colors hover:border-red-300 hover:text-red-600"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
