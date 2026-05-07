import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

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
        description: 'Tickets, FAQ, macros, and durable user messages',
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
        description: 'Pricing, wallets, payouts, and reconciliation',
      },
    ],
  },
  {
    title: 'Platform',
    items: [
      {
        label: 'System',
        to: '/system',
        description: 'Access control, feature flags, zones, and integrations',
      },
      {
        label: 'Audit',
        to: '/audit',
        description: 'Audit trail, privacy, and compliance reporting',
      },
    ],
  },
]

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-slate-950 text-white lg:block">
          <div className="border-b border-slate-800 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">
              AlboTaxi
            </p>
            <h1 className="mt-3 text-2xl font-bold">Admin Console</h1>
            <p className="mt-2 text-sm text-slate-300">
              Operations, safety, finance, and compliance in one workspace.
            </p>
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
                          'block rounded-2xl px-3 py-3 transition-colors',
                          isActive
                            ? 'bg-white text-slate-950'
                            : 'text-slate-200 hover:bg-slate-900',
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
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  DRC Operations
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  English / Francais, CDF-first, mobile-money aware
                </p>
              </div>
              <div className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
                Admin spec v1 workspace
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