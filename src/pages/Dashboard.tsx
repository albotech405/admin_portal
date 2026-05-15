import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, LiveMap } from '../components'
import {
  supabaseService,
  DashboardMetrics,
  OfferUpdateMetrics,
  DriverLocation,
} from '../services/supabaseService'
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
  const [offerMetrics, setOfferMetrics] = useState<OfferUpdateMetrics | null>(null)
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMapLoading, setIsMapLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadMetrics()
    loadOfferMetrics()
    loadDriverLocations()
    const interval = setInterval(() => {
      loadMetrics()
      loadOfferMetrics()
      loadDriverLocations()
    }, 30000)
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

  const loadOfferMetrics = async () => {
    try {
      const data = await supabaseService.getOfferUpdateMetrics()
      setOfferMetrics(data)
    } catch (err) {
      console.error('Failed to load offer update metrics:', err)
    }
  }

  const loadDriverLocations = useCallback(async () => {
    try {
      setIsMapLoading(true)
      const locations = await supabaseService.getDriverLocations(true)
      setDriverLocations(locations)
    } catch (err) {
      console.error('Failed to load driver locations:', err)
    } finally {
      setIsMapLoading(false)
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-600">
          Launch Readiness
        </p>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">AlboTaxi Admin Operations</h1>
        <p className="mt-2 max-w-4xl text-sm text-brand-500">
          This home screen turns the spec into a working operator console: live metrics where the
          backend exists, and clearly marked control surfaces where the UI now defines the required
          behavior but backend work still gates full execution.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-brand-400">Loading dashboard...</p>
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="bg-gradient-to-br from-brand-700 to-brand-950 text-white">
              <p className="text-sm font-medium text-brand-200">Active rides</p>
              <p className="mt-2 text-4xl font-bold text-white">{metrics.active_rides_count}</p>
              <p className="mt-2 text-xs text-brand-300">In progress or driver en route</p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-brand-500">Drivers online</p>
              <p className="mt-2 text-4xl font-bold text-green-600">
                {metrics.active_drivers_count}
              </p>
              <p className="mt-2 text-xs text-brand-400">Approved drivers currently online</p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-brand-500">Pending KYC reviews</p>
              <p className="mt-2 text-4xl font-bold text-amber-600">
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
              <p className="text-sm font-medium text-brand-500">Pending top-ups</p>
              <p className="mt-2 text-4xl font-bold text-red-600">
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

          {/* Live Map */}
          <Card>
            <LiveMap
              drivers={driverLocations}
              isLoading={isMapLoading}
              onRefresh={loadDriverLocations}
              lastUpdated={new Date().toISOString()}
            />
          </Card>

          {/* Offer Update Metrics Card */}
          {offerMetrics && (
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-brand-900">
                  Driver Offer Update Rate
                </h2>
                <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
                  {offerMetrics.update_rate != null ? `${(offerMetrics.update_rate * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-center">
                  <p className="text-2xl font-bold text-brand-900">{offerMetrics.total_offers_sent}</p>
                  <p className="mt-1 text-xs text-brand-500">Total Offers Sent</p>
                </div>
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{offerMetrics.total_updates_received}</p>
                  <p className="mt-1 text-xs text-brand-500">Updates Received</p>
                </div>
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-center">
                  <p className="text-2xl font-bold text-brand-600">
                    {offerMetrics.update_rate != null ? `${(offerMetrics.update_rate * 100).toFixed(1)}%` : 'N/A'}
                  </p>
                  <p className="mt-1 text-xs text-brand-500">Update Rate</p>
                </div>
              </div>
              {offerMetrics.driver_breakdown && offerMetrics.driver_breakdown.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-3 text-sm font-medium text-brand-700">Top Drivers by Update Rate</h3>
                  <div className="space-y-2">
                    {offerMetrics.driver_breakdown.slice(0, 5).map((driver) => (
                      <div key={driver.driver_id} className="flex items-center justify-between rounded-xl bg-brand-50/50 px-4 py-2.5 text-sm">
                        <div>
                          <p className="font-medium text-brand-900">{driver.driver_name || driver.driver_id.slice(0, 8)}</p>
                          <p className="text-xs text-brand-400">{driver.driver_phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-brand-600">{(driver.update_rate * 100).toFixed(0)}%</p>
                          <p className="text-xs text-brand-400">{driver.updates_received}/{driver.offers_sent}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Launch Readiness + Blockers */}
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-brand-900">
                    Minimum closed-beta operating surface
                  </h2>
                  <p className="mt-1 text-sm text-brand-500">
                    These are the admin capabilities that gate a controlled launch.
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-accent-100 px-4 py-2 text-sm font-semibold text-accent-700">
                  Dashboard scope expanded
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {launchMinimum.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => navigate(item.route)}
                    className="group w-full rounded-xl border border-brand-100 bg-white px-4 py-4 text-left transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-brand-900 group-hover:text-brand-700">{item.title}</p>
                        <p className="mt-1 text-sm text-brand-500">{item.why}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-500">
                        Open →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-brand-600 to-brand-950 text-white">
              <h2 className="text-xl font-semibold">Launch blockers outside this UI</h2>
              <div className="mt-5 space-y-3 text-sm text-brand-100">
                <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                  Frontend still needs SuspendedPage wiring, driver-rates-customer, and cancellation
                  reason flows.
                </div>
                <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                  Backend still has SOS P0 defects, delete-account 500, notifications-feed writes,
                  time-band support, and dispatch analytics changes.
                </div>
                <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                  Admin login remains separate from mobile auth and must enforce 2FA on every role.
                </div>
              </div>
            </Card>
          </div>

          {/* Immediate Action Required */}
          {(metrics.pending_payments_count > 0 ||
            metrics.pending_drivers_count > 0) && (
            <Card className="border-l-4 border-l-accent-500 bg-accent-50">
              <h2 className="text-lg font-semibold text-accent-900 mb-3">
                Immediate action required
              </h2>
              <ul className="space-y-2 text-sm text-accent-800">
                {metrics.pending_payments_count > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                    {metrics.pending_payments_count} payment request
                    {metrics.pending_payments_count > 1 ? 's' : ''} awaiting approval
                  </li>
                )}
                {metrics.pending_drivers_count > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                    {metrics.pending_drivers_count} driver application
                    {metrics.pending_drivers_count > 1 ? 's' : ''} awaiting review
                  </li>
                )}
              </ul>
            </Card>
          )}

          {/* Admin Workstreams */}
          <Card>
            <h2 className="text-xl font-semibold text-brand-900">Admin workstreams</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workstreams.map((item) => (
                <button
                  key={item.title}
                  onClick={() => navigate(item.route)}
                  className="group rounded-xl border border-brand-100 bg-white p-5 text-left transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-sm"
                >
                  <p className="text-lg font-semibold text-brand-900 group-hover:text-brand-700">{item.title}</p>
                  <p className="mt-2 text-sm text-brand-500">{item.description}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Platform Dependencies */}
          <Card>
            <h2 className="text-xl font-semibold text-brand-900">Platform dependencies</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {dependencyBlockers.map((item) => (
                <div key={item.title} className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-brand-900">{item.title}</p>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-brand-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Footer */}
          <div className="text-right text-xs text-brand-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      ) : null}
    </div>
  )
}
