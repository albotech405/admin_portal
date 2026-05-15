import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Table } from '../components/Table'
import { Modal } from '../components/Modal'
import { supabaseService } from '../services/supabaseService'
import type { NotificationHistoryItem, NotificationUserItem } from '../services/supabaseService'

type MainTab = 'Broadcast' | 'Targeted'

type TargetType = 'all_users' | 'all_drivers' | 'all_customers' | 'specific'

const TARGET_OPTIONS: { value: TargetType; label: string }[] = [
  { value: 'all_users', label: 'All Users' },
  { value: 'all_drivers', label: 'All Drivers' },
  { value: 'all_customers', label: 'All Customers' },
  { value: 'specific', label: 'Specific User(s)' },
]

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
  } catch {
    return dateStr
  }
}

export const NotificationsView: React.FC = () => {
  const [mainTab, setMainTab] = useState<MainTab>('Broadcast')

  // ── Targeted composer state ─────────────────────────────────────────────
  const [tRole, setTRole] = useState('')
  const [tActiveOnly, setTActiveOnly] = useState(true)
  const [tTitle, setTTitle] = useState('')
  const [tBody, setTBody] = useState('')
  const [tPreviewCount, setTPreviewCount] = useState<number | null>(null)
  const [tPreviewLoading, setTPreviewLoading] = useState(false)
  const [tSending, setTSending] = useState(false)
  const [tResult, setTResult] = useState<{ success: boolean; message: string } | null>(null)

  const previewSegment = useCallback(async () => {
    setTPreviewLoading(true)
    try {
      const r = await supabaseService.previewNotificationSegment({
        role: tRole || undefined,
        is_active: tActiveOnly,
      })
      setTPreviewCount(r.recipient_count)
    } catch {
      setTPreviewCount(null)
    } finally {
      setTPreviewLoading(false)
    }
  }, [tRole, tActiveOnly])

  const handleTargetedSend = async () => {
    if (!tTitle.trim() || !tBody.trim()) return
    setTSending(true)
    setTResult(null)
    try {
      const r = await supabaseService.sendTargetedNotification({
        title: tTitle.trim(),
        body: tBody.trim(),
        role: tRole || undefined,
        is_active: tActiveOnly,
      })
      setTResult({ success: r.success, message: r.message })
      if (r.success) { setTTitle(''); setTBody(''); setTPreviewCount(null); loadHistory(true) }
    } catch (e: any) {
      setTResult({ success: false, message: e?.response?.data?.detail || e?.message || 'Failed' })
    } finally {
      setTSending(false)
    }
  }

  // ── Composer state ──────────────────────────────────────────────────────
  const [target, setTarget] = useState<TargetType>('all_users')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<NotificationUserItem[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  // ── History state ───────────────────────────────────────────────────────
  const [history, setHistory] = useState<NotificationHistoryItem[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyOffset, setHistoryOffset] = useState(0)
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('')
  const HISTORY_LIMIT = 50

  // ── Preview modal ───────────────────────────────────────────────────────
  const [showPreview, setShowPreview] = useState(false)

  // ── Load history ────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (resetOffset = true) => {
    setIsLoadingHistory(true)
    try {
      const offset = resetOffset ? 0 : historyOffset
      const params: any = { limit: HISTORY_LIMIT, offset }
      if (historyStatusFilter) params.status = historyStatusFilter

      const response = await supabaseService.getNotificationHistory(params)
      if (resetOffset) {
        setHistory(response.items)
      } else {
        setHistory((prev) => [...prev, ...response.items])
      }
      setHistoryTotal(response.total)
      if (!resetOffset) setHistoryOffset(offset + HISTORY_LIMIT)
      else setHistoryOffset(HISTORY_LIMIT)
    } catch (err) {
      console.error('Failed to load notification history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [historyOffset, historyStatusFilter])

  useEffect(() => {
    loadHistory(true)
  }, [historyStatusFilter])

  // ── Search users for targeting ──────────────────────────────────────────
  const searchUsers = useCallback(async (search: string) => {
    if (!search.trim()) {
      setUserSearchResults([])
      return
    }
    setIsSearchingUsers(true)
    try {
      const response = await supabaseService.getNotificationUsers({ search, limit: 20 })
      setUserSearchResults(response.items)
    } catch (err) {
      console.error('Failed to search users:', err)
    } finally {
      setIsSearchingUsers(false)
    }
  }, [])

  useEffect(() => {
    if (target === 'specific' && userSearch.length >= 2) {
      const timer = setTimeout(() => searchUsers(userSearch), 300)
      return () => clearTimeout(timer)
    } else {
      setUserSearchResults([])
    }
  }, [userSearch, target, searchUsers])

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  // ── Send notification ───────────────────────────────────────────────────
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return
    if (target === 'specific' && selectedUserIds.length === 0) return

    setIsSending(true)
    setSendResult(null)
    try {
      const response = await supabaseService.sendNotification({
        target,
        user_ids: target === 'specific' ? selectedUserIds : undefined,
        title: title.trim(),
        body: body.trim(),
        schedule_at: scheduleAt || undefined,
      })
      setSendResult({ success: response.success, message: response.message })
      if (response.success) {
        setTitle('')
        setBody('')
        setScheduleAt('')
        setSelectedUserIds([])
        setUserSearch('')
        loadHistory(true)
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error'
      setSendResult({ success: false, message: `Failed: ${detail}` })
    } finally {
      setIsSending(false)
      setShowPreview(false)
    }
  }

  // ── History table columns ───────────────────────────────────────────────
  const historyColumns = [
    { key: 'title', label: 'Title' },
    { key: 'content', label: 'Content' },
    { key: 'user_name', label: 'Recipient' },
    { key: 'user_role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Sent At' },
  ]

  const historyData = history.map((item) => ({
    title: item.title,
    content: item.content.length > 60 ? item.content.slice(0, 60) + '…' : item.content,
    user_name: item.user_name || item.user_id.slice(0, 8) + '…',
    user_role: item.user_role || '—',
    status: item.status,
    created_at: item.created_at,
  }))

  const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'sent', label: 'Sent' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'read', label: 'Read' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Notifications</h1>
        <p className="mt-1 text-sm text-brand-600">Broadcast and targeted push notifications</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-brand-200">
        {(['Broadcast', 'Targeted'] as MainTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              mainTab === tab
                ? 'border-b-2 border-accent-600 text-accent-700'
                : 'text-brand-500 hover:text-brand-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Targeted composer ─────────────────────────────────────────────── */}
      {mainTab === 'Targeted' && (
        <div className="space-y-6 max-w-xl">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-brand-900">Targeted Notification</h2>
            <p className="mb-4 text-sm text-brand-600">
              Filter by role and status to reach a specific segment. Preview recipient count before sending.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Role filter</label>
                <select
                  className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
                  value={tRole}
                  onChange={e => { setTRole(e.target.value); setTPreviewCount(null) }}
                >
                  <option value="">All roles</option>
                  <option value="customer">Customers only</option>
                  <option value="driver">Drivers only</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tActiveOnly}
                  onChange={e => { setTActiveOnly(e.target.checked); setTPreviewCount(null) }}
                  className="h-4 w-4 rounded border-brand-300 text-accent-600"
                />
                <span className="text-sm text-brand-700">Active accounts only</span>
              </label>
              <Button variant="secondary" size="sm" onClick={previewSegment} disabled={tPreviewLoading}>
                {tPreviewLoading ? 'Loading…' : 'Preview recipient count'}
              </Button>
              {tPreviewCount !== null && (
                <p className="text-sm font-medium text-brand-700">
                  Estimated recipients: <span className="text-accent-700">{tPreviewCount}</span>
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Title</label>
                <input
                  className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
                  placeholder="Notification title"
                  value={tTitle}
                  onChange={e => setTTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Message</label>
                <textarea
                  className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-400"
                  rows={4}
                  placeholder="Notification body"
                  value={tBody}
                  onChange={e => setTBody(e.target.value)}
                />
              </div>
              {tResult && (
                <p className={`text-sm font-medium ${tResult.success ? 'text-green-700' : 'text-red-600'}`}>
                  {tResult.message}
                </p>
              )}
              <Button
                variant="primary"
                onClick={handleTargetedSend}
                disabled={!tTitle.trim() || !tBody.trim() || tSending}
              >
                {tSending ? 'Sending…' : 'Send Targeted Notification'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Broadcast composer ─────────────────────────────────────────────── */}
      {mainTab === 'Broadcast' && <Card>
        <h2 className="mb-4 text-lg font-semibold text-brand-900">New Broadcast</h2>

        <div className="space-y-4">
          {/* Target audience */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-700">Target Audience</label>
            <div className="flex flex-wrap gap-2">
              {TARGET_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={target === opt.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setTarget(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Specific user search (only when target=specific) */}
          {target === 'specific' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-700">
                Search & Select Users
              </label>
              <input
                type="text"
                placeholder="Search by name or phone…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-xl border border-brand-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              {isSearchingUsers && (
                <p className="mt-1 text-xs text-brand-500">Searching…</p>
              )}
              {userSearchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-brand-100">
                  {userSearchResults.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-brand-50 px-3 py-2 text-sm last:border-0 hover:bg-brand-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleUserSelection(u.id)}
                        className="h-4 w-4 rounded border-brand-300 text-brand-700 focus:ring-brand-500"
                      />
                      <div>
                        <span className="font-medium text-brand-900">{u.full_name || 'Unknown'}</span>
                        <span className="ml-2 text-brand-500">
                          {u.phone_number} · {u.role}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selectedUserIds.length > 0 && (
                <p className="mt-1 text-xs text-brand-600">
                  {selectedUserIds.length} user(s) selected
                </p>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-700">Title</label>
            <input
              type="text"
              placeholder="Notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              className="w-full rounded-xl border border-brand-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-700">Message Body</label>
            <textarea
              placeholder="Write your notification message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-brand-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-700">
              Schedule (optional)
            </label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            {!scheduleAt && (
              <span className="ml-3 text-xs text-brand-500">Leave empty to send immediately</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 border-t border-brand-100 pt-4">
            <Button
              onClick={() => setShowPreview(true)}
              variant="secondary"
              disabled={!title.trim() || !body.trim() || (target === 'specific' && selectedUserIds.length === 0)}
            >
              Preview
            </Button>
            <Button
              onClick={handleSend}
              isLoading={isSending}
              disabled={!title.trim() || !body.trim() || (target === 'specific' && selectedUserIds.length === 0)}
            >
              {scheduleAt ? 'Schedule' : 'Send Now'}
            </Button>
          </div>

          {/* Result message */}
          {sendResult && (
            <div
              className={`rounded-xl px-4 py-2 text-sm ${
                sendResult.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {sendResult.message}
            </div>
          )}
        </div>
      </Card>}

      {/* ── History Card ───────────────────────────────────────────────── */}
      {mainTab === 'Broadcast' && <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-900">
            Send History
            <span className="ml-2 text-sm font-normal text-brand-500">({historyTotal} total)</span>
          </h2>
          <div className="flex gap-2">
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={historyStatusFilter === opt.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setHistoryStatusFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoadingHistory && history.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        ) : history.length === 0 ? (
          <p className="py-8 text-center text-sm text-brand-500">No notifications sent yet.</p>
        ) : (
          <>
            <Table columns={historyColumns} data={historyData} />
            {history.length < historyTotal && (
              <div className="mt-4 text-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadHistory(false)}
                  isLoading={isLoadingHistory}
                >
                  Load More ({historyTotal - history.length} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>}

      {/* ── Preview Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Preview Notification"
        onConfirm={handleSend}
        confirmText={scheduleAt ? 'Schedule' : 'Send Now'}
        isConfirmLoading={isSending}
      >
        <div className="space-y-3">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-brand-500">Target</span>
            <p className="text-sm text-brand-900">
              {TARGET_OPTIONS.find((o) => o.value === target)?.label || target}
              {target === 'specific' && ` (${selectedUserIds.length} user(s))`}
            </p>
          </div>
          {scheduleAt && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-brand-500">Scheduled</span>
              <p className="text-sm text-brand-900">{formatDateTime(scheduleAt)}</p>
            </div>
          )}
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <h3 className="font-semibold text-brand-900">{title || '(no title)'}</h3>
            <p className="mt-2 text-sm text-brand-700">{body || '(no body)'}</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
