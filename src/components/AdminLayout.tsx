import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoginPage } from '../pages/LoginPage'

type NavItem = {
  label: string
  to: string
  description: string
}

const navSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Live Operations',
    items: [
      {
        label: 'Dashboard',
        to: '/',
        description: 'Launch readiness, live metrics, and blockers',
      },
      {
        label: 'Operations',
        to: '/operations',
        description: 'Driver approval, payments, add drivers & customers',
      },
      {
        label: 'Rides',
        to: '/rides',
        description: 'Trip browser and active ride monitoring',
      },
      {
        label: 'Safety',
        to: '/safety',
        description: 'SOS queue, cancellations, and intervention rules',
      },
    ],
  },
  {
    title: 'Users',
    items: [
      {
        label: 'Customers',
        to: '/customers',
        description: 'Lookup, profile tabs, and support actions',
      },
      {
        label: 'Drivers',
        to: '/drivers',
        description: 'KYC queue, category review, and suspension tools',
      },
      {
        label: 'Support',
        to: '/support',
        description: 'Tickets and user messages',
      },
      {
        label: 'Notifications',
        to: '/notifications',
        description: 'Admin alerts and outbound lifecycle messages',
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        label: 'Payments',
        to: '/payments',
        description: 'Top-up approvals and proof verification',
      },
      {
        label: 'Finance',
        to: '/finance',
        description: 'Wallets, payouts, and reconciliation',
      },
      {
        label: 'Pricing',
        to: '/pricing',
        description: 'Fare configuration and pricing rules',
      },
      {
        label: 'Disputes',
        to: '/disputes',
        description: 'Ride disputes and refund management',
      },
    ],
  },
  {
    title: 'Platform',
    items: [
      {
        label: 'System',
        to: '/system',
        description: 'Feature flags and app configuration',
      },
      {
        label: 'Audit',
        to: '/audit',
        description: 'Audit trail, privacy, and compliance',
      },
      {
        label: 'Admin Users',
        to: '/admin-users',
        description: 'Admin accounts, roles, and sessions',
      },
      {
        label: 'Cancellations',
        to: '/cancellations',
        description: 'Cancellation trends and analytics',
      },
    ],
  },
]

export const AdminLayout: React.FC = () => {
  const { isLoading, isAuthenticated, logout, user } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="relative">
        <LoginPage onLogin={() => {}} />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 shrink-0 border-r border-blue-950/30 bg-[linear-gradient(180deg,#0f172a_0%,#10213d_52%,#0f172a_100%)] text-white lg:block">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <img src="/albo_logo.jpeg" alt="Albo Taxi" className="h-10 w-10 rounded-xl object-cover" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">Admin Portal</p>
                <h1 className="text-xl font-bold">Albo Taxi</h1>
              </div>
            </div>
          </div>

          <nav className="space-y-8 px-4 py-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {section.title}
                </p>
                <div className="mt-3 space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        [
                          'block rounded-2xl px-3 py-3 transition-all',
                          isActive
                            ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-slate-950 shadow-[0_16px_30px_-18px_rgba(56,189,248,0.9)]'
                            : 'text-slate-200 hover:bg-white/5 hover:text-white',
                        ].join(' ')
                      }
                    >
                      <p className="font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs text-inherit/70">{item.description}</p>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <p className="text-lg font-semibold text-slate-900">Albo Taxi Admin</p>
              <div className="flex items-center gap-3">
                {user && (
                  <span className="hidden text-sm text-slate-500 sm:block">{user.email}</span>
                )}
                <button
                  onClick={() => logout()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                >
                  Sign out
                </button>
              </div>
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