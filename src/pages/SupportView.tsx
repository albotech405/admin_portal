import React from 'react'
import { Card } from '../components'

const ticketCapabilities = [
  'Queue with SLA flags for >4h high priority and >24h normal tickets',
  'Threaded detail view with profile, trips, payments, attachments, and internal notes',
  'Escalation paths to Operations, Finance, and Super Admin',
  'Native in-app support chat replacing Formspree',
]

const durableMessageComposers = [
  'KYC outcome composer for approval and rejection reasons',
  'Suspension composer with reason, end date, and co-sign for indefinite suspensions',
  'Category grant and demotion composer for premium and lady_driver actions',
  'Support reply composer that writes to the ticket thread and notifications feed',
  'Generic warning composer for abuse, no-show, safety, payment fraud, and other cases',
]

export const SupportView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Support & Communications</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          The dashboard needs an in-system inbox, structured replies, and durable admin-to-user
          messages. This page makes that scope visible even where the backend is still pending.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold text-slate-950">Ticketing Surface</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            {ticketCapabilities.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-slate-950">Durable Message Composers</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            {durableMessageComposers.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">FAQ & Saved Replies</h2>
          <p className="mt-2 text-sm text-slate-600">
            FAQ needs an English and French editor with support-chat surfacing. Macros remain a
            separate channel for repetitive ticket replies and must support parameter insertion.
          </p>
        </Card>

        <Card className="border border-amber-200 bg-amber-50">
          <h2 className="text-lg font-semibold text-amber-950">Backend Gate</h2>
          <p className="mt-2 text-sm text-amber-900">
            The notifications feed is still blocked until backend writes durable notification rows.
            The composers are part of the correct UI shape, but they cannot land end-to-end until
            that write path exists.
          </p>
        </Card>
      </div>
    </div>
  )
}