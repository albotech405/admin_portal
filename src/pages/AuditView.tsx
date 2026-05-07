import React from 'react'
import { Card } from '../components'

const auditAreas = [
  'Immutable write log with actor, entity, before, after, reason, and timestamp',
  'Privacy operations for user data export and deletion status visibility',
  'Consent tracking for marketing and analytics',
  'Monthly transaction, license validity, insurance validity, and SOS compliance reports',
]

export const AuditView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Audit & Compliance</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Every admin write action must be attributable, exportable, and safe for regulated review.
          Privacy workflows also need to surface backend blockers instead of encouraging manual data
          scrubbing.
        </p>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-slate-950">Control Areas</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {auditAreas.map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </Card>

      <Card className="border border-red-200 bg-red-50">
        <h2 className="text-lg font-semibold text-red-950">Deletion Endpoint Status</h2>
        <p className="mt-2 text-sm text-red-900">
          The customer-facing delete-account endpoint is still returning HTTP 500. The admin console
          should surface that blocker and instruct support not to manually scrub records while the
          backend defect is open.
        </p>
      </Card>
    </div>
  )
}