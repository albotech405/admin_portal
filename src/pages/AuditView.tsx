import React, { useState, useEffect } from 'react'
import { Card, Badge, Button } from '../components'
import { supabaseService, AuditLogItem } from '../services/supabaseService'

const TABS = ['Audit Log', 'Data Privacy'] as const
type Tab = typeof TABS[number]

export const AuditView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Audit Log')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-brand-950">Audit & Compliance</h1>
        <p className="mt-1 text-brand-600">Immutable action log and GDPR data privacy tooling.</p>
      </div>

      <div className="flex gap-1 border-b border-brand-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-accent-600 text-accent-700'
                : 'text-brand-500 hover:text-brand-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Audit Log' && <AuditLogTab />}
      {activeTab === 'Data Privacy' && <DataPrivacyTab />}
    </div>
  )
}

// ── Audit Log Tab ──────────────────────────────────────────────────────────────

const AuditLogTab: React.FC = () => {
  const [items, setItems] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const limit = 50

  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    action_type: '',
    entity_type: '',
  })
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { fetchLog() }, [offset, filters])

  async function fetchLog() {
    setLoading(true)
    setError(null)
    try {
      const resp = await supabaseService.getAuditLog({
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        limit,
        offset,
      })
      setItems(resp.items)
      setTotal(resp.total)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    const base = supabaseService.getAuditLogExportUrl()
    const params = new URLSearchParams()
    if (filters.date_from) params.set('date_from', filters.date_from)
    if (filters.date_to) params.set('date_to', filters.date_to)
    if (filters.action_type) params.set('action_type', filters.action_type)
    if (filters.entity_type) params.set('entity_type', filters.entity_type)
    const url = `${base}?${params.toString()}`
    window.open(url, '_blank')
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-brand-600">From</label>
            <input type="date" className="rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none"
              value={filters.date_from} onChange={e => { setFilters(f => ({ ...f, date_from: e.target.value })); setOffset(0) }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-brand-600">To</label>
            <input type="date" className="rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none"
              value={filters.date_to} onChange={e => { setFilters(f => ({ ...f, date_to: e.target.value })); setOffset(0) }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-brand-600">Action Type</label>
            <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none w-40"
              placeholder="e.g. ban, approve" value={filters.action_type}
              onChange={e => { setFilters(f => ({ ...f, action_type: e.target.value })); setOffset(0) }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-brand-600">Entity Type</label>
            <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none w-40"
              placeholder="e.g. driver, customer" value={filters.entity_type}
              onChange={e => { setFilters(f => ({ ...f, entity_type: e.target.value })); setOffset(0) }} />
          </div>
          <Button variant="secondary" onClick={() => { setFilters({ date_from: '', date_to: '', action_type: '', entity_type: '' }); setOffset(0) }}>
            Clear
          </Button>
          <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />
          </div>
        )}
        {error && <p className="text-red-600 text-sm py-4">{error}</p>}
        {!loading && items.length === 0 && (
          <p className="text-brand-500 text-sm text-center py-10">No audit entries found.</p>
        )}
        {!loading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-500">
                  <th className="pb-3 pr-4">Timestamp</th>
                  <th className="pb-3 pr-4">Admin</th>
                  <th className="pb-3 pr-4">Action</th>
                  <th className="pb-3 pr-4">Entity</th>
                  <th className="pb-3">Summary</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {items.map(item => (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-brand-50/50 transition-colors">
                      <td className="py-3 pr-4 text-brand-500 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-brand-700">
                        {item.admin_email || item.admin_user_id?.slice(0, 8) || '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge status="info">{item.action_type}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-brand-600">
                        <span className="font-medium">{item.entity_type}</span>
                        {item.entity_id && <span className="ml-1 text-xs text-brand-400">#{item.entity_id.slice(0, 8)}</span>}
                      </td>
                      <td className="py-3 text-brand-700 max-w-xs truncate">{item.summary}</td>
                      <td className="py-3 pl-2">
                        {(item.before_state || item.after_state) && (
                          <button
                            className="text-xs text-accent-600 hover:text-accent-800 font-medium"
                            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                          >
                            {expanded === item.id ? 'Hide' : 'Diff'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === item.id && (
                      <tr>
                        <td colSpan={6} className="pb-4 pt-1 px-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-semibold text-brand-500 mb-1">Before</p>
                              <pre className="rounded-lg bg-brand-50 p-3 text-xs text-brand-700 overflow-auto max-h-40">
                                {JSON.stringify(item.before_state, null, 2) || '—'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-brand-500 mb-1">After</p>
                              <pre className="rounded-lg bg-green-50 p-3 text-xs text-brand-700 overflow-auto max-h-40">
                                {JSON.stringify(item.after_state, null, 2) || '—'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-brand-100 pt-4 mt-4">
            <p className="text-xs text-brand-500">{total} entries · Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setOffset(o => o + limit)} disabled={offset + limit >= total}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Data Privacy Tab ───────────────────────────────────────────────────────────

const DataPrivacyTab: React.FC = () => {
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<any[]>([])
  const [, setExportData] = useState<any | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function lookupUser() {
    if (!userId.trim()) return
    setLoading(true)
    setMessage(null)
    setExportData(null)
    try {
      const reqs = await supabaseService.listGdprErasureRequests(userId.trim())
      setRequests(reqs)
    } catch (e: any) {
      setMessage('Error: ' + (e?.response?.data?.detail || e?.message))
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    if (!userId.trim()) return
    setLoading(true)
    try {
      const data = await supabaseService.exportCustomerGdprData(userId.trim())
      setExportData(data)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gdpr_export_${userId.trim().slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Export downloaded.')
    } catch (e: any) {
      setMessage('Export failed: ' + (e?.response?.data?.detail || e?.message))
    } finally {
      setLoading(false)
    }
  }

  async function handleErasureRequest() {
    if (!userId.trim()) return
    if (!window.confirm('Create a GDPR erasure request for this user?')) return
    setLoading(true)
    try {
      const res = await supabaseService.requestGdprErasure(userId.trim())
      setMessage(res.message)
      lookupUser()
    } catch (e: any) {
      setMessage('Failed: ' + (e?.response?.data?.detail || e?.message))
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(reqId: string) {
    if (!window.confirm('Mark this erasure request as approved?')) return
    setLoading(true)
    try {
      await supabaseService.approveGdprErasure(userId.trim(), reqId)
      setMessage('Request approved.')
      lookupUser()
    } catch (e: any) {
      setMessage('Failed: ' + (e?.response?.data?.detail || e?.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <h2 className="font-semibold text-brand-900 mb-4">GDPR User Data Tools</h2>
        <p className="text-sm text-brand-600 mb-4">
          Enter a customer user ID to export their data or manage erasure requests.
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
            placeholder="Customer UUID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookupUser()}
          />
          <Button variant="secondary" onClick={lookupUser} disabled={loading}>Lookup</Button>
        </div>

        {message && (
          <p className={`mt-3 text-sm ${message.startsWith('Error') || message.startsWith('Failed') ? 'text-red-600' : 'text-green-700'}`}>
            {message}
          </p>
        )}
      </Card>

      {userId && (
        <Card>
          <div className="flex flex-wrap gap-3 mb-6">
            <Button variant="secondary" onClick={handleExport} disabled={loading}>
              Export Personal Data (JSON)
            </Button>
            <Button variant="danger" onClick={handleErasureRequest} disabled={loading}>
              Request Data Erasure
            </Button>
          </div>

          <h3 className="font-semibold text-brand-800 mb-3">Erasure Requests</h3>
          {loading && <div className="h-6 w-6 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />}
          {!loading && requests.length === 0 && (
            <p className="text-sm text-brand-400">No erasure requests for this user.</p>
          )}
          {requests.map(req => (
            <div key={req.id} className="flex items-center justify-between rounded-lg border border-brand-100 px-4 py-3 mb-2">
              <div>
                <Badge status={req.status === 'approved' ? 'approved' : req.status === 'pending' ? 'pending' : 'neutral'}>
                  {req.status}
                </Badge>
                <p className="text-xs text-brand-500 mt-1">Requested {new Date(req.requested_at).toLocaleDateString()}</p>
                {req.processed_at && (
                  <p className="text-xs text-brand-400">Processed {new Date(req.processed_at).toLocaleDateString()}</p>
                )}
              </div>
              {req.status === 'pending' && (
                <Button variant="primary" size="sm" onClick={() => handleApprove(req.id)} disabled={loading}>
                  Approve
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
