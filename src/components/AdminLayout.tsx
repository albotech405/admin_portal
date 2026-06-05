import React, { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canAccessAdminPath } from '../lib/adminAccess'
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessAdminPath(user?.admin_role, item.to)),
    }))
    .filter((section) => section.items.length > 0)

  const closeMobileNav = () => setIsMobileNavOpen(false)

  if (!isAuthenticated) {
    return (
      <div className="relative">
        <LoginPage />
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
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={closeMobileNav} />
      )}
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
            {visibleSections.map((section) => (
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

        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 w-[86vw] max-w-sm border-r border-blue-950/30 bg-[linear-gradient(180deg,#0f172a_0%,#10213d_52%,#0f172a_100%)] text-white shadow-2xl transition-transform duration-300 lg:hidden',
            isMobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <img src="/albo_logo.jpeg" alt="Albo Taxi" className="h-11 w-11 rounded-2xl object-cover" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-200">Admin Portal</p>
                <h1 className="text-lg font-bold">Albo Taxi</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={closeMobileNav}
              className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
            >
              Close
            </button>
          </div>

          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-xs text-slate-300">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{user?.email ?? 'Admin user'}</p>
          </div>

          <nav className="h-[calc(100vh-9rem)] space-y-7 overflow-y-auto px-4 py-5">
            {visibleSections.map((section) => (
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
                      onClick={closeMobileNav}
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
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
                  aria-label="Open navigation"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Control Center</p>
                  <p className="text-lg font-semibold text-slate-900">Albo Taxi Admin</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {user && (
                  <div className="hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-2 text-right shadow-sm sm:block">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Session</p>
                    <span className="text-sm text-slate-600">{user.email}</span>
                  </div>
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

          <main className="relative flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_70%)]" />
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}