import React, { useState, useEffect } from 'react'
import { Card, Button, Modal, Badge, DocumentPreview, Table } from '../components'
import { PaymentRequest, supabaseService } from '../services/supabaseService'

const getProofType = (fileUrl?: string): 'image' | 'pdf' => {
  if (!fileUrl) return 'image'
  return fileUrl.toLowerCase().includes('.pdf') ? 'pdf' : 'image'
}

export const PaymentVerification: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(
    null
  )
  const [showDetailView, setShowDetailView] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getPaymentRequests('pending')
      setPayments(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment requests')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedPayment) return

    try {
      setIsProcessing(true)
      await supabaseService.approvePaymentRequest(selectedPayment.id)
      supabaseService.sendTargetedNotification({
        user_ids: [selectedPayment.driver_id],
        title: 'Wallet Top-up Approved',
        message: `Your wallet top-up of ${selectedPayment.amount.toLocaleString()} CDF has been approved and credited to your account.`,
      }).catch(() => {})
      // Remove from list
      setPayments(payments.filter((p) => p.id !== selectedPayment.id))
      setShowDetailView(false)
      setSelectedPayment(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve payment request')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedPayment) return

    try {
      setIsProcessing(true)
      await supabaseService.rejectPaymentRequest(selectedPayment.id, rejectReason)
      supabaseService.sendTargetedNotification({
        user_ids: [selectedPayment.driver_id],
        title: 'Wallet Top-up Rejected',
        message: `Your wallet top-up request was rejected. ${rejectReason ? 'Reason: ' + rejectReason : 'Please contact support for more details.'}`,
      }).catch(() => {})
      // Remove from list
      setPayments(payments.filter((p) => p.id !== selectedPayment.id))
      setShowDetailView(false)
      setSelectedPayment(null)
      setShowRejectModal(false)
      setRejectReason('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject payment request')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  type PaymentRow = PaymentRequest & { driver_name: string; amount_fmt: string; ref_fmt: string; date_fmt: string }

  const tableColumns: Array<{ key: string; label: string; width?: string; render?: (value: unknown, row: PaymentRow) => React.ReactNode }> = [
    { key: 'driver_name', label: 'Driver' },
    { key: 'amount_fmt', label: 'Amount', width: 'w-28' },
    { key: 'payment_method', label: 'Method', width: 'w-32' },
    { key: 'ref_fmt', label: 'Reference', width: 'w-36' },
    {
      key: 'proof_image_url',
      label: 'Proof',
      width: 'w-24',
      render: (_value, row) => {
        const url = row.proof_image_url
        if (!url) return <span className="text-slate-400 text-xs">—</span>
        const isPdf = url.toLowerCase().includes('.pdf')
        if (isPdf) return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            PDF
          </a>
        )
        return (
          <img
            src={url}
            alt="proof"
            className="h-10 w-14 rounded-lg border border-slate-200 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )
      },
    },
    { key: 'date_fmt', label: 'Date', width: 'w-32' },
  ]

  if (!showDetailView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-950">Payment Verification</h1>
          <p className="text-brand-600 mt-2">
            Review and approve pending wallet top-up requests from drivers
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-brand-950">
              Pending Requests ({payments.length})
            </h2>
            <Button variant="secondary" size="sm" onClick={loadPayments}>
              Refresh
            </Button>
          </div>
          <Table
            columns={tableColumns}
            data={payments.map((p: PaymentRequest): PaymentRow => ({
              ...p,
              driver_name: p.full_name || p.phone_number || p.driver_id,
              amount_fmt: `${p.amount.toLocaleString()} CDF`,
              ref_fmt: p.reference_number || '—',
              date_fmt: new Date(p.submitted_at).toLocaleDateString(),
            }))}
            onRowClick={(row) => {
              const payment = payments.find((p) => p.id === row.id)
              if (payment) {
                setSelectedPayment(payment)
                setShowDetailView(true)
              }
            }}
            isLoading={isLoading}
          />
        </Card>
      </div>
    )
  }

  // Detail view
  if (!selectedPayment) return null

  const driverName = selectedPayment.full_name || selectedPayment.phone_number || selectedPayment.driver_id

  return (
    <div className="space-y-6">
      <button
        onClick={() => {
          setShowDetailView(false)
          setSelectedPayment(null)
        }}
        className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
      >
        ← Back to List
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-950">Payment Details</h1>
          <p className="mt-1 text-brand-600">{driverName}</p>
        </div>
        <Badge status={selectedPayment.status}>
          {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
        </Badge>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Proof preview */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-brand-950">Payment Proof</h2>
            {selectedPayment.proof_image_url ? (
              <DocumentPreview
                fileUrl={selectedPayment.proof_image_url}
                fileType={getProofType(selectedPayment.proof_image_url)}
                fileName={`proof-${selectedPayment.id}`}
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400">
                No proof uploaded
              </div>
            )}
          </Card>
        </div>

        {/* Right: Driver info + actions */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-brand-950">Driver Info</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Name</p>
                <p className="font-semibold text-brand-950">{selectedPayment.full_name || '—'}</p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-slate-500">Phone</p>
                <p className="font-semibold text-brand-950">{selectedPayment.phone_number || '—'}</p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-slate-500">Sender Name</p>
                <p className="font-semibold text-brand-950">{selectedPayment.sender_name || '—'}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold text-brand-950">Request Details</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Amount</p>
                <p className="text-2xl font-bold text-green-600">{selectedPayment.amount.toLocaleString()} CDF</p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-slate-500">Payment Method</p>
                <p className="font-semibold capitalize text-brand-950">{selectedPayment.payment_method.replace(/_/g, ' ')}</p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-slate-500">Reference Number</p>
                <p className="font-mono font-semibold text-brand-950">{selectedPayment.reference_number || '—'}</p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-slate-500">Date Submitted</p>
                <p className="font-semibold text-brand-950">{new Date(selectedPayment.submitted_at).toLocaleString()}</p>
              </div>
              {selectedPayment.notes && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-slate-500">Notes</p>
                  <p className="text-brand-700">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="space-y-3">
            <Button
              variant="success"
              onClick={handleApprove}
              isLoading={isProcessing}
              className="w-full"
            >
              ✓ Approve
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowRejectModal(true)}
              disabled={isProcessing}
              className="w-full"
            >
              ✕ Reject
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showRejectModal}
        title="Reject Payment Request"
        onClose={() => {
          setShowRejectModal(false)
          setRejectReason('')
        }}
        onConfirm={handleReject}
        confirmText="Reject"
        confirmVariant="danger"
        isConfirmLoading={isProcessing}
        confirmDisabled={!rejectReason.trim()}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please provide a reason for rejecting this payment request. The driver will be notified.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason…"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            rows={4}
          />
          {!rejectReason.trim() && (
            <p className="text-xs text-red-500">A reason is required to reject.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
