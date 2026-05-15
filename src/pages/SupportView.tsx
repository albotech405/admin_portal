import React, { useState, useEffect, useRef } from 'react'
import { Card, Badge, Button, Modal } from '../components'
import { supabaseService, TicketListItem, TicketDetail } from '../services/supabaseService'

const PRIORITY_STATUS: Record<string, string> = {
  high: 'danger',
  urgent: 'danger',
  normal: 'warning',
  low: 'success',
}

const TICKET_STATUS: Record<string, string> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'success',
  escalated: 'danger',
}

export const SupportView: React.FC = () => {
  const [tickets, setTickets] = useState<TicketListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [createForm, setCreateForm] = useState({
    user_id: '',
    subject: '',
    body: '',
    priority: 'normal',
    user_type: 'customer',
  })

  useEffect(() => {
    fetchTickets()
  }, [statusFilter, priorityFilter])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedTicket?.messages])

  async function fetchTickets() {
    setLoading(true)
    setError(null)
    try {
      const resp = await supabaseService.getTickets({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        limit: 50,
      })
      setTickets(resp.tickets)
      setTotal(resp.total)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  async function openTicket(id: string) {
    setDetailLoading(true)
    try {
      const detail = await supabaseService.getTicketDetail(id)
      setSelectedTicket(detail)
    } catch (e: any) {
      alert('Failed to load ticket: ' + (e?.response?.data?.detail || e?.message))
    } finally {
      setDetailLoading(false)
    }
  }

  async function sendReply() {
    if (!selectedTicket || !chatMessage.trim()) return
    setSending(true)
    try {
      await supabaseService.addTicketMessage(selectedTicket.id, chatMessage.trim())
      setChatMessage('')
      await openTicket(selectedTicket.id)
    } catch (e: any) {
      alert('Failed to send: ' + (e?.response?.data?.detail || e?.message))
    } finally {
      setSending(false)
    }
  }

  async function updateTicketStatus(status: string) {
    if (!selectedTicket) return
    try {
      await supabaseService.updateTicket(selectedTicket.id, { status })
      await openTicket(selectedTicket.id)
      fetchTickets()
    } catch (e: any) {
      alert('Failed to update: ' + (e?.response?.data?.detail || e?.message))
    }
  }

  async function handleCreate() {
    if (!createForm.user_id.trim() || !createForm.subject.trim() || !createForm.body.trim()) {
      alert('User ID, subject, and message are required.')
      return
    }
    try {
      await supabaseService.createTicket(createForm)
      setShowCreateModal(false)
      setCreateForm({ user_id: '', subject: '', body: '', priority: 'normal', user_type: 'customer' })
      fetchTickets()
    } catch (e: any) {
      alert('Failed to create ticket: ' + (e?.response?.data?.detail || e?.message))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-950">Support & Communications</h1>
          <p className="mt-1 text-brand-600">Ticket queue, threaded chat, and user messaging.</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>New Ticket</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-800 focus:outline-none"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="escalated">Escalated</option>
        </select>
        <select
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-800 focus:outline-none"
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <span className="flex items-center text-sm text-brand-500">{total} ticket{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Ticket list */}
        <div className="lg:col-span-2 space-y-2">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />
            </div>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {!loading && tickets.length === 0 && (
            <Card><p className="text-brand-500 text-sm text-center py-8">No tickets found.</p></Card>
          )}
          {tickets.map(t => (
            <div
              key={t.id}
              onClick={() => openTicket(t.id)}
              className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
                selectedTicket?.id === t.id
                  ? 'border-accent-400 bg-accent-50'
                  : 'border-brand-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-brand-900 text-sm leading-tight line-clamp-2">{t.subject}</p>
                <Badge status={PRIORITY_STATUS[t.priority] ?? 'neutral'}>{t.priority}</Badge>
              </div>
              <p className="mt-1 text-xs text-brand-500">{t.user_name || t.user_id} · {t.user_type}</p>
              <div className="mt-2 flex items-center justify-between">
                <Badge status={TICKET_STATUS[t.status] ?? 'neutral'}>{t.status}</Badge>
                <span className="text-xs text-brand-400">{t.message_count} msg{t.message_count !== 1 ? 's' : ''}</span>
              </div>
              <p className="mt-1 text-xs text-brand-400">{new Date(t.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>

        {/* Ticket detail + chat */}
        <div className="lg:col-span-3">
          {detailLoading && (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />
            </div>
          )}
          {!detailLoading && !selectedTicket && (
            <Card>
              <p className="text-brand-500 text-sm text-center py-16">Select a ticket to view the conversation.</p>
            </Card>
          )}
          {!detailLoading && selectedTicket && (
            <Card className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-brand-100 pb-4">
                <div>
                  <h2 className="font-bold text-brand-900">{selectedTicket.subject}</h2>
                  <p className="text-xs text-brand-500 mt-0.5">
                    {selectedTicket.user_type} · Created {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Badge status={TICKET_STATUS[selectedTicket.status] ?? 'neutral'}>{selectedTicket.status}</Badge>
                  <Badge status={PRIORITY_STATUS[selectedTicket.priority] ?? 'neutral'}>{selectedTicket.priority}</Badge>
                </div>
              </div>

              {/* User context */}
              {selectedTicket.user_context && (
                <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-brand-700 mb-1">User Context</p>
                  <div className="grid grid-cols-2 gap-1 text-brand-600">
                    <span>Name: {selectedTicket.user_context.full_name || '—'}</span>
                    <span>Phone: {selectedTicket.user_context.phone_number || '—'}</span>
                    <span>Rating: {selectedTicket.user_context.customer_rating.toFixed(1)}</span>
                    <span>Active: {selectedTicket.user_context.is_active ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {selectedTicket.status !== 'in_progress' && (
                  <Button variant="secondary" size="sm" onClick={() => updateTicketStatus('in_progress')}>Mark In Progress</Button>
                )}
                {selectedTicket.status !== 'resolved' && (
                  <Button variant="secondary" size="sm" onClick={() => updateTicketStatus('resolved')}>Mark Resolved</Button>
                )}
                {selectedTicket.status !== 'escalated' && (
                  <Button variant="danger" size="sm" onClick={() => updateTicketStatus('escalated')}>Escalate</Button>
                )}
                {selectedTicket.status !== 'closed' && (
                  <Button variant="secondary" size="sm" onClick={() => updateTicketStatus('closed')}>Close</Button>
                )}
              </div>

              {/* Messages thread */}
              <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                {selectedTicket.messages.length === 0 && (
                  <p className="text-brand-400 text-sm text-center py-4">No messages yet.</p>
                )}
                {selectedTicket.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.sender_type === 'admin'
                          ? 'bg-accent-600 text-white'
                          : 'bg-brand-100 text-brand-900'
                      }`}
                    >
                      <p className="font-semibold text-xs mb-1 opacity-70">
                        {msg.sender_name || (msg.sender_type === 'admin' ? 'Admin' : 'User')}
                      </p>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      <p className="text-xs opacity-60 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Reply box */}
              <div className="flex gap-2 border-t border-brand-100 pt-3">
                <textarea
                  className="flex-1 rounded-xl border border-brand-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-400"
                  rows={2}
                  placeholder="Type a reply…"
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() }
                  }}
                />
                <Button
                  variant="primary"
                  onClick={sendReply}
                  disabled={!chatMessage.trim() || sending}
                >
                  {sending ? '…' : 'Send'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Support Ticket">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1">User ID</label>
            <input
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
              placeholder="User UUID"
              value={createForm.user_id}
              onChange={e => setCreateForm(f => ({ ...f, user_id: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1">User Type</label>
            <select
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none"
              value={createForm.user_type}
              onChange={e => setCreateForm(f => ({ ...f, user_type: e.target.value }))}
            >
              <option value="customer">Customer</option>
              <option value="driver">Driver</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1">Subject</label>
            <input
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
              placeholder="Ticket subject"
              value={createForm.subject}
              onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1">Message</label>
            <textarea
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-400"
              rows={4}
              placeholder="Describe the issue…"
              value={createForm.body}
              onChange={e => setCreateForm(f => ({ ...f, body: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1">Priority</label>
            <select
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none"
              value={createForm.priority}
              onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Create Ticket</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
