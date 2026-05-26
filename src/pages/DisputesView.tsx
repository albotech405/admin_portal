import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { Table } from '../components/Table'
import { Modal } from '../components/Modal'
import { supabaseService, DisputeItem, DisputeActionResponse } from '../services/supabaseService'

const DISPUTE_STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Driver Charged', value: 'driver_charged' },
  { label: 'Dismissed', value: 'dismissed' },
  { label: 'Escalated', value: 'escalated' },
] as const

const DISPUTE_REASON_LABELS: Record<string, string> = {
  'didnt_take_optimal_route': "Didn't take optimal route",
  'fare_incorrect': 'Fare incorrect',
  'driver_no_show': 'Driver no-show',
  'customer_no_show': 'Customer no-show',
  'safety_incident': 'Safety incident',
  'vehicle_different': 'Vehicle different from listing',
}

const DISPUTE_STATUS_BADGE: Record<string, string> = {
  open: 'warning',
  refunded: 'success',
  driver_charged: 'danger',
  dismissed: 'neutral',
  escalated: 'info',
}

type ActionType = 'refund' | 'charge-driver' | 'dismiss' | 'escalate' | null

export const DisputesView: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Action confirmation modal state
  const [confirmAction, setConfirmAction] = useState<ActionType>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [actionResult, setActionResult] = useState<string | null>(null)

  const loadDisputes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await supabaseService.getDisputes(statusFilter)
      setDisputes(data.disputes || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load disputes')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadDisputes()
  }, [loadDisputes])

  const handleRowClick = (row: any) => {
    const dispute = disputes.find((d) => d.ride_id === row.ride_id)
    if (dispute) {
      setSelectedDispute(dispute)
      setActionResult(null)
    }
  }

  const handleAction = async () => {
    if (!selectedDispute || !confirmAction) return

    setActionLoading(selectedDispute.ride_id)
    setActionResult(null)

    let result: DisputeActionResponse | null = null
    const rideId = selectedDispute.ride_id
    const notes = actionNotes.trim() || undefined

    switch (confirmAction) {
      case 'refund':
        result = await supabaseService.refundDispute(rideId, notes)
        break
      case 'charge-driver':
        result = await supabaseService.chargeDriverDispute(rideId, notes)
        break
      case 'dismiss':
        result = await supabaseService.dismissDispute(rideId, notes)
        break
      case 'escalate':
        result = await supabaseService.escalateDispute(rideId, notes)
        break
    }

    setActionLoading(null)
    setConfirmAction(null)
    setActionNotes('')

    if (result) {
      setActionResult(result.message || 'Action completed successfully')

      // Send push notification to the relevant party
      const dispute = selectedDispute
      if (dispute) {
        const raisedByCustomer = dispute.dispute_raised_by === 'customer'
        const raisedByDriver = dispute.dispute_raised_by === 'driver'
        const notifyCustomer = (title: string, message: string) => {
          if (dispute.customer_id) supabaseService.sendTargetedNotification({ user_ids: [dispute.customer_id], title, message }).catch(() => {})
        }
        const notifyDriver = (title: string, message: string) => {
          if (dispute.driver_id) supabaseService.sendTargetedNotification({ user_ids: [dispute.driver_id], title, message }).catch(() => {})
        }
        switch (confirmAction) {
          case 'refund':
            notifyCustomer('Dispute Resolved – Refund Issued', 'Your dispute has been reviewed and a refund has been issued to your account.')
            break
          case 'charge-driver':
            notifyDriver('Dispute Resolution – Charge Applied', 'A dispute raised against you has been resolved. A charge has been applied to your account.')
            break
          case 'dismiss':
            if (raisedByCustomer) notifyCustomer('Dispute Closed', 'Your dispute has been reviewed and dismissed by our team.')
            else if (raisedByDriver) notifyDriver('Dispute Closed', 'Your dispute has been reviewed and dismissed by our team.')
            break
          case 'escalate':
            if (raisedByCustomer) notifyCustomer('Dispute Escalated', 'Your dispute has been escalated for further review. Our team will be in touch.')
            else if (raisedByDriver) notifyDriver('Dispute Escalated', 'Your dispute has been escalated for further review. Our team will be in touch.')
            break
        }
      }

      // Refresh the list and update selected dispute
      await loadDisputes()
      // Update selected dispute status locally
      setSelectedDispute((prev) =>
        prev && prev.ride_id === rideId
          ? { ...prev, dispute_status: result!.dispute_status, dispute_notes: notes || prev.dispute_notes }
          : prev
      )
    } else {
      setActionResult('Action failed. Please try again.')
    }
  }

  const openConfirmModal = (action: ActionType) => {
    setConfirmAction(action)
    setActionNotes('')
  }

  const formatDisputeReason = (reason?: string | null): string => {
    if (!reason) return '—'
    return DISPUTE_REASON_LABELS[reason] || reason.replace(/_/g, ' ')
  }

  const formatDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleString('en-US', {
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

  const formatPrice = (price: number): string => {
    return `CDF ${price.toLocaleString()}`
  }

  const tableData = disputes.map((d) => ({
    ride_id: d.ride_id,
    customer: d.customer_name || d.customer_phone || d.customer_id,
    driver: d.driver_name || d.driver_phone || d.driver_id || '—',
    reason: formatDisputeReason(d.dispute_reason),
    raised_by: d.dispute_raised_by === 'customer' ? 'Customer' : d.dispute_raised_by === 'driver' ? 'Driver' : '—',
    price: formatPrice(d.price ?? 0),
    status: (
      <Badge status={(DISPUTE_STATUS_BADGE[d.dispute_status] || 'neutral') as any}>
        {d.dispute_status.replace(/_/g, ' ')}
      </Badge>
    ),
    raised_at: formatDateTime(d.dispute_raised_at),
  }))

  const actionLabels: Record<NonNullable<ActionType>, string> = {
    refund: 'Issue Refund',
    'charge-driver': 'Charge Driver Fee',
    dismiss: 'Dismiss Dispute',
    escalate: 'Escalate to Super Admin',
  }

  const actionDescriptions: Record<NonNullable<ActionType>, string> = {
    refund:
      'Mark this dispute as refunded. Since payments are handled out-of-system, process the actual refund manually and record it here.',
    'charge-driver':
      'Deduct a fee from the driver\'s wallet credit balance as a penalty for this dispute.',
    dismiss: 'Dismiss this dispute. The trip stands as-is with no action taken.',
    escalate:
      'Escalate this dispute to a Super Admin for further review and resolution.',
  }

  const isOpen = selectedDispute?.dispute_status === 'open'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Disputes & Refunds</h1>
          <p className="mt-1 text-sm text-brand-600">
            Queue of trips flagged by customers or drivers as disputed
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === undefined ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setStatusFilter(undefined)}
        >
          All
        </Button>
        {DISPUTE_STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Disputes Table */}
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
          ) : disputes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-brand-500">No disputed trips found</p>
              <p className="mt-1 text-xs text-brand-400">
                {statusFilter
                  ? `No disputes with status "${statusFilter.replace(/_/g, ' ')}"`
                  : 'All clear — no open disputes at this time'}
              </p>
            </div>
          ) : (
            <Table
              columns={[
                { key: 'ride_id', label: 'Ride ID' },
                { key: 'customer', label: 'Customer' },
                { key: 'driver', label: 'Driver' },
                { key: 'reason', label: 'Reason' },
                { key: 'raised_by', label: 'Raised By' },
                { key: 'price', label: 'Price' },
                { key: 'status', label: 'Status' },
                { key: 'raised_at', label: 'Date' },
              ]}
              data={tableData}
              onRowClick={handleRowClick}
            />
          )}
        </Card>

        {/* Detail Panel */}
        {selectedDispute ? (
          <Card className="border-l-4 border-l-brand-500">
            {/* Action Result Banner */}
            {actionResult && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-medium text-green-800">{actionResult}</p>
              </div>
            )}

            {/* Dispute Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-900">
                  Dispute — {selectedDispute.ride_id.slice(0, 8)}...
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <Badge status={(DISPUTE_STATUS_BADGE[selectedDispute.dispute_status] || 'neutral') as any}>
                    {selectedDispute.dispute_status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-brand-500">
                    Raised {formatDateTime(selectedDispute.dispute_raised_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Trip Info */}
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-brand-50 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Customer</p>
                <p className="mt-0.5 text-sm font-medium text-brand-900">
                  {selectedDispute.customer_name || '—'}
                </p>
                {selectedDispute.customer_phone && (
                  <p className="text-xs text-brand-500">{selectedDispute.customer_phone}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Driver</p>
                <p className="mt-0.5 text-sm font-medium text-brand-900">
                  {selectedDispute.driver_name || '—'}
                </p>
                {selectedDispute.driver_phone && (
                  <p className="text-xs text-brand-500">{selectedDispute.driver_phone}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Price</p>
                <p className="mt-0.5 text-sm font-medium text-brand-900">
                  {formatPrice(selectedDispute.price ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Trip Status</p>
                <p className="mt-0.5 text-sm font-medium text-brand-900">
                  {selectedDispute.status?.replace(/_/g, ' ') ?? '—'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Dispute Reason</p>
                <p className="mt-0.5 text-sm font-medium text-brand-900">
                  {formatDisputeReason(selectedDispute.dispute_reason)}
                </p>
              </div>
              {selectedDispute.dispute_notes && (
                <div className="col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Notes</p>
                  <p className="mt-0.5 text-sm text-brand-700">{selectedDispute.dispute_notes}</p>
                </div>
              )}
              {selectedDispute.dispute_resolved_at && (
                <div className="col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Resolved At</p>
                  <p className="mt-0.5 text-sm text-brand-700">
                    {formatDateTime(selectedDispute.dispute_resolved_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons — only show for open disputes */}
            {isOpen ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-brand-700">Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openConfirmModal('refund')}
                    isLoading={actionLoading === selectedDispute.ride_id && confirmAction === 'refund'}
                  >
                    Issue Refund
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openConfirmModal('charge-driver')}
                    isLoading={
                      actionLoading === selectedDispute.ride_id && confirmAction === 'charge-driver'
                    }
                  >
                    Charge Driver
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openConfirmModal('dismiss')}
                    isLoading={actionLoading === selectedDispute.ride_id && confirmAction === 'dismiss'}
                  >
                    Dismiss
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openConfirmModal('escalate')}
                    isLoading={actionLoading === selectedDispute.ride_id && confirmAction === 'escalate'}
                  >
                    Escalate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-brand-50 p-3">
                <p className="text-center text-sm text-brand-500">
                  This dispute has been resolved ({selectedDispute.dispute_status.replace(/_/g, ' ')})
                </p>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-sm font-medium text-brand-500">Select a dispute</p>
                <p className="mt-1 text-xs text-brand-400">
                  Click on a row to view details and take action
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={confirmAction !== null}
        onClose={() => {
          setConfirmAction(null)
          setActionNotes('')
        }}
        title={confirmAction ? actionLabels[confirmAction] : ''}
        onConfirm={handleAction}
        confirmText="Confirm"
        isConfirmLoading={actionLoading !== null}
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-600">
            {confirmAction ? actionDescriptions[confirmAction] : ''}
          </p>

          {selectedDispute && (
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-xs text-brand-500">
                Ride: <span className="font-medium text-brand-700">{selectedDispute.ride_id}</span>
              </p>
              <p className="mt-1 text-xs text-brand-500">
                Reason:{' '}
                <span className="font-medium text-brand-700">
                  {formatDisputeReason(selectedDispute.dispute_reason)}
                </span>
              </p>
              {confirmAction === 'charge-driver' && selectedDispute.driver_name && (
                <p className="mt-1 text-xs text-brand-500">
                  Driver:{' '}
                  <span className="font-medium text-brand-700">{selectedDispute.driver_name}</span>
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-brand-500">
              Notes (optional)
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-brand-200 p-2 text-sm focus:border-brand-500 focus:outline-none"
              rows={3}
              placeholder="Add any notes about this action..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
