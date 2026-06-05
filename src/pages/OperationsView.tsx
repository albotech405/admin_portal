import React, { useState, useEffect } from 'react'
import { Button, Modal, DocumentPreview } from '../components'
import { Driver, DriverDocument, DriverDocumentUploadInput, PaymentRequest, supabaseService } from '../services/supabaseService'

type Tab = 'driver_approval' | 'payments' | 'add_driver' | 'add_customer'

const formatDocType = (type: string) =>
  type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const getFileType = (url: string): 'image' | 'pdf' => {
  const path = url.toLowerCase().split('?')[0]
  return path.endsWith('.pdf') ? 'pdf' : 'image'
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-700',
  not_started: 'bg-gray-100 text-gray-700',
}

const DRIVER_DOCUMENT_FIELDS = [
  { type: 'national_id', label: 'National ID' },
  { type: 'selfie_with_id', label: 'Selfie With ID' },
  { type: 'drivers_license', label: "Driver's License" },
  { type: 'vehicle_registration', label: 'Vehicle Registration' },
  { type: 'insurance', label: 'Insurance' },
  { type: 'profile_photo', label: 'Profile Photo' },
  { type: 'vehicle_photo_front', label: 'Vehicle Photo Front' },
  { type: 'vehicle_photo_back', label: 'Vehicle Photo Back' },
  { type: 'vehicle_photo_left', label: 'Vehicle Photo Left' },
  { type: 'vehicle_photo_right', label: 'Vehicle Photo Right' },
] as const

type DriverDocumentFieldType = typeof DRIVER_DOCUMENT_FIELDS[number]['type']

const createEmptyDriverDocuments = (): Record<DriverDocumentFieldType, File | null> => ({
  national_id: null,
  selfie_with_id: null,
  drivers_license: null,
  vehicle_registration: null,
  insurance: null,
  profile_photo: null,
  vehicle_photo_front: null,
  vehicle_photo_back: null,
  vehicle_photo_left: null,
  vehicle_photo_right: null,
})

// ─── Driver Approval Tab ───────────────────────────────────────────────────

const DriverApprovalTab: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null)
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null)
  const [docRejectReason, setDocRejectReason] = useState('')

  useEffect(() => {
    loadDrivers()
  }, [filterStatus])

  const loadDrivers = async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getDrivers(filterStatus !== 'all' ? filterStatus : undefined)
      setDrivers(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drivers')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedDriver) return
    try {
      setIsProcessing(true)
      await supabaseService.approveDriver(selectedDriver.id)
      supabaseService.sendTargetedNotification({
        user_ids: [selectedDriver.user_id],
        title: 'Application Approved',
        message: 'Your driver application has been approved. You can now start accepting rides.',
      }).catch(() => {})
      setDrivers(drivers.filter((d) => d.id !== selectedDriver.id))
      setSelectedDriver(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve driver')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedDriver) return
    try {
      setIsProcessing(true)
      await supabaseService.rejectDriver(selectedDriver.id, rejectReason)
      supabaseService.sendTargetedNotification({
        user_ids: [selectedDriver.user_id],
        title: 'Application Not Approved',
        message: `Your application was not approved. ${rejectReason ? 'Reason: ' + rejectReason : 'Please contact support.'}`,
      }).catch(() => {})
      setDrivers(drivers.filter((d) => d.id !== selectedDriver.id))
      setSelectedDriver(null)
      setShowRejectModal(false)
      setRejectReason('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject driver')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveDoc = async (doc: DriverDocument) => {
    if (!selectedDriver) return
    setDocActionLoading(doc.id)
    try {
      await supabaseService.approveDocument(selectedDriver.id, doc.id)
      setSelectedDriver((prev) =>
        prev ? { ...prev, documents: prev.documents?.map((d) => d.id === doc.id ? { ...d, status: 'approved' as const } : d) } : null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve document')
    } finally {
      setDocActionLoading(null)
    }
  }

  const handleRejectDoc = async (doc: DriverDocument) => {
    if (!selectedDriver || !docRejectReason.trim()) return
    setDocActionLoading(doc.id)
    try {
      await supabaseService.rejectDocument(selectedDriver.id, doc.id, docRejectReason)
      setSelectedDriver((prev) =>
        prev ? { ...prev, documents: prev.documents?.map((d) => d.id === doc.id ? { ...d, status: 'rejected' as const } : d) } : null
      )
      setRejectingDocId(null)
      setDocRejectReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject document')
    } finally {
      setDocActionLoading(null)
    }
  }

  if (selectedDriver) {
    return (
      <div>
        <button
          className="mb-4 flex items-center gap-2 text-sm text-blue-600 hover:underline"
          onClick={() => setSelectedDriver(null)}
        >
          ← Back to list
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{selectedDriver.full_name}</h2>
              <p className="text-sm text-slate-500">{selectedDriver.phone_number}</p>
              <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${statusColor[selectedDriver.verification_status] ?? 'bg-gray-100 text-gray-700'}`}>
                {selectedDriver.verification_status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex gap-2">
              {selectedDriver.verification_status !== 'approved' && (
                <Button variant="primary" size="sm" onClick={handleApprove} disabled={isProcessing}>
                  Approve Driver
                </Button>
              )}
              <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)} disabled={isProcessing}>
                Reject
              </Button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6">
            <h3 className="mb-3 font-medium text-slate-700">Documents</h3>
            {!selectedDriver.documents?.length ? (
              <p className="text-sm text-slate-400">No documents uploaded.</p>
            ) : (
              <div className="space-y-3">
                {selectedDriver.documents.map((doc) => (
                  <div key={doc.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-800">{formatDocType(doc.document_type)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[doc.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {doc.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                        >
                          {expandedDocId === doc.id ? 'Hide' : 'View'}
                        </button>
                        {doc.status !== 'approved' && (
                          <button
                            className="text-xs font-medium text-green-600 hover:underline"
                            onClick={() => handleApproveDoc(doc)}
                            disabled={docActionLoading === doc.id}
                          >
                            Approve
                          </button>
                        )}
                        {doc.status !== 'rejected' && (
                          <button
                            className="text-xs font-medium text-red-500 hover:underline"
                            onClick={() => setRejectingDocId(rejectingDocId === doc.id ? null : doc.id)}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>

                    {expandedDocId === doc.id && (
                      <div className="mt-3">
                        <DocumentPreview fileUrl={doc.file_url} fileType={getFileType(doc.file_url)} />
                      </div>
                    )}

                    {rejectingDocId === doc.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                          placeholder="Rejection reason…"
                          value={docRejectReason}
                          onChange={(e) => setDocRejectReason(e.target.value)}
                        />
                        <button
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          disabled={!docRejectReason.trim() || docActionLoading === doc.id}
                          onClick={() => handleRejectDoc(doc)}
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Driver Application">
          <div className="space-y-4">
            <textarea
              className="w-full rounded-xl border border-slate-200 p-3 text-sm"
              rows={3}
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleReject} disabled={isProcessing}>Reject</Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Driver Approval Queue</h2>
        <div className="flex gap-2">
          {['pending', 'under_review', 'approved', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : drivers.length === 0 ? (
        <p className="text-sm text-slate-400">No drivers in this queue.</p>
      ) : (
        <div className="space-y-3">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              onClick={() => setSelectedDriver(driver)}
            >
              <div>
                <p className="font-medium text-slate-900">{driver.full_name ?? 'Unknown'}</p>
                <p className="text-sm text-slate-500">{driver.phone_number} · {driver.vehicle_type}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[driver.verification_status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {driver.verification_status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-slate-400">
                  {driver.documents?.length ?? 0} doc{driver.documents?.length !== 1 ? 's' : ''}
                </span>
                <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Payments Tab ──────────────────────────────────────────────────────────

const PaymentsTab: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<PaymentRequest | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showProof, setShowProof] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getPaymentRequests('pending')
      setPayments(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selected) return
    try {
      setIsProcessing(true)
      await supabaseService.approvePaymentRequest(selected.id)
      supabaseService.sendTargetedNotification({
        user_ids: [selected.driver_id],
        title: 'Wallet Top-up Approved',
        message: `Your wallet top-up of ${selected.amount.toLocaleString()} CDF has been approved.`,
      }).catch(() => {})
      setPayments(payments.filter((p) => p.id !== selected.id))
      setSelected(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve payment')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selected) return
    try {
      setIsProcessing(true)
      await supabaseService.rejectPaymentRequest(selected.id, rejectReason)
      supabaseService.sendTargetedNotification({
        user_ids: [selected.driver_id],
        title: 'Wallet Top-up Rejected',
        message: `Your top-up was rejected. ${rejectReason ? 'Reason: ' + rejectReason : ''}`,
      }).catch(() => {})
      setPayments(payments.filter((p) => p.id !== selected.id))
      setSelected(null)
      setShowRejectModal(false)
      setRejectReason('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject payment')
    } finally {
      setIsProcessing(false)
    }
  }

  if (selected) {
    return (
      <div>
        <button className="mb-4 flex items-center gap-2 text-sm text-blue-600 hover:underline" onClick={() => setSelected(null)}>
          ← Back to list
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{selected.full_name ?? selected.sender_name ?? 'Driver'}</h2>
              <p className="text-sm text-slate-500">{selected.phone_number}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{selected.amount.toLocaleString()} CDF</p>
              <p className="text-sm text-slate-500">{selected.payment_method?.replace(/_/g, ' ')} · {selected.reference_number ?? 'No ref'}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleApprove} disabled={isProcessing}>Approve</Button>
              <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)} disabled={isProcessing}>Reject</Button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {selected.proof_image_url && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-slate-700">Payment Proof</h3>
                <button className="text-xs text-blue-600 hover:underline" onClick={() => setShowProof(!showProof)}>
                  {showProof ? 'Hide' : 'View proof'}
                </button>
              </div>
              {showProof && (
                <DocumentPreview
                  fileUrl={selected.proof_image_url}
                  fileType={selected.proof_image_url.toLowerCase().includes('.pdf') ? 'pdf' : 'image'}
                />
              )}
            </div>
          )}
        </div>

        <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Payment Request">
          <div className="space-y-4">
            <textarea
              className="w-full rounded-xl border border-slate-200 p-3 text-sm"
              rows={3}
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleReject} disabled={isProcessing}>Reject</Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Pending Payment Approvals</h2>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-slate-400">No pending payment requests.</p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              onClick={() => setSelected(p)}
            >
              <div>
                <p className="font-medium text-slate-900">{p.full_name ?? p.sender_name ?? 'Driver'}</p>
                <p className="text-sm text-slate-500">{p.payment_method?.replace(/_/g, ' ')} · {p.reference_number ?? '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">{p.amount.toLocaleString()} CDF</span>
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">pending</span>
                <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Add Driver Tab ────────────────────────────────────────────────────────

const AddDriverTab: React.FC = () => {
  const [form, setForm] = useState({
    full_name: '', phone_number: '', email: '',
    license_number: '', license_expiry: '', vehicle_type: 'car',
  })
  const [documents, setDocuments] = useState<Record<DriverDocumentFieldType, File | null>>(createEmptyDriverDocuments())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleDocumentChange = (documentType: DriverDocumentFieldType, fileList: FileList | null) => {
    setDocuments((prev) => ({
      ...prev,
      [documentType]: fileList?.[0] ?? null,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.phone_number.trim() || !form.license_number.trim() || !form.license_expiry) {
      setError('Please fill in all required fields.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const driver = await supabaseService.createDriver({
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        email: form.email.trim() || undefined,
        license_number: form.license_number.trim(),
        license_expiry: form.license_expiry,
        vehicle_type: form.vehicle_type,
      })

      const selectedDocuments = Object.entries(documents)
        .filter(([, file]) => file instanceof File)
        .map(([documentType, file]) => ({ documentType, file })) as DriverDocumentUploadInput[]

      if (selectedDocuments.length > 0) {
        await supabaseService.uploadDriverDocuments(driver.id, selectedDocuments)
      }

      setSuccess(
        selectedDocuments.length > 0
          ? `Driver created and ${selectedDocuments.length} document${selectedDocuments.length === 1 ? '' : 's'} uploaded for review.`
          : 'Driver created successfully. You can upload documents later from the approval queue.'
      )
      setForm({ full_name: '', phone_number: '', email: '', license_number: '', license_expiry: '', vehicle_type: 'car' })
      setDocuments(createEmptyDriverDocuments())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create driver')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Add New Driver</h2>
      {success && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {success}
          <button className="ml-3 underline" onClick={() => setSuccess(null)}>Add another</button>
        </div>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-700">Full Name *</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jean Dupont" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-700">Phone Number *</label>
            <input name="phone_number" value={form.phone_number} onChange={handleChange} required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+243812345678" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-700">Email</label>
            <input name="email" value={form.email} onChange={handleChange} type="email"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="driver@example.com" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-700">Vehicle Type *</label>
            <select name="vehicle_type" value={form.vehicle_type} onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="tuk_tuk">Tuk-Tuk</option>
              <option value="minibus">Minibus</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-700">License Number *</label>
            <input name="license_number" value={form.license_number} onChange={handleChange} required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="DL-12345678" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-700">License Expiry *</label>
            <input name="license_expiry" value={form.license_expiry} onChange={handleChange} type="date" required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Driver Documents</h3>
            <p className="mt-1 text-xs text-slate-500">Upload KYC and vehicle files now so the new driver lands in the review queue with documents attached.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {DRIVER_DOCUMENT_FIELDS.map((field) => (
              <div key={field.type}>
                <label className="block mb-1 text-sm font-medium text-slate-700">{field.label}</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleDocumentChange(field.type, e.target.files)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
                {documents[field.type] && (
                  <p className="mt-1 truncate text-xs text-slate-500">{documents[field.type]?.name}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Driver Account'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Add Customer Tab ──────────────────────────────────────────────────────

const AddCustomerTab: React.FC = () => {
  const [form, setForm] = useState({ full_name: '', phone_number: '', email: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.phone_number.trim()) {
      setError('Full name and phone number are required.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await supabaseService.createCustomer({
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        email: form.email.trim() || undefined,
      })
      setSuccess(true)
      setForm({ full_name: '', phone_number: '', email: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Add New Customer</h2>
      {success && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Customer created successfully. They will receive an OTP to activate their account.
          <button className="ml-3 underline" onClick={() => setSuccess(false)}>Add another</button>
        </div>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 text-sm font-medium text-slate-700">Full Name *</label>
          <input name="full_name" value={form.full_name} onChange={handleChange} required
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Marie Kabila" />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-slate-700">Phone Number *</label>
          <input name="phone_number" value={form.phone_number} onChange={handleChange} required
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+243812345678" />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-slate-700">Email</label>
          <input name="email" value={form.email} onChange={handleChange} type="email"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="customer@example.com" />
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Customer Account'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'driver_approval', label: 'Driver Approval', desc: 'Review KYC and approve/reject drivers' },
  { id: 'payments', label: 'Payments', desc: 'Verify and approve wallet top-up requests' },
  { id: 'add_driver', label: 'Add Driver', desc: 'Manually register a new driver' },
  { id: 'add_customer', label: 'Add Customer', desc: 'Manually register a new customer' },
]

export const OperationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('driver_approval')

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Operations</h1>
        <p className="mt-1 text-slate-500">Driver approvals, payment verification, and user management</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-xl px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        {activeTab === 'driver_approval' && <DriverApprovalTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'add_driver' && <AddDriverTab />}
        {activeTab === 'add_customer' && <AddCustomerTab />}
      </div>
    </div>
  )
}
