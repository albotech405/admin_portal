import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Table, Badge } from '../components'
import { ExchangeRate, supabaseService, TransactionItem } from '../services/supabaseService'

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'Orange Money', label: 'Orange Money' },
  { value: 'M-Pesa', label: 'M-Pesa' },
  { value: 'Airtel Money', label: 'Airtel Money' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'ride_payment', label: 'Ride Payments' },
  { value: 'topup', label: 'Wallet Topups' },
]

const TRANSACTION_COLUMNS = [
  { key: 'id', label: 'Transaction ID' },
  { key: 'type', label: 'Type' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'driver_name', label: 'Driver' },
  { key: 'amount', label: 'Amount (CDF)' },
  { key: 'method', label: 'Method' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Date' },
]

const PAGE_SIZE = 50

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStatusBadge(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'completed':
    case 'approved':
      return 'success'
    case 'pending':
    case 'in_progress':
      return 'warning'
    case 'cancelled':
    case 'rejected':
    case 'failed':
      return 'error'
    case 'driver_en_route':
    case 'arrived':
      return 'info'
    default:
      return 'neutral'
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'ride_payment':
      return 'Ride'
    case 'topup':
      return 'Topup'
    case 'refund':
      return 'Refund'
    case 'commission':
      return 'Commission'
    default:
      return type
  }
}

function getMethodLabel(method?: string | null): string {
  if (!method || method === 'unknown') return '—'
  return method
}

function exportToCsv(transactions: TransactionItem[]): void {
  const headers = [
    'Transaction ID',
    'Type',
    'Trip ID',
    'Customer Name',
    'Customer Phone',
    'Driver Name',
    'Driver Phone',
    'Amount (CDF)',
    'Commission',
    'Payment Method',
    'Status',
    'Category',
    'Distance (km)',
    'Duration (min)',
    'Has Refund',
    'Created At',
    'Completed At',
  ]

  const rows = transactions.map((t) => [
    t.id,
    getTypeLabel(t.type),
    t.trip_id || '',
    t.customer_name || '',
    t.customer_phone || '',
    t.driver_name || '',
    t.driver_phone || '',
    formatAmount(t.amount),
    t.platform_commission_amount != null ? formatAmount(t.platform_commission_amount) : '',
    getMethodLabel(t.method),
    t.status,
    t.category || '',
    t.distance_km != null ? String(t.distance_km) : '',
    t.duration_minutes != null ? String(t.duration_minutes) : '',
    t.has_refund ? 'Yes' : 'No',
    formatDateTime(t.created_at),
    formatDateTime(t.completed_at),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `transactions_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Component ──────────────────────────────────────────────────────────────

export const FinanceView: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [hasRefund, setHasRefund] = useState(false)
  const [search, setSearch] = useState('')

  // Pagination
  const [offset, setOffset] = useState(0)
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null)

  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null)
  const [showRateForm, setShowRateForm] = useState(false)
  const [newRate, setNewRate] = useState('')
  const [newRateEffective, setNewRateEffective] = useState('')
  const [isSavingRate, setIsSavingRate] = useState(false)

  // Locked drivers state
  const [lockedDrivers, setLockedDrivers] = useState<Array<{ driver_id: string; full_name?: string; credit_balance?: number; locked_at?: string }>>([])
  const [showLockedDrivers, setShowLockedDrivers] = useState(false)

  useEffect(() => {
    supabaseService.getExchangeRate().then(r => setExchangeRate(r)).catch(() => {})
  }, [])

  const loadLockedDrivers = async () => {
    try {
      const data = await supabaseService.getLockedDrivers()
      setLockedDrivers(data as any[])
      setShowLockedDrivers(true)
    } catch { /* ignore */ }
  }

  const handleSaveExchangeRate = async () => {
    if (!newRate || isNaN(parseFloat(newRate))) return
    setIsSavingRate(true)
    try {
      await supabaseService.setExchangeRate(parseFloat(newRate), newRateEffective || undefined)
      setExchangeRate({
        rate_cdf_per_usd: parseFloat(newRate),
        source: 'manual',
        effective_from: newRateEffective || undefined,
        created_at: new Date().toISOString(),
      })
      setShowRateForm(false)
      setNewRate('')
      setNewRateEffective('')
    } catch { /* ignore */ } finally { setIsSavingRate(false) }
  }

  const loadTransactions = useCallback(async (resetOffset = true) => {
    setIsLoading(true)
    setError(null)

    const currentOffset = resetOffset ? 0 : offset

    try {
      const params: { limit: number; offset: number; status?: string; method?: string; type?: string; date_from?: string; date_to?: string; amount_min?: number; amount_max?: number; has_refund?: boolean; search?: string } = {
        limit: PAGE_SIZE,
        offset: currentOffset,
      }
      if (statusFilter) params.status = statusFilter
      if (methodFilter) params.method = methodFilter
      if (typeFilter) params.type = typeFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (amountMin) params.amount_min = Number(amountMin)
      if (amountMax) params.amount_max = Number(amountMax)
      if (hasRefund) params.has_refund = true
      if (search.trim()) params.search = search.trim()

      const response = await supabaseService.getTransactions(params)
      setTransactions(response.transactions)
      setTotal(response.total)
      if (resetOffset) setOffset(0)
    } catch (err) {
      console.error('Failed to load transactions:', err)
      setError('Failed to load transactions. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, methodFilter, typeFilter, dateFrom, dateTo, amountMin, amountMax, hasRefund, search, offset])

  useEffect(() => {
    loadTransactions(true)
  }, [statusFilter, methodFilter, typeFilter, dateFrom, dateTo, amountMin, amountMax, hasRefund])

  const handleSearch = () => {
    loadTransactions(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleExportCsv = () => {
    // Export all matching transactions (not just current page)
    // We fetch all with current filters but no pagination
    setIsLoading(true)
    const params: { limit: number; offset: number; status?: string; method?: string; type?: string; date_from?: string; date_to?: string; amount_min?: number; amount_max?: number; has_refund?: boolean; search?: string } = { limit: 500, offset: 0 }
    if (statusFilter) params.status = statusFilter
    if (methodFilter) params.method = methodFilter
    if (typeFilter) params.type = typeFilter
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (amountMin) params.amount_min = Number(amountMin)
    if (amountMax) params.amount_max = Number(amountMax)
    if (hasRefund) params.has_refund = true
    if (search.trim()) params.search = search.trim()

    supabaseService
      .getTransactions(params)
      .then((response) => {
        exportToCsv(response.transactions)
      })
      .catch((err) => {
        console.error('Failed to export transactions:', err)
        setError('Failed to export transactions.')
      })
      .finally(() => setIsLoading(false))
  }

  const tableData = transactions.map((t) => ({
    id: t.id.slice(0, 8) + '…',
    type: (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        t.type === 'ride_payment'
          ? 'bg-blue-100 text-blue-700'
          : t.type === 'topup'
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-700'
      }`}>
        {getTypeLabel(t.type)}
      </span>
    ),
    customer_name: t.type === 'topup' ? '—' : (t.customer_name || '—'),
    driver_name: t.driver_name || '—',
    amount: (
      <span className="font-mono font-medium text-brand-950">
        {formatAmount(t.amount)} CDF
      </span>
    ),
    method: getMethodLabel(t.method),
    status: <Badge status={getStatusBadge(t.status)}>{t.status}</Badge>,
    created_at: formatDateTime(t.created_at),
    _raw: t,
  }))

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-brand-950">Transaction Browser</h1>
        <p className="mt-2 max-w-3xl text-brand-600">
          Browse, filter, and export all financial transactions including ride payments and wallet topups.
        </p>
      </div>

      {/* Exchange rate card */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Exchange Rate (USD → CDF)</h2>
              <p className="mt-2 text-3xl font-bold text-slate-950">{exchangeRate ? `1 USD = ${exchangeRate.rate_cdf_per_usd.toLocaleString()} CDF` : '—'}</p>
              {exchangeRate?.created_at && <p className="mt-1 text-xs text-slate-400">Updated: {new Date(exchangeRate.created_at).toLocaleString()}</p>}
            </div>
            <Button size="sm" variant="secondary" onClick={() => { setShowRateForm(v => !v); setNewRate(exchangeRate?.rate_cdf_per_usd.toString() || '') }}>Edit</Button>
          </div>
          {showRateForm && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">New Rate (CDF per USD) *</label>
                <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="e.g. 2800"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Effective From (optional)</label>
                <input type="datetime-local" value={newRateEffective} onChange={e => setNewRateEffective(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={handleSaveExchangeRate} isLoading={isSavingRate} disabled={!newRate} className="flex-1">Save Rate</Button>
                <Button size="sm" variant="secondary" onClick={() => setShowRateForm(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Locked Drivers (low balance)</h2>
              <p className="mt-1 text-xs text-slate-400">Drivers locked from going online due to insufficient wallet balance</p>
            </div>
            <Button size="sm" variant="secondary" onClick={loadLockedDrivers}>Load</Button>
          </div>
          {showLockedDrivers && (
            lockedDrivers.length === 0
              ? <p className="text-sm text-slate-400">No locked drivers currently.</p>
              : <div className="space-y-2 max-h-40 overflow-y-auto">
                {lockedDrivers.map((d, i) => (
                  <div key={d.driver_id || i} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm">
                    <div>
                      <span className="font-semibold text-slate-900">{d.full_name || d.driver_id}</span>
                      {d.credit_balance != null && <span className="ml-2 text-xs text-red-600">{d.credit_balance.toLocaleString()} CDF</span>}
                    </div>
                    {d.locked_at && <span className="text-xs text-slate-400">{new Date(d.locked_at).toLocaleDateString()}</span>}
                  </div>
                ))}
              </div>
          )}
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-500">
              Search
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="ID, customer, driver…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <Button onClick={handleSearch} size="sm">
                Go
              </Button>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Method */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-500">
              Payment Method
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-500">
              Transaction Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-500">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-500">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Amount Min */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-500">
              Min Amount (CDF)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Amount Max */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-500">
              Max Amount (CDF)
            </label>
            <input
              type="number"
              min="0"
              placeholder="999999"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Has Refund checkbox + Export */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-700">
            <input
              type="checkbox"
              checked={hasRefund}
              onChange={(e) => setHasRefund(e.target.checked)}
              className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
            />
            Has refund / dispute
          </label>

          <div className="flex items-center gap-3">
            <span className="text-sm text-brand-500">
              {total} transaction{total !== 1 ? 's' : ''}
            </span>
            <Button onClick={handleExportCsv} variant="secondary" size="sm" isLoading={isLoading}>
              <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {/* Transaction Table */}
      <Card>
        {isLoading ? (
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
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-brand-500">
            <p className="text-lg font-medium">No transactions found</p>
            <p className="mt-1 text-sm">Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <Table
              columns={TRANSACTION_COLUMNS}
              data={tableData}
              onRowClick={(row: any) => setSelectedTx(row._raw)}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-brand-100 pt-4">
                <span className="text-sm text-brand-500">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => {
                      const newOffset = Math.max(0, offset - PAGE_SIZE)
                      setOffset(newOffset)
                      loadTransactions(false)
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={offset + PAGE_SIZE >= total}
                    onClick={() => {
                      const newOffset = offset + PAGE_SIZE
                      setOffset(newOffset)
                      loadTransactions(false)
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Transaction Detail Panel */}
      {selectedTx && (
        <Card className="border-l-4 border-l-brand-500">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-brand-950">
              Transaction Detail
            </h2>
            <button
              onClick={() => setSelectedTx(null)}
              className="rounded-lg p-1 text-brand-400 hover:bg-brand-100 hover:text-brand-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Transaction ID</p>
              <p className="mt-1 font-mono text-sm text-brand-950">{selectedTx.id}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Type</p>
              <p className="mt-1 text-sm text-brand-950">{getTypeLabel(selectedTx.type)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Trip ID</p>
              <p className="mt-1 font-mono text-sm text-brand-950">{selectedTx.trip_id || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Customer</p>
              <p className="mt-1 text-sm text-brand-950">{selectedTx.customer_name || '—'}</p>
              {selectedTx.customer_phone && (
                <p className="text-xs text-brand-500">{selectedTx.customer_phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Driver</p>
              <p className="mt-1 text-sm text-brand-950">{selectedTx.driver_name || '—'}</p>
              {selectedTx.driver_phone && (
                <p className="text-xs text-brand-500">{selectedTx.driver_phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Amount</p>
              <p className="mt-1 font-mono text-lg font-bold text-brand-950">
                {formatAmount(selectedTx.amount)} CDF
              </p>
              {selectedTx.platform_commission_amount != null && (
                <p className="text-xs text-brand-500">
                  Commission: {formatAmount(selectedTx.platform_commission_amount)} CDF
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Payment Method</p>
              <p className="mt-1 text-sm text-brand-950">{getMethodLabel(selectedTx.method)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Status</p>
              <p className="mt-1">
                <Badge status={getStatusBadge(selectedTx.status)}>{selectedTx.status}</Badge>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Category</p>
              <p className="mt-1 text-sm text-brand-950">{selectedTx.category || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Distance</p>
              <p className="mt-1 text-sm text-brand-950">
                {selectedTx.distance_km != null ? `${selectedTx.distance_km} km` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Duration</p>
              <p className="mt-1 text-sm text-brand-950">
                {selectedTx.duration_minutes != null ? `${selectedTx.duration_minutes} min` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Has Refund</p>
              <p className="mt-1 text-sm text-brand-950">
                {selectedTx.has_refund ? (
                  <span className="text-red-600">Yes</span>
                ) : (
                  'No'
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Created At</p>
              <p className="mt-1 text-sm text-brand-950">{formatDateTime(selectedTx.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Completed At</p>
              <p className="mt-1 text-sm text-brand-950">{formatDateTime(selectedTx.completed_at)}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
