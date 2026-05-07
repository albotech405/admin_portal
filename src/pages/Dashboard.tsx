import React, { useState, useEffect } from 'react'
import { Card, Button } from '../components'
import { supabaseService, DashboardMetrics } from '../services/supabaseService'
import { useNavigate } from 'react-router-dom'

const launchMinimum = [
  {
    title: 'KYC queue and approve or reject',
    route: '/drivers',
    why: 'Ops cannot activate drivers at scale without a reviewer workspace.',
  },
  {
    title: 'Driver suspend or unsuspend',
    route: '/drivers',
    why: 'Unsafe or abusive drivers need an immediate off-switch.',
  },
  {
    title: 'Driver category grant and demotion',
    route: '/drivers',
    why: 'Premium and lady_driver only exist operationally if admins can assign them.',
  },
  {
    title: 'Pricing config view',
    route: '/finance',
    why: 'Even read-only visibility is required for fare disputes and finance support.',
  },
  {
    title: 'Trip detail and intervention',
    route: '/rides',
    why: 'Support needs a single place to inspect and intervene on active or disputed trips.',
  },
  {
    title: 'Support inbox and user lookup',
    route: '/support',
    why: 'Closed beta support breaks down without first-line ticket handling.',
  },
]

const dependencyBlockers = [
  {
    title: 'Durable notifications feed',
    status: 'Backend-gated',
    detail:
      'Admin-to-user composers are spec-defined, but the backend still needs to write notification rows.',
  },
  {
    title: 'Delete-account workflow',
    status: 'Backend-gated',
    detail:
      'The delete endpoint still returns HTTP 500, so support should not manually scrub records.',
  },
  {
    title: 'Fare time-band detail',
    status: 'Backend-gated',
    detail:
      'Granular time_band remains unavailable, so finance can only reason from current pricing inputs.',
  },
  {
    title: 'Asymmetric dispatch analytics',
    status: 'Backend-gated',
    detail:
      'Supply metrics must count allowed drivers by request category once backend dispatch matches the new rule.',
  },
]

const workstreams = [
  {
    title: 'Live Operations',
    route: '/rides',
    description: 'Trips, interventions, cancellations, and marketplace visibility.',
  },
  {
    title: 'Driver Operations',
    route: '/drivers',
    description: 'KYC, documents, categories, wallet state, and suspension handling.',
  },
  {
    title: 'Customer Operations',
    route: '/customers',
    description: 'Profile tabs, support context, refunds, and account controls.',
  },
  {
    title: 'Support & Messaging',
    route: '/support',
    description: 'Ticket inbox, FAQ, macros, and durable user-facing admin messages.',
  },
  {
    title: 'Finance & Pricing',
    route: '/finance',
    description: 'Transactions, pricing controls, payouts, reconciliation, and exchange rates.',
  },
  {
    title: 'Safety & SOS',
    route: '/safety',
    description: 'SOS incidents, safety analytics, and cancellation-derived safety review.',
  },
]

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadMetrics()
    // Poll for updates every 30 seconds
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadMetrics = async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getDashboardMetrics()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError('Failed to load dashboard metrics')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">
          Launch Readiness
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-950">AlboTaxi Admin Operations</h1>
        <p className="mt-3 max-w-4xl text-slate-600">
          This home screen turns the spec into a working operator console: live metrics where the
          backend exists, and clearly marked control surfaces where the UI now defines the required
          behavior but backend work still gates full execution.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-96">
          <p className="text-slate-500 text-lg">Loading dashboard...</p>
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="bg-slate-950 text-white">
              <p className="text-sm text-slate-300">Active rides</p>
              <p className="mt-3 text-4xl font-bold">{metrics.active_rides_count}</p>
              <p className="mt-2 text-sm text-slate-300">In progress or driver en route</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Drivers online</p>
              <p className="mt-3 text-4xl font-bold text-emerald-600">
                {metrics.active_drivers_count}
              </p>
              <p className="mt-2 text-sm text-slate-500">Approved drivers currently online</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Pending KYC reviews</p>
              <p className="mt-3 text-4xl font-bold text-amber-600">
                {metrics.pending_drivers_count}
              </p>
              <Button
                variant="warning"
                size="sm"
                className="mt-4 w-full"
                onClick={() => navigate('/drivers')}
              >
                Open KYC queue
              </Button>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Pending top-ups</p>
              <p className="mt-3 text-4xl font-bold text-red-600">
                {metrics.pending_payments_count}
              </p>
              <Button
                variant="danger"
                size="sm"
                className="mt-4 w-full"
                onClick={() => navigate('/payments')}
              >
                Review proofs
              </Button>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    Minimum closed-beta operating surface
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    These are the admin capabilities that gate a controlled launch.
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
                  Dashboard scope expanded
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {launchMinimum.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => navigate(item.route)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.why}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        Open
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-slate-900 text-white">
              <h2 className="text-xl font-semibold">Launch blockers outside this UI</h2>
              <div className="mt-5 space-y-3 text-sm text-blue-50">
                <div className="rounded-2xl bg-white/10 p-4">
                  Frontend still needs SuspendedPage wiring, driver-rates-customer, and cancellation
                  reason flows.
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  Backend still has SOS P0 defects, delete-account 500, notifications-feed writes,
                  time-band support, and dispatch analytics changes.
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  Admin login remains separate from mobile auth and must enforce 2FA on every role.
                </div>
              </div>
            </Card>
          </div>

          {(metrics.pending_payments_count > 0 ||
            metrics.pending_drivers_count > 0) && (
            <Card className="border-l-4 border-l-orange-500 bg-orange-50">
              <h2 className="text-lg font-semibold text-orange-900 mb-3">
                Immediate action required
              </h2>
              <ul className="space-y-2 text-sm text-orange-800">
                {metrics.pending_payments_count > 0 && (
                  <li>
                    {metrics.pending_payments_count} payment request
                    {metrics.pending_payments_count > 1 ? 's' : ''} awaiting
                    approval
                  </li>
                )}
                {metrics.pending_drivers_count > 0 && (
                  <li>
                    {metrics.pending_drivers_count} driver application
                    {metrics.pending_drivers_count > 1 ? 's' : ''} awaiting
                    review
                  </li>
                )}
              </ul>
            </Card>
          )}

          <Card>
            <h2 className="text-xl font-semibold text-slate-950">Admin workstreams</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workstreams.map((item) => (
                <button
                  key={item.title}
                  onClick={() => navigate(item.route)}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <p className="text-lg font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-slate-950">Platform dependencies</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {dependencyBlockers.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="text-right text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      ) : null}
    </div>
  )
}
