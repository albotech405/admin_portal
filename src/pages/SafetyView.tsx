import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Modal } from '../components'
import { SosSession, supabaseService } from '../services/supabaseService'

const STATUS_TABS = ['all', 'active', 'resolved', 'cancelled'] as const
type StatusTab = typeof STATUS_TABS[number]

const EXCLUDED_SOS_KEYS = ['id', 'ride_id', 'triggered_by', 'status', 'created_at', 'resolved_by', 'resolved_at']

const fmtKey = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const fmtVal = (key: string, val: unknown): string => {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (Array.isArray(val)) return val.length === 0 ? 'None' : `${val.length} item${val.length === 1 ? '' : 's'}`
  if (typeof val === 'string' && (key.endsWith('_at') || key === 'expires_at')) {
    const d = new Date(val)
    return isNaN(d.getTime()) ? val : d.toLocaleString()
  }
  if ((key.includes('latitude') || key.includes('longitude')) && typeof val === 'number') {
    return Number(val).toFixed(6)
  }
  if (typeof val === 'number') return String(val)
  return String(val)
}

export const SafetyView: React.FC = () => {
  const [sessions, setSessions] = useState<SosSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all')
  const [error, setError] = useState<string | null>(null)

  const [selectedSession, setSelectedSession] = useState<SosSession | null>(null)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolveNotes, setResolveNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getSosSessions(statusFilter !== 'all' ? statusFilter : undefined)
      setSessions(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SOS sessions')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { void loadSessions() }, [loadSessions])

  const openSession = async (sessionId: string) => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getSosSessionDetail(sessionId)
      setSelectedSession(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session detail')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!selectedSession || !resolveNotes.trim()) return
    try {
      setIsProcessing(true)
      await supabaseService.resolveSosSession(selectedSession.id, resolveNotes)
      if (selectedSession.triggered_by) {
        supabaseService.sendTargetedNotification({
          user_ids: [selectedSession.triggered_by],
          title: 'Safety Alert Resolved',
          message: 'Your safety alert has been reviewed and resolved by an admin. If you need further assistance, please contact support.',
        }).catch(() => {})
      }
      const updated = { ...selectedSession, status: 'resolved', resolved_at: new Date().toISOString() }
      setSelectedSession(updated)
      setSessions(sessions.map(s => s.id === selectedSession.id ? updated : s))
      setShowResolveModal(false)
      setResolveNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve session')
    } finally {
      setIsProcessing(false)
    }
  }

  const statusColor = (status: string) => {
    if (status === 'active') return 'bg-red-100 text-red-800 border border-red-200'
    if (status === 'resolved') return 'bg-green-100 text-green-800 border border-green-200'
    return 'bg-slate-100 text-slate-700 border border-slate-200'
  }

  if (selectedSession) {
    const isActive = selectedSession.status === 'active'
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedSession(null)} className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
          ← Back to SOS Sessions
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">SOS Session</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-slate-600 font-mono">{selectedSession.id}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusColor(selectedSession.status)}`}>
                {selectedSession.status}
              </span>
            </div>
          </div>
          {isActive && (
            <Button variant="danger" onClick={() => setShowResolveModal(true)}>
              Resolve Session
            </Button>
          )}
        </div>

        {error && <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold text-slate-950 mb-4">Session Details</h2>
            <dl className="space-y-3 text-sm">
              {([
                ['Session ID', selectedSession.id],
                ['Ride ID', (selectedSession.ride_id as string) || 'N/A'],
                ['Triggered By', (selectedSession.triggered_by as string) || 'N/A'],
                ['Status', selectedSession.status],
                ['Created', new Date(selectedSession.created_at).toLocaleString()],
                ['Resolved By', (selectedSession.resolved_by as string) || '—'],
                ['Resolved At', selectedSession.resolved_at ? new Date(selectedSession.resolved_at).toLocaleString() : '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-950 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {(() => {
            const extra = Object.entries(selectedSession).filter(([k]) => !EXCLUDED_SOS_KEYS.includes(k))
            if (extra.length === 0) return null
            return (
              <Card>
                <h2 className="text-lg font-semibold text-slate-950 mb-4">Additional Data</h2>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {extra.map(([key, val]) => (
                    <div key={key}>
                      <dt className="text-slate-500 text-xs">{fmtKey(key)}</dt>
                      <dd className="font-medium text-slate-950 mt-0.5 break-all">{fmtVal(key, val)}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )
          })()}
        </div>

        <Modal isOpen={showResolveModal} onClose={() => { setShowResolveModal(false); setResolveNotes('') }} title="Resolve SOS Session">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Describe the resolution outcome. This is required before closing the session.</p>
            <textarea
              className="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              rows={4} placeholder="Resolution notes..." value={resolveNotes} onChange={e => setResolveNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowResolveModal(false); setResolveNotes('') }}>Cancel</Button>
              <Button variant="primary" onClick={handleResolve} disabled={!resolveNotes.trim() || isProcessing}>
                {isProcessing ? 'Resolving...' : 'Mark Resolved'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Safety & SOS</h1>
          <p className="mt-2 text-slate-600">Monitor and resolve active SOS incidents.</p>
        </div>
        <Button variant="secondary" onClick={loadSessions}>Refresh</Button>
      </div>

      {error && <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-slate-500">Loading...</div>
      ) : sessions.length === 0 ? (
        <Card>
          <div className="flex h-40 items-center justify-center text-slate-500">No SOS sessions found.</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => void openSession(session.id)}
              className="w-full text-left rounded-2xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-400 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950 font-mono text-sm">{session.id}</p>
                  {session.ride_id && <p className="text-xs text-slate-500 mt-0.5">Ride: {session.ride_id as string}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{new Date(session.created_at).toLocaleString()}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusColor(session.status)}`}>
                    {session.status}
                  </span>
                </div>
              </div>
              {session.triggered_by && (
                <p className="text-sm text-slate-600 mt-2">Triggered by: {session.triggered_by as string}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
