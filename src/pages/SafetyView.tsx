import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, Table } from '../components'
import { SosSession, supabaseService } from '../services/supabaseService'

export const SafetyView: React.FC = () => {
  const [sessions, setSessions] = useState<SosSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [selectedSession, setSelectedSession] = useState<SosSession | null>(null)
  const [resolution, setResolution] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadSessions()
  }, [filterStatus])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getSosSessions(
        filterStatus !== 'all' ? filterStatus : undefined
      )
      setSessions(data)
      setError(null)
    } catch (err) {
      setError('Failed to load SOS sessions')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!selectedSession || !resolution.trim()) return
    try {
      setActionLoading(true)
      await supabaseService.resolveSosSession(selectedSession.id, resolution)
      setSelectedSession(null)
      setResolution('')
      loadSessions()
    } catch (err) {
      setError('Failed to resolve SOS session')
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const statusLabels: Record<string, string> = {
    all: 'All',
    active: 'Active',
    resolved: 'Resolved',
    cancelled: 'Cancelled',
  }

  const tableColumns = [
    { key: 'user_type', label: 'Type', width: 'w-20' },
    { key: 'user_id', label: 'User ID' },
    { key: 'sos_type', label: 'SOS Type' },
    { key: 'location_name', label: 'Location' },
    { key: 'status', label: 'Status', width: 'w-24' },
    { key: 'created_at', label: 'Time', width: 'w-28' },
  ]

  const tableData = sessions.map((s) => ({
    ...s,
    user_type: s.user_type === 'driver' ? (
      <Badge status="active">Driver</Badge>
    ) : (
      <Badge status="pending">Customer</Badge>
    ),
    user_id: s.user_id.slice(0, 8) + '…',
    sos_type: s.sos_type || 'General',
    location_name: s.location_name || '—',
    status: s.status === 'active' ? (
      <Badge status="suspended">Active</Badge>
    ) : s.status === 'resolved' ? (
      <Badge status="active">Resolved</Badge>
    ) : (
      <Badge status="pending">Cancelled</Badge>
    ),
    created_at: new Date(s.created_at).toLocaleString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-950">Safety & SOS</h1>
          <p className="mt-2 max-w-3xl text-brand-600">
            Real-time incident response, SOS queue management, and post-incident review.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadSessions} isLoading={isLoading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {Object.entries(statusLabels).map(([value, label]) => (
            <Button
              key={value}
              variant={filterStatus === value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterStatus(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        <p className="text-sm text-brand-500 mb-3">
          {sessions.length} SOS session{sessions.length !== 1 ? 's' : ''} found
        </p>

        <Table
          columns={tableColumns}
          data={tableData}
          isLoading={isLoading}
          onRowClick={(row: any) => {
            const session = sessions.find((s) => s.id === row.id)
            if (session) setSelectedSession(session)
          }}
        />
      </Card>

      {/* Session Detail Panel */}
      {selectedSession && (
        <Card className={`border-l-4 ${
          selectedSession.status === 'active'
            ? 'border-l-red-500'
            : 'border-l-green-500'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-brand-950">
                SOS Session — {selectedSession.sos_type || 'General'}
              </h2>
              <p className="mt-1 text-sm text-brand-500">ID: {selectedSession.id}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedSession(null)}>
                Close
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-500">User Type</p>
              <p className="mt-1 font-medium text-brand-900 capitalize">{selectedSession.user_type}</p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-500">User ID</p>
              <p className="mt-1 font-mono text-sm text-brand-900">{selectedSession.user_id}</p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-500">Status</p>
              <p className="mt-1">
                {selectedSession.status === 'active' ? (
                  <Badge status="suspended">Active</Badge>
                ) : selectedSession.status === 'resolved' ? (
                  <Badge status="active">Resolved</Badge>
                ) : (
                  <Badge status="pending">Cancelled</Badge>
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-500">Location</p>
              <p className="mt-1 font-medium text-brand-900">
                {selectedSession.location_name || 'No location data'}
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-500">Created</p>
              <p className="mt-1 font-medium text-brand-900">
                {new Date(selectedSession.created_at).toLocaleString()}
              </p>
            </div>
            {selectedSession.resolved_at && (
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-500">Resolved At</p>
                <p className="mt-1 font-medium text-brand-900">
                  {new Date(selectedSession.resolved_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {selectedSession.notes && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">Notes</p>
              <p className="mt-1 text-sm text-amber-900">{selectedSession.notes}</p>
            </div>
          )}

          {/* Resolve Form for Active Sessions */}
          {selectedSession.status === 'active' && (
            <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-4">
              <h3 className="font-semibold text-brand-950">Resolve SOS Session</h3>
              <div className="mt-3">
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Enter resolution details..."
                  className="w-full rounded-2xl border border-brand-200 px-4 py-3 text-sm text-brand-900 placeholder-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  rows={3}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleResolve}
                  isLoading={actionLoading}
                  disabled={!resolution.trim()}
                >
                  Mark as Resolved
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
