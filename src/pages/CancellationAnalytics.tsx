import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { Table } from '../components/Table'
import { supabaseService, CancellationAnalytics } from '../services/supabaseService'

const DAY_OPTIONS = [
  { label: '24h', value: 1 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
]

export const CancellationAnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<CancellationAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(7)

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await supabaseService.getCancellationAnalytics(days)
      setAnalytics(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load cancellation analytics')
    } finally {
      setIsLoading(false)
    }
  }, [days])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const reasonBreakdownColumns = [
    { key: 'reason_code', label: 'Reason Code' },
    { key: 'reason_text', label: 'Description' },
    { key: 'count', label: 'Total' },
    { key: 'cancelled_by_customer', label: 'By Customer' },
    { key: 'cancelled_by_driver', label: 'By Driver' },
  ]

  const reasonBreakdownData = (analytics?.reason_breakdown || []).map((r) => ({
    reason_code: (
      <code className="rounded bg-brand-100 px-2 py-0.5 text-xs font-mono font-semibold text-brand-700">
        {r.reason_code}
      </code>
    ),
    reason_text: r.reason_text || '—',
    count: (
      <span className="font-semibold text-brand-900">{r.count}</span>
    ),
    cancelled_by_customer: (
      <span className="text-brand-600">{r.cancelled_by_customer}</span>
    ),
    cancelled_by_driver: (
      <span className="text-brand-600">{r.cancelled_by_driver}</span>
    ),
  }))

  const safetyColumns = [
    { key: 'ride_id', label: 'Ride ID' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'driver_name', label: 'Driver' },
    { key: 'reason_text', label: 'Reason' },
    { key: 'cancelled_by', label: 'Cancelled By' },
    { key: 'cancelled_at', label: 'Time' },
  ]

  const safetyData = (analytics?.safety_concern_queue || []).map((s) => ({
    ride_id: (
      <code className="rounded bg-red-100 px-2 py-0.5 text-xs font-mono text-red-700">
        {s.ride_id.slice(0, 8)}...
      </code>
    ),
    customer_name: s.customer_name || s.customer_id.slice(0, 8) + '...',
    driver_name: s.driver_name || s.driver_id?.slice(0, 8) + '...' || '—',
    reason_text: s.reason_text || '—',
    cancelled_by: (
      <Badge status={s.cancelled_by === 'customer' ? 'warning' : 'info'}>
        {s.cancelled_by || '—'}
      </Badge>
    ),
    cancelled_at: s.cancelled_at
      ? new Date(s.cancelled_at).toLocaleString()
      : '—',
  }))

  const repeatColumns = [
    { key: 'user_type', label: 'Type' },
    { key: 'full_name', label: 'Name' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'cancellation_count', label: 'Cancellations (24h)' },
    { key: 'reason_codes', label: 'Reason Codes' },
    { key: 'latest_cancellation_at', label: 'Latest' },
  ]

  const repeatData = (analytics?.repeat_cancellations || []).map((r) => ({
    user_type: (
      <Badge status={r.user_type === 'driver' ? 'info' : 'warning'}>
        {r.user_type}
      </Badge>
    ),
    full_name: r.full_name || r.user_id.slice(0, 8) + '...',
    phone_number: r.phone_number || '—',
    cancellation_count: (
      <span className="font-bold text-red-600">{r.cancellation_count}</span>
    ),
    reason_codes: (
      <div className="flex flex-wrap gap-1">
        {r.reason_codes.map((code) => (
          <code
            key={code}
            className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-mono text-amber-700"
          >
            {code}
          </code>
        ))}
      </div>
    ),
    latest_cancellation_at: r.latest_cancellation_at
      ? new Date(r.latest_cancellation_at).toLocaleString()
      : '—',
  }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-brand-900">
              Cancellation Analytics
            </h2>
            <p className="mt-1 text-sm text-brand-500">
              Reason code breakdown, safety flags, and repeat-cancellation detection
            </p>
          </div>
        </div>
        <Card>
          <div className="flex items-center justify-center py-12">
            <svg
              className="h-6 w-6 animate-spin text-brand-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="ml-3 text-brand-500">Loading analytics...</span>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-brand-900">
              Cancellation Analytics
            </h2>
            <p className="mt-1 text-sm text-brand-500">
              Reason code breakdown, safety flags, and repeat-cancellation detection
            </p>
          </div>
        </div>
        <Card className="border border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="font-medium text-red-800">Error loading analytics</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={loadAnalytics}
          >
            Retry
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-900">
            Cancellation Analytics
          </h2>
          <p className="mt-1 text-sm text-brand-500">
            Reason code breakdown, safety flags, and repeat-cancellation detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-brand-500">Period:</span>
          {DAY_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={days === opt.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setDays(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={loadAnalytics}
            className="ml-2"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-brand-700 to-brand-950 text-white">
        <div className="flex flex-wrap items-center gap-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-300">
              Total Cancellations
            </p>
            <p className="mt-1 text-3xl font-bold">
              {analytics?.total_cancellations ?? 0}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-300">
              Unique Reason Codes
            </p>
            <p className="mt-1 text-3xl font-bold">
              {analytics?.reason_breakdown.length ?? 0}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-300">
              Repeat Offenders
            </p>
            <p className="mt-1 text-3xl font-bold">
              {analytics?.repeat_cancellations.length ?? 0}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-300">
              Safety Flags
            </p>
            <p className="mt-1 text-3xl font-bold">
              {analytics?.safety_concern_queue.length ?? 0}
            </p>
          </div>
        </div>
      </Card>

      {/* Reason Code Breakdown */}
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-lg font-semibold text-brand-900">
            Reason Code Breakdown
          </h3>
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-600">
            {analytics?.reason_breakdown.length ?? 0} codes
          </span>
        </div>
        {reasonBreakdownData.length > 0 ? (
          <Table
            columns={reasonBreakdownColumns}
            data={reasonBreakdownData}
          />
        ) : (
          <p className="py-4 text-center text-sm text-brand-400">
            No cancellation data for this period.
          </p>
        )}
      </Card>

      {/* Safety Concern Queue */}
      <Card className="border-l-4 border-l-red-500">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-lg font-semibold text-brand-900">
            Safety Concern Queue
          </h3>
          <Badge status="error">
            {analytics?.safety_concern_queue.length ?? 0} flags
          </Badge>
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
            High Priority
          </span>
        </div>
        {analytics?.safety_concern_queue.length ? (
          <p className="mb-4 text-sm text-red-600">
            These cancellations were made with{' '}
            <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-red-700">
              reason_code = "safety_concern"
            </code>
            . Each requires immediate Operations review.
          </p>
        ) : null}
        {safetyData.length > 0 ? (
          <Table columns={safetyColumns} data={safetyData} />
        ) : (
          <p className="py-4 text-center text-sm text-brand-400">
            No safety concern flags in this period.
          </p>
        )}
      </Card>

      {/* Repeat Cancellation Detection */}
      <Card className="border-l-4 border-l-amber-500">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-lg font-semibold text-brand-900">
            Repeat Cancellation Detection
          </h3>
          <Badge status="warning">
            {analytics?.repeat_cancellations.length ?? 0} flagged
          </Badge>
        </div>
        {analytics?.repeat_cancellations.length ? (
          <p className="mb-4 text-sm text-amber-600">
            These users have cancelled more than 3 rides in the last 24 hours.
            Flagged for Operations review.
          </p>
        ) : null}
        {repeatData.length > 0 ? (
          <Table columns={repeatColumns} data={repeatData} />
        ) : (
          <p className="py-4 text-center text-sm text-brand-400">
            No repeat cancellation patterns detected in this period.
          </p>
        )}
      </Card>
    </div>
  )
}
