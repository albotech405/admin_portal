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

  const tableColumns = [
    { key: 'driver_name', label: 'Driver' },
    { key: 'amount', label: 'Amount', width: 'w-24' },
    { key: 'payment_method', label: 'Method', width: 'w-32' },
    { key: 'reference_number', label: 'Reference', width: 'w-36' },
    { key: 'status', label: 'Status', width: 'w-24' },
    { key: 'submitted_at', label: 'Date', width: 'w-32' },
  ]

  if (!showDetailView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Verification</h1>
          <p className="text-gray-600 mt-2">
            Review and approve pending payment requests from drivers
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Pending Requests ({payments.length})
            </h2>
            <Button variant="secondary" size="sm" onClick={loadPayments}>
              Refresh
            </Button>
          </div>
          <Table
            columns={tableColumns}
            data={payments.map((p: PaymentRequest) => ({
              ...p,
              driver_name: p.full_name || p.phone_number || p.driver_id,
              amount: `$${p.amount}`,
              reference_number: p.reference_number || 'Pending',
            }))}
            onRowClick={(row: any) => {
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

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Details</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-lg">
            Driver: {selectedPayment.full_name || selectedPayment.phone_number || selectedPayment.driver_id}
          </span>
          <Badge status={selectedPayment.status}>
            {selectedPayment.status.charAt(0).toUpperCase() +
              selectedPayment.status.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Document Preview */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Payment Proof</h2>
            <DocumentPreview
              fileUrl={selectedPayment.proof_image_url}
              fileType={getProofType(selectedPayment.proof_image_url)}
              fileName={`proof-${selectedPayment.id}`}
            />
          </Card>
        </div>

        {/* Right: Details and Actions */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Request Details</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${selectedPayment.amount}
                </p>
              </div>
              <div className="border-t pt-3">
                <p className="text-gray-600">Driver Phone</p>
                <p className="font-semibold">{selectedPayment.phone_number || 'N/A'}</p>
              </div>
              <div className="border-t pt-3">
                <p className="text-gray-600">Payment Method</p>
                <p className="font-semibold">{selectedPayment.payment_method}</p>
              </div>
              <div className="border-t pt-3">
                <p className="text-gray-600">Sender Name</p>
                <p className="font-semibold">{selectedPayment.sender_name || 'N/A'}</p>
              </div>
              <div className="border-t pt-3">
                <p className="text-gray-600">Reference Number</p>
                <p className="font-semibold font-mono">
                  {selectedPayment.reference_number || 'Pending assignment'}
                </p>
              </div>
              <div className="border-t pt-3">
                <p className="text-gray-600">Submitted Date</p>
                <p className="font-semibold">
                  {new Date(selectedPayment.submitted_at).toLocaleDateString()}
                </p>
              </div>
              {selectedPayment.notes && (
                <div className="border-t pt-3">
                  <p className="text-gray-600">Notes</p>
                  <p className="text-sm">{selectedPayment.notes}</p>
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
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Please provide a reason for rejecting this payment request.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={4}
            required
          />
        </div>
      </Modal>
    </div>
  )
}
