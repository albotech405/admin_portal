import React, { useEffect, useState } from 'react'
import { Card, Button } from '../components'
import { AdminLog, supabaseService } from '../services/supabaseService'

const fmtKey = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const fmtVal = (key: string, val: unknown): string => {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (Array.isArray(val)) return val.length === 0 ? 'None' : val.map(String).join(', ')
  if (typeof val === 'object') return JSON.stringify(val)
  if (typeof val === 'string' && key.endsWith('_at')) {
    const d = new Date(val)
    return isNaN(d.getTime()) ? val : d.toLocaleString()
  }
  return String(val)
}

const auditAreas = [
  'Immutable write log with actor, entity, before, after, reason, and timestamp',
  'Privacy operations for user data export and deletion status visibility',
  'Consent tracking for marketing and analytics',
  'Monthly transaction, license validity, insurance validity, and SOS compliance reports',
]

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getAdminLogs()
      setLogs(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
        <h1 className="text-3xl font-bold text-slate-950">Audit & Compliance</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Every admin write action must be attributable, exportable, and safe for regulated review.
          Privacy workflows also need to surface backend blockers instead of encouraging manual data
          scrubbing.
        </p>
        </div>
        <Button variant="secondary" onClick={loadLogs}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

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

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Recent Admin Activity</h2>
            <p className="mt-1 text-sm text-slate-600">
              Approval, rejection, suspension, and financial actions written by backend RPCs.
            </p>
          </div>
          {!isLoading && (
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {logs.length} log(s)
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-slate-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-slate-500">
            No audit logs available.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{log.action.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Target: {log.target_table || 'unknown'} / {log.target_id || 'n/a'}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <dl className="mt-3 grid grid-cols-1 gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs sm:grid-cols-2">
                    {Object.entries(log.metadata).map(([key, val]) => (
                      <div key={key}>
                        <dt className="text-slate-500">{fmtKey(key)}</dt>
                        <dd className="font-medium text-slate-950 mt-0.5 break-all">{fmtVal(key, val)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
          </div>
        )}
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