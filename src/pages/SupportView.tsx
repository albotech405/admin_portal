import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Modal } from '../components'
import { supabaseService } from '../services/supabaseService'

type Ticket = {
  id: string
  subject?: string
  status?: string
  priority?: string
  user_id?: string
  user_type?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

type TicketMessage = {
  id: string
  body: string
  sender_type?: string
  created_at: string
  [key: string]: unknown
}

type TicketDetail = Ticket & {
  messages?: TicketMessage[]
}

const STATUS_TABS = ['all', 'open', 'in_progress', 'resolved', 'closed', 'escalated'] as const
type StatusTab = typeof STATUS_TABS[number]
const PRIORITY_TABS = ['all', 'urgent', 'high', 'normal', 'low'] as const
type PriorityTab = typeof PRIORITY_TABS[number]

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-slate-100 text-slate-700',
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-slate-100 text-slate-600',
  closed: 'bg-slate-200 text-slate-500',
  escalated: 'bg-red-100 text-red-800',
}

export const SupportView: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityTab>('all')
  const [error, setError] = useState<string | null>(null)

  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null)
  const [reply, setReply] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ userId: '', userType: 'customer', subject: '', message: '', priority: 'normal' })
  const [isCreating, setIsCreating] = useState(false)

  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getTickets(
        statusFilter !== 'all' ? statusFilter : undefined,
        priorityFilter !== 'all' ? priorityFilter : undefined
      )
      setTickets(data as Ticket[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, priorityFilter])

  useEffect(() => { void loadTickets() }, [loadTickets])

  const openTicket = async (ticketId: string) => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getTicketDetail(ticketId)
      setSelectedTicket(data as TicketDetail)
      setReply('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !reply.trim()) return
    try {
      setIsSending(true)
      await supabaseService.addTicketMessage(selectedTicket.id, reply)
      const msg: TicketMessage = { id: Date.now().toString(), body: reply, sender_type: 'admin', created_at: new Date().toISOString() }
      setSelectedTicket({ ...selectedTicket, messages: [...(selectedTicket.messages || []), msg] })
      setReply('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to send reply') }
    finally { setIsSending(false) }
  }

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return
    try {
      setIsUpdating(true)
      await supabaseService.updateTicket(selectedTicket.id, { status })
      if ((status === 'resolved' || status === 'closed') && selectedTicket.user_id) {
        supabaseService.sendTargetedNotification({
          user_ids: [selectedTicket.user_id as string],
          title: status === 'resolved' ? 'Support Ticket Resolved' : 'Support Ticket Closed',
          message: `Your support ticket "${selectedTicket.subject || 'your request'}" has been ${status}. Thank you for reaching out.`,
        }).catch(() => {})
      }
      const updated = { ...selectedTicket, status }
      setSelectedTicket(updated)
      setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status } : t))
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update ticket') }
    finally { setIsUpdating(false) }
  }

  const handleCreate = async () => {
    if (!createForm.subject.trim() || !createForm.message.trim() || !createForm.userId.trim()) return
    try {
      setIsCreating(true)
      const ticket = await supabaseService.createTicket({
        user_id: createForm.userId,
        user_type: createForm.userType,
        subject: createForm.subject,
        message: createForm.message,
        priority: createForm.priority,
      })
      setShowCreateModal(false)
      setCreateForm({ userId: '', userType: 'customer', subject: '', message: '', priority: 'normal' })
      if (ticket && (ticket as Ticket).id) void openTicket((ticket as Ticket).id)
      else void loadTickets()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create ticket') }
    finally { setIsCreating(false) }
  }

  if (selectedTicket) {
    const messages = selectedTicket.messages || []
    const isActive = !['resolved', 'closed'].includes(selectedTicket.status || '')
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedTicket(null)} className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
          ← Back to Tickets
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">{selectedTicket.subject || 'Ticket'}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${STATUS_COLOR[selectedTicket.status || 'open'] || 'bg-slate-100'}`}>
                {selectedTicket.status || 'open'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${PRIORITY_COLOR[selectedTicket.priority || 'normal'] || 'bg-slate-100'}`}>
                {selectedTicket.priority || 'normal'}
              </span>
              <span className="text-xs text-slate-500">{selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : ''}</span>
            </div>
          </div>
          {isActive && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus('in_progress')} disabled={isUpdating}>Mark In Progress</Button>
              <Button size="sm" variant="primary" onClick={() => handleUpdateStatus('resolved')} disabled={isUpdating}>Resolve</Button>
              <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus('escalated')} disabled={isUpdating}>Escalate</Button>
              <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus('closed')} disabled={isUpdating}>Close</Button>
            </div>
          )}
        </div>

        {error && <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}

        <Card>
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">Thread</h2>
          {messages.length === 0
            ? <div className="text-sm text-slate-500 py-8 text-center">No messages yet.</div>
            : (
              <div className="space-y-4">
                {messages.map((msg, i) => {
                  const isAdmin = msg.sender_type === 'admin'
                  return (
                    <div key={msg.id || i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-lg rounded-2xl px-4 py-3 text-sm ${isAdmin ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-950'}`}>
                        <p className="mb-1 text-xs opacity-60">{isAdmin ? 'Admin' : (msg.sender_type || 'User')} · {new Date(msg.created_at).toLocaleString()}</p>
                        <p>{msg.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
          {isActive && (
            <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
              <textarea
                className="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                rows={3} placeholder="Type a reply..." value={reply} onChange={e => setReply(e.target.value)}
              />
              <div className="flex justify-end">
                <Button variant="primary" size="sm" onClick={handleSendReply} disabled={!reply.trim() || isSending}>
                  {isSending ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Support & Communications</h1>
          <p className="mt-2 text-slate-600">Manage customer and driver support tickets.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadTickets}>Refresh</Button>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>New Ticket</Button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {PRIORITY_TABS.map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${priorityFilter === p ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-200'}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-slate-500">Loading...</div>
      ) : tickets.length === 0 ? (
        <Card><div className="flex h-40 items-center justify-center text-slate-500">No tickets found.</div></Card>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => (
            <button
              key={ticket.id}
              onClick={() => void openTicket(ticket.id)}
              className="w-full text-left rounded-2xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-400 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950 text-sm">{ticket.subject || 'No subject'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">ID: {ticket.id} {ticket.user_id && `· User: ${ticket.user_id}`}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${PRIORITY_COLOR[ticket.priority || 'normal'] || 'bg-slate-100'}`}>
                    {ticket.priority || 'normal'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${STATUS_COLOR[ticket.status || 'open'] || 'bg-slate-100'}`}>
                    {ticket.status || 'open'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Support Ticket">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">User ID *</label>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="user-uuid" value={createForm.userId} onChange={e => setCreateForm(f => ({ ...f, userId: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">User Type</label>
              <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                value={createForm.userType} onChange={e => setCreateForm(f => ({ ...f, userType: e.target.value }))}>
                <option value="customer">Customer</option>
                <option value="driver">Driver</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Subject *</label>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Brief description" value={createForm.subject} onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              value={createForm.priority} onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Message *</label>
            <textarea className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              rows={4} placeholder="Initial message..." value={createForm.message}
              onChange={e => setCreateForm(f => ({ ...f, message: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}
              disabled={!createForm.subject.trim() || !createForm.message.trim() || !createForm.userId.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}