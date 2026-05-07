import React from 'react'
import { Card } from '../components'

const responseTools = [
  'Live SOS queue with map, user snapshot, trip context, and responder list',
  'One-click call actions for the user and emergency services',
  'Broadcast to additional nearby drivers and generate incident report PDFs',
  'Cancellation safety queue for reason_code = safety_concern and repeat-cancellation flags',
]

const analytics = [
  'SOS trigger rate and time-to-first-responder trends',
  'Resolution outcomes and location hotspots',
  'Watchlists for repeat safety incidents and auto-suspension candidates',
]

export const SafetyView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Safety & SOS</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Safety tooling needs to cover real-time incident response, post-incident review, and the
          cancellation-derived safety queue described in the operations spec.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold text-slate-950">Incident Response</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            {responseTools.map((item) => (
              <div key={item} className="rounded-2xl bg-red-50 px-4 py-3 text-red-950">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-slate-950">Safety Analytics</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            {analytics.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="border border-amber-200 bg-amber-50">
        <h2 className="text-lg font-semibold text-amber-950">Cross-Team Risk</h2>
        <p className="mt-2 text-sm text-amber-900">
          Public-launch readiness still depends on backend SOS fixes and frontend SuspendedPage and
          cancellation-reason flows. This UI can expose the workflow, but it cannot replace those
          upstream blockers.
        </p>
      </Card>
    </div>
  )
}