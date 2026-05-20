import React, { useState, useEffect } from 'react'
import { Card, Button } from '../components'
import { supabaseService, DashboardMetrics } from '../services/supabaseService'
import { useNavigate } from 'react-router-dom'

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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadMetrics()
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
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-sky-100 p-8 shadow-[0_24px_60px_-32px_rgba(37,99,235,0.45)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">
          Operations Overview
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-950">Dashboard</h1>
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
            <Card className="bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] text-white">
              <p className="text-sm text-blue-100">Active rides</p>
              <p className="mt-3 text-4xl font-bold">{metrics.active_rides_count}</p>
              <p className="mt-2 text-sm text-blue-100/85">In progress or driver en route</p>
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

          {(metrics.pending_payments_count > 0 ||
            metrics.pending_drivers_count > 0) && (
            <Card className="border-l-4 border-l-blue-500 bg-blue-50">
              <h2 className="mb-3 text-lg font-semibold text-blue-900">
                Immediate action required
              </h2>
              <ul className="space-y-2 text-sm text-blue-800">
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

          <div className="text-right text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      ) : null}
    </div>
  )
}
