import React, { useState, useEffect } from 'react'
import { Card, Button } from '../components'
import { supabaseService, DashboardMetrics } from '../services/supabaseService'
import { useNavigate } from 'react-router-dom'
import { convertUsdToCdf, formatCdf } from '../lib/currency'

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
    description: 'Ticket inbox and user support.',
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
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadMetrics(true)
    loadExchangeRate()
    const interval = setInterval(() => loadMetrics(false), 30000)
    return () => clearInterval(interval)
  }, [])

  const loadExchangeRate = async () => {
    try {
      const data = await supabaseService.getExchangeRate()
      setExchangeRate(data.rate_cdf_per_usd)
    } catch (err) {
      console.error(err)
    }
  }

  const loadMetrics = async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await supabaseService.getFullDashboardMetrics()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics')
      console.error(err)
    } finally {
      if (showLoader) setIsLoading(false)
    }
  }

  const convertedGmvToday =
    metrics?.gmv_usd_today != null ? convertUsdToCdf(metrics.gmv_usd_today, exchangeRate) : null

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-sky-100 p-5 shadow-[0_24px_60px_-32px_rgba(37,99,235,0.45)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">
          Operations Overview
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Dashboard</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* SOS red alert banner */}
      {metrics && (metrics.sos_active_count ?? 0) > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-red-300 bg-red-600 px-5 py-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="animate-pulse text-2xl">🆘</span>
            <div>
              <p className="font-bold text-lg">{metrics.sos_active_count} active SOS incident{(metrics.sos_active_count ?? 0) > 1 ? 's' : ''}</p>
              <p className="text-sm text-red-100">Requires immediate response</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => navigate('/safety')}>View SOS Queue →</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-96">
          <p className="text-slate-500 text-lg">Loading dashboard...</p>
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Primary ops metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] text-white">
              <p className="text-sm text-blue-100">Active rides</p>
              <p className="mt-3 text-4xl font-bold">{metrics.active_rides_count}</p>
              <p className="mt-2 text-sm text-blue-100/85">In progress or driver en route</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Drivers online</p>
              <p className="mt-3 text-4xl font-bold text-emerald-600">{metrics.active_drivers_count}</p>
              <p className="mt-2 text-sm text-slate-500">Approved drivers currently online</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Pending KYC reviews</p>
              <p className="mt-3 text-4xl font-bold text-amber-600">{metrics.pending_drivers_count}</p>
              <Button variant="warning" size="sm" className="mt-4 w-full" onClick={() => navigate('/drivers')}>Open KYC queue</Button>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Pending top-ups</p>
              <p className="mt-3 text-4xl font-bold text-red-600">{metrics.pending_payments_count}</p>
              <Button variant="danger" size="sm" className="mt-4 w-full" onClick={() => navigate('/payments')}>Review proofs</Button>
            </Card>
          </div>

          {/* Today's revenue metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trips today</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{metrics.completed_trips_today ?? '—'}</p>
              <p className="mt-1 text-xs text-slate-400">Completed this calendar day (Kinshasa)</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">GMV today (CDF)</p>
              <p className="mt-2 text-3xl font-bold text-green-700">{metrics.gmv_cdf_today != null ? formatCdf(metrics.gmv_cdf_today) : '—'}</p>
              <p className="mt-1 text-xs text-slate-400">Gross merchandise value</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">GMV today (Converted CDF)</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{convertedGmvToday != null ? formatCdf(convertedGmvToday) : '—'}</p>
              <p className="mt-1 text-xs text-slate-400">Converted from the active exchange rate</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Commission today</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{metrics.commission_today != null ? formatCdf(metrics.commission_today) : '—'}</p>
              <p className="mt-1 text-xs text-slate-400">Platform fees earned</p>
            </Card>
          </div>

          {/* Support & Safety quick stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className={(metrics.open_tickets_count ?? 0) > 0 ? 'border-amber-200 bg-amber-50' : ''}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open Support Tickets</p>
                  <p className="mt-2 text-3xl font-bold text-amber-600">{metrics.open_tickets_count ?? '—'}</p>
                </div>
                <Button size="sm" variant="secondary" className="w-full sm:w-auto" onClick={() => navigate('/support')}>View queue →</Button>
              </div>
            </Card>
            <Card className={(metrics.sos_active_count ?? 0) > 0 ? 'border-red-200 bg-red-50' : ''}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active SOS Incidents</p>
                  <p className={`mt-2 text-3xl font-bold ${(metrics.sos_active_count ?? 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>{metrics.sos_active_count ?? '—'}</p>
                </div>
                <Button size="sm" className="w-full sm:w-auto" variant={((metrics.sos_active_count ?? 0) > 0) ? 'danger' : 'secondary'} onClick={() => navigate('/safety')}>View Safety →</Button>
              </div>
            </Card>
          </div>

          {/* Action-needed alert */}
          {(metrics.pending_payments_count > 0 || metrics.pending_drivers_count > 0 || (metrics.open_tickets_count ?? 0) > 0) && (
            <Card className="border-l-4 border-l-blue-500 bg-blue-50">
              <h2 className="mb-3 text-lg font-semibold text-blue-900">Immediate action required</h2>
              <ul className="space-y-2 text-sm text-blue-800">
                {metrics.pending_payments_count > 0 && <li>{metrics.pending_payments_count} payment request{metrics.pending_payments_count > 1 ? 's' : ''} awaiting approval</li>}
                {metrics.pending_drivers_count > 0 && <li>{metrics.pending_drivers_count} driver application{metrics.pending_drivers_count > 1 ? 's' : ''} awaiting review</li>}
                {(metrics.open_tickets_count ?? 0) > 0 && <li>{metrics.open_tickets_count} open support ticket{(metrics.open_tickets_count ?? 0) > 1 ? 's' : ''} in queue</li>}
              </ul>
            </Card>
          )}

          <Card>
            <h2 className="text-xl font-semibold text-slate-950">Admin workstreams</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workstreams.map((item) => (
                <button key={item.title} onClick={() => navigate(item.route)}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50">
                  <p className="text-lg font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </button>
              ))}
            </div>
          </Card>

          <div className="text-right text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      ) : null}
    </div>
  )
}
