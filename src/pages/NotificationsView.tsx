import React, { useEffect, useState } from 'react'

import { Card, Button } from '../components'
import {
  AdminNotification,
  DashboardMetrics,
  supabaseService,
} from '../services/supabaseService'

type AlertCard = {
  title: string
  detail: string
  tone: 'yellow' | 'blue'
}

export const NotificationsView: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadNotificationsView()
  }, [])

  const loadNotificationsView = async () => {
    try {
      setIsLoading(true)
      const [metricsData, notificationData] = await Promise.all([
        supabaseService.getDashboardMetrics(),
        supabaseService.getNotifications(),
      ])
      setMetrics(metricsData)
      setNotifications(notificationData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const alertCards: AlertCard[] = [
    {
      title: 'New payment submitted',
      detail: `${metrics?.pending_payments_count ?? 0} payment request(s) currently require review.`,
      tone: 'yellow',
    },
    {
      title: 'Driver awaiting approval',
      detail: `${metrics?.pending_drivers_count ?? 0} driver profile(s) are waiting in the KYC queue.`,
      tone: 'yellow',
    },
    {
      title: 'Live operations load',
      detail: `${metrics?.active_rides_count ?? 0} active ride(s) and ${metrics?.active_drivers_count ?? 0} approved online driver(s).`,
      tone: 'blue',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Notifications & Alerts</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Review action-required admin alerts and the system notifications sent to drivers during
            approval, suspension, payment, and low-balance workflows.
          </p>
        </div>
        <Button variant="secondary" onClick={loadNotificationsView}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {alertCards.map((alert) => (
          <Card
            key={alert.title}
            className={
              alert.tone === 'yellow'
                ? 'border border-yellow-200 bg-yellow-50'
                : 'border border-blue-200 bg-blue-50'
            }
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Action Required
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">{alert.title}</h2>
            <p className="mt-2 text-sm text-slate-700">{alert.detail}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Recent System Notifications</h2>
            <p className="mt-1 text-sm text-slate-600">
              Outbound notifications written by the backend lifecycle RPCs.
            </p>
          </div>
          {!isLoading && (
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {notifications.length} event(s)
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-slate-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-slate-500">
            No notifications available.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notification.content}</p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.16em] text-slate-500">
                    <p>{notification.notification_type.replace(/_/g, ' ')}</p>
                    <p className="mt-1">{notification.status}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Sent {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}