import React, { useState, useEffect } from 'react'
import { Card, Button, Modal, Badge, Table, DocumentPreview } from '../components'
import { Driver, DriverDocument, supabaseService } from '../services/supabaseService'

const getFileType = (url: string): 'image' | 'pdf' => {
  const path = url.toLowerCase().split('?')[0]
  return path.endsWith('.pdf') ? 'pdf' : 'image'
}

const formatDocType = (type: string) =>
  type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const DriverApproval: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [showDetailView, setShowDetailView] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null)
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null)
  const [docRejectReason, setDocRejectReason] = useState('')
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  const [showAddDriverModal, setShowAddDriverModal] = useState(false)
  const [addDriverForm, setAddDriverForm] = useState({
    full_name: '', phone_number: '', email: '',
    license_number: '', license_expiry: '', vehicle_type: 'car',
  })
  const [addDriverError, setAddDriverError] = useState<string | null>(null)
  const [isAddingDriver, setIsAddingDriver] = useState(false)

  useEffect(() => {
    loadDrivers()
  }, [filterStatus])

  const loadDrivers = async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getDrivers(
        filterStatus !== 'all' ? filterStatus : undefined
      )
      setDrivers(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drivers')
      console.error(err)
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
        message: 'Congratulations! Your driver application has been approved. You can now start accepting rides.',
      }).catch(() => {})
      setDrivers(drivers.filter((d: Driver) => d.id !== selectedDriver.id))
      setShowDetailView(false)
      setSelectedDriver(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve driver')
      console.error(err)
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
        message: `Your driver application was not approved. ${rejectReason ? 'Reason: ' + rejectReason : 'Please contact support for more details.'}`,
      }).catch(() => {})
      setDrivers(drivers.filter((d: Driver) => d.id !== selectedDriver.id))
      setShowDetailView(false)
      setSelectedDriver(null)
      setShowRejectModal(false)
      setRejectReason('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject driver')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSuspend = async () => {
    if (!selectedDriver) return
    try {
      setIsProcessing(true)
      await supabaseService.suspendDriver(selectedDriver.id, suspendReason)
      supabaseService.sendTargetedNotification({
        user_ids: [selectedDriver.user_id],
        title: 'Account Suspended',
        message: `Your driver account has been suspended. ${suspendReason ? 'Reason: ' + suspendReason : 'Please contact support for more details.'}`,
      }).catch(() => {})
      setSelectedDriver((prev) => prev ? { ...prev, verification_status: 'suspended', is_suspended: true } : null)
      setSuspendReason('')
      setShowSuspendModal(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend driver')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnsuspend = async () => {
    if (!selectedDriver) return
    try {
      setIsProcessing(true)
      await supabaseService.unsuspendDriver(selectedDriver.id)
      supabaseService.sendTargetedNotification({
        user_ids: [selectedDriver.user_id],
        title: 'Account Reinstated',
        message: 'Your driver account has been reinstated. You can now go online and accept rides.',
      }).catch(() => {})
      setSelectedDriver((prev) => prev ? { ...prev, verification_status: 'approved', is_suspended: false } : null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reinstate driver')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveDocument = async (doc: DriverDocument) => {
    if (!selectedDriver) return
    setDocActionLoading(doc.id)
    try {
      await supabaseService.approveDocument(selectedDriver.id, doc.id)
      setSelectedDriver((prev) =>
        prev ? {
          ...prev,
          documents: prev.documents?.map((d) =>
            d.id === doc.id ? { ...d, status: 'approved' as const } : d
          ),
        } : null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve document')
    } finally {
      setDocActionLoading(null)
    }
  }

  const handleRejectDocument = async (doc: DriverDocument) => {
    if (!selectedDriver || !docRejectReason.trim()) return
    setDocActionLoading(doc.id)
    try {
      await supabaseService.rejectDocument(selectedDriver.id, doc.id, docRejectReason)
      setSelectedDriver((prev) =>
        prev ? {
          ...prev,
          documents: prev.documents?.map((d) =>
            d.id === doc.id ? { ...d, status: 'rejected' as const } : d
          ),
        } : null
      )
      setRejectingDocId(null)
      setDocRejectReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject document')
    } finally {
      setDocActionLoading(null)
    }
  }

  const handleAddDriver = async () => {
    const f = addDriverForm
    if (!f.full_name.trim() || !f.phone_number.trim() || !f.license_number.trim() || !f.license_expiry) return
    setIsAddingDriver(true)
    setAddDriverError(null)
    try {
      await supabaseService.createDriver({
        full_name: f.full_name.trim(),
        phone_number: f.phone_number.trim(),
        email: f.email.trim() || undefined,
        license_number: f.license_number.trim(),
        license_expiry: f.license_expiry,
        vehicle_type: f.vehicle_type,
      })
      setShowAddDriverModal(false)
      setAddDriverForm({ full_name: '', phone_number: '', email: '', license_number: '', license_expiry: '', vehicle_type: 'car' })
      void loadDrivers()
    } catch (err) {
      setAddDriverError(err instanceof Error ? err.message : 'Failed to create driver')
    } finally {
      setIsAddingDriver(false)
    }
  }

  const openDriverDetail = async (driverId: string) => {
    try {
      setIsLoading(true)
      const driver = await supabaseService.getDriverDetail(driverId)
      setSelectedDriver(driver)
      setShowDetailView(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load driver details')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  type DriverRow = Driver & { full_name_fmt: string; phone_fmt: string; submitted_fmt: string }

  const tableColumns: Array<{ key: string; label: string; width?: string; render?: (value: unknown, row: DriverRow) => React.ReactNode }> = [
    { key: 'full_name_fmt', label: 'Name' },
    { key: 'phone_fmt', label: 'Phone', width: 'w-36' },
    { key: 'license_number', label: 'License', width: 'w-32' },
    {
      key: 'verification_status',
      label: 'Status',
      width: 'w-32',
      render: (value) => {
        const s = String(value)
        const label = s === 'under_review' ? 'Under Review' : s.charAt(0).toUpperCase() + s.slice(1)
        return <Badge status={s}>{label}</Badge>
      },
    },
    { key: 'submitted_fmt', label: 'Submitted', width: 'w-28' },
  ]

  if (!showDetailView) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-950">Driver Management</h1>
            <p className="text-brand-600 mt-2">
              Approve, reject, suspend and reinstate driver accounts
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => { setAddDriverError(null); setShowAddDriverModal(true) }}>+ Add Driver</Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card>
          <div className="flex justify-between items-center mb-4 gap-4">
            <div className="flex flex-wrap gap-2">
              {['pending', 'under_review', 'approved', 'rejected', 'suspended'].map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {status === 'under_review' ? 'Under Review' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={loadDrivers}>
              Refresh
            </Button>
          </div>
          <Table
            columns={tableColumns}
            data={drivers.map((d: Driver): DriverRow => ({
              ...d,
              full_name_fmt: d.full_name || '—',
              phone_fmt: d.phone_number || '—',
              submitted_fmt: d.submitted_at ? new Date(d.submitted_at).toLocaleDateString() : '—',
            }))}
            onRowClick={(row) => {
              const driver = drivers.find((d) => d.id === row.id)
              if (driver) {
                void openDriverDetail(driver.id)
              }
            }}
            isLoading={isLoading}
          />
        </Card>

        <Modal
          isOpen={showAddDriverModal}
          title="Add New Driver"
          onClose={() => setShowAddDriverModal(false)}
          onConfirm={handleAddDriver}
          confirmText="Create & Send OTP"
          isConfirmLoading={isAddingDriver}
          confirmDisabled={
            !addDriverForm.full_name.trim() || !addDriverForm.phone_number.trim() ||
            !addDriverForm.license_number.trim() || !addDriverForm.license_expiry
          }
        >
          <div className="space-y-3">
            {addDriverError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{addDriverError}</div>}
            <p className="text-xs text-slate-500">The driver will receive an OTP on their phone to log in for the first time.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={addDriverForm.full_name} onChange={e => setAddDriverForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Moussa Diop"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone <span className="text-red-500">*</span></label>
                <input type="tel" value={addDriverForm.phone_number} onChange={e => setAddDriverForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="+221 77 000 0000"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email (optional)</label>
                <input type="email" value={addDriverForm.email} onChange={e => setAddDriverForm(f => ({ ...f, email: e.target.value }))} placeholder="driver@example.com"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">License Number <span className="text-red-500">*</span></label>
                <input type="text" value={addDriverForm.license_number} onChange={e => setAddDriverForm(f => ({ ...f, license_number: e.target.value }))} placeholder="e.g. SN-123456"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">License Expiry <span className="text-red-500">*</span></label>
                <input type="date" value={addDriverForm.license_expiry} onChange={e => setAddDriverForm(f => ({ ...f, license_expiry: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle Type <span className="text-red-500">*</span></label>
                <select value={addDriverForm.vehicle_type} onChange={e => setAddDriverForm(f => ({ ...f, vehicle_type: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="car">Car</option>
                  <option value="moto">Moto</option>
                  <option value="tuk_tuk">Tuk-Tuk</option>
                  <option value="van">Van</option>
                  <option value="suv">SUV</option>
                </select>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // Detail view
  if (!selectedDriver) return null

  return (
    <div className="space-y-6">
      <button
        onClick={() => {
          setShowDetailView(false)
          setSelectedDriver(null)
        }}
        className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
      >
        ← Back to List
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-950">
            {selectedDriver.full_name || 'Unknown Driver'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {selectedDriver.phone_number && (
              <span className="text-brand-600">{selectedDriver.phone_number}</span>
            )}
            <Badge status={selectedDriver.verification_status}>
              {selectedDriver.verification_status === 'under_review'
                ? 'Under Review'
                : selectedDriver.verification_status.charAt(0).toUpperCase() +
                  selectedDriver.verification_status.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Driver Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Full Name</p>
                <p className="font-semibold">{selectedDriver.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Phone Number</p>
                <p className="font-semibold">{selectedDriver.phone_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">License Number</p>
                <p className="font-semibold">{selectedDriver.license_number}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">License Expiry</p>
                <p className="font-semibold">
                  {new Date(selectedDriver.license_expiry).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Address</p>
                <p className="font-semibold">{selectedDriver.address || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Member Since</p>
                <p className="font-semibold">
                  {new Date(selectedDriver.created_at).toLocaleDateString()}
                </p>
              </div>
              {selectedDriver.submitted_at && (
                <div>
                  <p className="text-gray-600 text-sm">Submitted At</p>
                  <p className="font-semibold">
                    {new Date(selectedDriver.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              {selectedDriver.activation_date && (
                <div>
                  <p className="text-gray-600 text-sm">Activated At</p>
                  <p className="font-semibold">
                    {new Date(selectedDriver.activation_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {selectedDriver.verification_feedback && (
                <div className="col-span-2">
                  <p className="text-gray-600 text-sm">Feedback</p>
                  <p className="font-semibold text-blue-700">
                    {selectedDriver.verification_feedback}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {selectedDriver.vehicle && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Vehicle Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Vehicle Type</p>
                  <p className="font-semibold">{selectedDriver.vehicle.vehicle_type}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">License Plate</p>
                  <p className="font-semibold font-mono">
                    {selectedDriver.vehicle.license_plate}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Make & Model</p>
                  <p className="font-semibold">
                    {selectedDriver.vehicle.make} {selectedDriver.vehicle.model}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Year</p>
                  <p className="font-semibold">{selectedDriver.vehicle.year}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Color</p>
                  <p className="font-semibold">{selectedDriver.vehicle.color}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Capacity</p>
                  <p className="font-semibold">
                    {selectedDriver.vehicle.passenger_capacity || 'N/A'} passengers
                  </p>
                </div>
              </div>
            </Card>
          )}

          {selectedDriver.documents && selectedDriver.documents.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4 text-brand-950">Documents</h2>
              <div className="space-y-3">
                {selectedDriver.documents.map((doc) => {
                  const isExpanded = expandedDocId === doc.id
                  const fileType = getFileType(doc.file_url)
                  const isThisDocRejecting = rejectingDocId === doc.id
                  const isThisDocLoading = docActionLoading === doc.id
                  const canAct = doc.status === 'pending' || doc.status === 'under_review'
                  return (
                    <div key={doc.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                      {/* Header row */}
                      <button
                        onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-brand-950">{formatDocType(doc.document_type)}</span>
                          <Badge status={doc.status}>{doc.status.replace(/_/g, ' ')}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={doc.file_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-700 text-xs font-semibold"
                          >
                            Download
                          </a>
                          <svg className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Inline preview + actions */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-200 space-y-4">
                          <DocumentPreview fileUrl={doc.file_url} fileType={fileType} fileName={formatDocType(doc.document_type)} />

                          {canAct && (
                            <div className="space-y-3">
                              {!isThisDocRejecting ? (
                                <div className="flex gap-3">
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleApproveDocument(doc)}
                                    isLoading={isThisDocLoading}
                                    className="flex-1"
                                  >
                                    ✓ Approve Document
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => { setRejectingDocId(doc.id); setDocRejectReason('') }}
                                    disabled={isThisDocLoading}
                                    className="flex-1"
                                  >
                                    ✕ Reject Document
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <textarea
                                    value={docRejectReason}
                                    onChange={(e) => setDocRejectReason(e.target.value)}
                                    placeholder="Rejection reason (required)…"
                                    rows={2}
                                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                  />
                                  <div className="flex gap-2">
                                    <Button variant="danger" size="sm" onClick={() => handleRejectDocument(doc)} isLoading={isThisDocLoading} disabled={!docRejectReason.trim()} className="flex-1">
                                      Confirm Reject
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => setRejectingDocId(null)} disabled={isThisDocLoading} className="flex-1">
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right: Actions and Stats */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold mb-4 text-brand-950">Driver Stats</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Rating</p>
                <p className="text-3xl font-bold text-amber-500">
                  {selectedDriver.rating.toFixed(1)} ⭐
                </p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-slate-500">Total Trips</p>
                <p className="text-2xl font-bold text-brand-950">{selectedDriver.total_trips}</p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-slate-500">Wallet Balance</p>
                <p className={`text-2xl font-bold ${(selectedDriver.credit_balance ?? 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {(selectedDriver.credit_balance ?? 0).toLocaleString()} CDF
                </p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-slate-500">Online Status</p>
                <p className="text-lg font-bold">
                  {selectedDriver.is_online ? '🟢 Online' : '⚫ Offline'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-3">
            {(selectedDriver.verification_status === 'pending' ||
              selectedDriver.verification_status === 'under_review') && (
              <>
                <Button variant="success" onClick={handleApprove} isLoading={isProcessing} className="w-full">
                  ✓ Approve Driver
                </Button>
                <Button variant="danger" onClick={() => setShowRejectModal(true)} disabled={isProcessing} className="w-full">
                  ✕ Reject Driver
                </Button>
              </>
            )}
            {selectedDriver.verification_status === 'approved' && !selectedDriver.is_suspended && (
              <Button variant="warning" onClick={() => setShowSuspendModal(true)} disabled={isProcessing} className="w-full">
                ⊘ Suspend Driver
              </Button>
            )}
            {(selectedDriver.verification_status === 'suspended' || selectedDriver.is_suspended) && (
              <Button variant="success" onClick={handleUnsuspend} isLoading={isProcessing} className="w-full">
                ↑ Reinstate Driver
              </Button>
            )}
          </Card>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        title="Reject Driver Application"
        onClose={() => { setShowRejectModal(false); setRejectReason('') }}
        onConfirm={handleReject}
        confirmText="Reject"
        confirmVariant="danger"
        isConfirmLoading={isProcessing}
        confirmDisabled={!rejectReason.trim()}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Provide a reason for rejecting this driver application. The driver will be notified.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason…"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            rows={4}
          />
          {!rejectReason.trim() && <p className="text-xs text-red-500">A reason is required.</p>}
        </div>
      </Modal>

      {/* Suspend Modal */}
      <Modal
        isOpen={showSuspendModal}
        title="Suspend Driver"
        onClose={() => { setShowSuspendModal(false); setSuspendReason('') }}
        onConfirm={handleSuspend}
        confirmText="Suspend"
        confirmVariant="warning"
        isConfirmLoading={isProcessing}
        confirmDisabled={!suspendReason.trim()}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Provide a reason for suspending this driver. The driver will be notified immediately.
          </p>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Enter suspension reason…"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            rows={4}
          />
          {!suspendReason.trim() && <p className="text-xs text-red-500">A reason is required.</p>}
        </div>
      </Modal>
    </div>
  )
}
