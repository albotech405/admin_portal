import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Modal, Badge, Table, DocumentPreview } from '../components'
import { Driver, DriverDocument, supabaseService } from '../services/supabaseService'

// ── Constants ──────────────────────────────────────────────────────────────

const REJECTION_REASON_CHIPS = [
  'Document blurry / unreadable',
  'Document expired',
  'Name mismatch between document and profile',
  'License plate mismatch',
  'Wrong document type uploaded',
  "Photo doesn't show full document",
  "Selfie doesn't match license photo",
  'Gender mismatch — declared gender does not match the national ID document',
  'Vehicle does not meet category — no AC or vehicle year < 2015',
]

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'Standard',
  premium: 'Premium',
  lady_driver: 'Lady Driver',
}

const CATEGORY_MULTIPLIERS: Record<string, string> = {
  standard: '×1.00',
  premium: '×1.25',
  lady_driver: '×1.15',
}

const CATEGORY_BADGE: Record<string, string> = {
  standard: 'neutral',
  premium: 'info',
  lady_driver: 'warning',
}

const STATUS_TABS = ['pending', 'under_review', 'approved', 'rejected', 'suspended', 'all'] as const
type StatusTab = typeof STATUS_TABS[number]

const PROFILE_TABS = ['Overview', 'Documents', 'Vehicle', 'Payment Info', 'Trips', 'Earnings', 'Ratings', 'Compliance', 'Activity Log'] as const
type ProfileTab = typeof PROFILE_TABS[number]

const WARNING_CATEGORIES = ['rate_abuse', 'no_show', 'safety', 'payment_fraud', 'other'] as const

const getFileType = (url: string): 'image' | 'pdf' => {
  const path = url.toLowerCase().split('?')[0]
  return path.endsWith('.pdf') ? 'pdf' : 'image'
}

const formatDocType = (type: string) =>
  type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function docCompleteness(docs: DriverDocument[] | undefined): string {
  if (!docs || docs.length === 0) return '0/10'
  return `${Math.min(docs.length, 10)}/10`
}

function ageInQueue(submittedAt?: string): string {
  if (!submittedAt) return '—'
  const h = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 3600000)
  if (h < 1) return '< 1h'
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

// ── Main Component ─────────────────────────────────────────────────────────

export const DriverApproval: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<StatusTab>('pending')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [profileTab, setProfileTab] = useState<ProfileTab>('Overview')
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [tabData, setTabData] = useState<unknown[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendEndDate, setSuspendEndDate] = useState('')
  const [suspendAppealUrl, setSuspendAppealUrl] = useState('')
  const [suspendIndefinite, setSuspendIndefinite] = useState(false)

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categoryAction, setCategoryAction] = useState<'premium' | 'lady_driver' | 'standard'>('standard')
  const [categoryReason, setCategoryReason] = useState('')

  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [notes, setNotes] = useState<Array<{ id: string; note: string; created_at: string }>>([])

  const [showWarnModal, setShowWarnModal] = useState(false)
  const [warnCategory, setWarnCategory] = useState<typeof WARNING_CATEGORIES[number]>('other')
  const [warnMessage, setWarnMessage] = useState('')

  const [showBanModal, setShowBanModal] = useState(false)
  const [banReason, setBanReason] = useState('')

  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null)
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null)
  const [docRejectReason, setDocRejectReason] = useState('')

  const [showAddDriverModal, setShowAddDriverModal] = useState(false)
  const [addDriverForm, setAddDriverForm] = useState({
    full_name: '', phone_number: '', email: '',
    license_number: '', license_expiry: '', vehicle_type: 'car',
  })
  const [addDriverError, setAddDriverError] = useState<string | null>(null)
  const [isAddingDriver, setIsAddingDriver] = useState(false)

  useEffect(() => { loadDrivers() }, [filterStatus])

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

  const loadTabData = useCallback(async (tab: ProfileTab, driver: Driver) => {
    if (['Overview', 'Documents', 'Vehicle', 'Payment Info'].includes(tab)) return
    setTabLoading(true)
    setTabData([])
    try {
      if (tab === 'Trips') {
        const d = await supabaseService.getDriverTrips(driver.id)
        setTabData(d as unknown[])
      } else if (tab === 'Earnings') {
        const d = await supabaseService.getDriverEarnings(driver.id)
        setTabData(d.transactions as unknown[])
      } else if (tab === 'Ratings') {
        const d = await supabaseService.getDriverRatings(driver.id)
        setTabData(d.ratings as unknown[])
      } else if (tab === 'Compliance') {
        const d = await supabaseService.getDriverCompliance(driver.id)
        setTabData(d ? [d] : [])
      } else if (tab === 'Activity Log') {
        const d = await supabaseService.getDriverActivity(driver.id)
        setTabData(d)
      }
    } catch { setTabData([]) } finally { setTabLoading(false) }
  }, [])

  const loadNotes = useCallback(async (driverId: string) => {
    try {
      const n = await supabaseService.getDriverNotes(driverId)
      setNotes(n)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (selectedDriver && !['Overview', 'Documents', 'Vehicle', 'Payment Info'].includes(profileTab)) {
      loadTabData(profileTab, selectedDriver)
    }
  }, [profileTab, selectedDriver, loadTabData])

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!selectedDriver) return
    setIsProcessing(true)
    try {
      await supabaseService.approveDriver(selectedDriver.id)
      supabaseService.sendTargetedNotification({
        user_ids: [selectedDriver.user_id],
        title: 'Application Approved',
        message: 'Congratulations! Your driver application has been approved. You can now start accepting rides.',
      }).catch(() => {})
      setDrivers(drivers.filter(d => d.id !== selectedDriver.id))
      setSelectedDriver(prev => prev ? { ...prev, verification_status: 'approved' } : null)
      setError(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to approve driver') }
    finally { setIsProcessing(false) }
  }

  const handleReject = async () => {
    if (!selectedDriver || !rejectReason.trim()) return
    setIsProcessing(true)
    try {
      await supabaseService.rejectDriver(selectedDriver.id, rejectReason)
      supabaseService.sendTargetedNotification({
        user_ids: [selectedDriver.user_id],
        title: 'Application Not Approved',
        message: `Your driver application was not approved. Reason: ${rejectReason}`,
      }).catch(() => {})
      setDrivers(drivers.filter(d => d.id !== selectedDriver.id))
      setSelectedDriver(null)
      setShowRejectModal(false)
      setRejectReason('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to reject driver') }
    finally { setIsProcessing(false) }
  }

  const handleSuspend = async () => {
    if (!selectedDriver || !suspendReason.trim()) return
    setIsProcessing(true)
    try {
      await supabaseService.suspendDriver(selectedDriver.id, {
        reason: suspendReason,
        end_date: suspendIndefinite ? undefined : suspendEndDate || undefined,
        appeal_url: suspendAppealUrl || undefined,
      })
      supabaseService.sendTargetedNotification({
        user_ids: [selectedDriver.user_id],
        title: 'Account Suspended',
        message: `Your driver account has been suspended. Reason: ${suspendReason}${!suspendIndefinite && suspendEndDate ? ` This suspension ends on ${suspendEndDate}.` : ''}${suspendAppealUrl ? ` Appeal: ${suspendAppealUrl}` : ''}`,
      }).catch(() => {})
      setSelectedDriver(prev => prev ? { ...prev, verification_status: 'suspended', is_suspended: true } : null)
      setShowSuspendModal(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to suspend driver') }
    finally { setIsProcessing(false) }
  }

  const handleUnsuspend = async () => {
    if (!selectedDriver) return
    setIsProcessing(true)
    try {
      await supabaseService.unsuspendDriver(selectedDriver.id)
      supabaseService.sendTargetedNotification({
        user_ids: [selectedDriver.user_id],
        title: 'Account Reinstated',
        message: 'Your driver account has been reinstated. You can now go online and accept rides.',
      }).catch(() => {})
      setSelectedDriver(prev => prev ? { ...prev, verification_status: 'approved', is_suspended: false } : null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to reinstate driver') }
    finally { setIsProcessing(false) }
  }

  const handleCategoryGrant = async () => {
    if (!selectedDriver || !categoryReason.trim()) return
    setIsProcessing(true)
    try {
      await supabaseService.grantDriverCategory(selectedDriver.id, categoryAction, categoryReason)
      supabaseService.sendTargetedNotification({
        user_ids: [selectedDriver.user_id],
        title: `Category Updated: ${CATEGORY_LABELS[categoryAction]}`,
        message: `Your driver category has been updated to ${CATEGORY_LABELS[categoryAction]}. Reason: ${categoryReason}`,
      }).catch(() => {})
      setShowCategoryModal(false)
      setCategoryReason('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update category') }
    finally { setIsProcessing(false) }
  }

  const handleAddNote = async () => {
    if (!selectedDriver || !noteText.trim()) return
    setIsProcessing(true)
    try {
      await supabaseService.addDriverNote(selectedDriver.id, noteText)
      await loadNotes(selectedDriver.id)
      setNoteText('')
      setShowNoteModal(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to add note') }
    finally { setIsProcessing(false) }
  }

  const handleSendWarning = async () => {
    if (!selectedDriver || !warnMessage.trim()) return
    setIsProcessing(true)
    try {
      await supabaseService.sendWarningToUser({
        user_id: selectedDriver.user_id,
        user_type: 'driver',
        category: warnCategory,
        message: warnMessage,
      })
      setShowWarnModal(false)
      setWarnMessage('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to send warning') }
    finally { setIsProcessing(false) }
  }

  const handlePermanentBan = async () => {
    if (!selectedDriver || !banReason.trim()) return
    setIsProcessing(true)
    try {
      await supabaseService.permanentBanDriver(selectedDriver.id, banReason)
      setDrivers(drivers.filter(d => d.id !== selectedDriver.id))
      setSelectedDriver(null)
      setShowBanModal(false)
      setBanReason('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to ban driver') }
    finally { setIsProcessing(false) }
  }

  const handleForceOffline = async () => {
    if (!selectedDriver) return
    setIsProcessing(true)
    try {
      await supabaseService.forceOfflineDriver(selectedDriver.id)
      setSelectedDriver(prev => prev ? { ...prev, is_online: false } : null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to force driver offline') }
    finally { setIsProcessing(false) }
  }

  const handleForceLogout = async () => {
    if (!selectedDriver) return
    setIsProcessing(true)
    try { await supabaseService.forceLogoutDriver(selectedDriver.id) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to force logout') }
    finally { setIsProcessing(false) }
  }

  const handleApproveDocument = async (doc: DriverDocument) => {
    if (!selectedDriver) return
    setDocActionLoading(doc.id)
    try {
      await supabaseService.approveDocument(selectedDriver.id, doc.id)
      setSelectedDriver(prev => prev ? { ...prev, documents: prev.documents?.map(d => d.id === doc.id ? { ...d, status: 'approved' as const } : d) } : null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to approve document') }
    finally { setDocActionLoading(null) }
  }

  const handleRejectDocument = async (doc: DriverDocument) => {
    if (!selectedDriver || !docRejectReason.trim()) return
    setDocActionLoading(doc.id)
    try {
      await supabaseService.rejectDocument(selectedDriver.id, doc.id, docRejectReason)
      setSelectedDriver(prev => prev ? { ...prev, documents: prev.documents?.map(d => d.id === doc.id ? { ...d, status: 'rejected' as const } : d) } : null)
      setRejectingDocId(null)
      setDocRejectReason('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to reject document') }
    finally { setDocActionLoading(null) }
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
      loadDrivers()
    } catch (err) { setAddDriverError(err instanceof Error ? err.message : 'Failed to add driver') }
    finally { setIsAddingDriver(false) }
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────

  if (!selectedDriver) {
    const listCols = [
      { key: 'full_name', label: 'Driver' },
      { key: 'phone_number', label: 'Phone' },
      { key: 'vehicle_type', label: 'Vehicle' },
      { key: 'completeness', label: 'Docs' },
      { key: 'age_in_queue', label: 'Waiting' },
      { key: 'verification_status', label: 'Status' },
      { key: 'action', label: '' },
    ]
    const listData = drivers.map(d => ({
      full_name: d.full_name || '—',
      phone_number: d.phone_number || '—',
      vehicle_type: d.vehicle_type || '—',
      completeness: docCompleteness(d.documents),
      age_in_queue: ageInQueue(d.submitted_at),
      verification_status: <Badge status={d.verification_status as any}>{d.verification_status.replace(/_/g, ' ')}</Badge>,
      action: <Button size="sm" variant="secondary" onClick={() => { setSelectedDriver(d); setProfileTab('Overview'); setTabData([]); setNotes([]) }}>Review</Button>,
    }))

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Driver KYC Queue</h1>
            <p className="mt-1 text-slate-600">Review submissions, verify documents, grant categories.</p>
          </div>
          <Button variant="primary" onClick={() => setShowAddDriverModal(true)}>+ Add Driver</Button>
        </div>

        {error && <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(tab => (
            <button key={tab} onClick={() => setFilterStatus(tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${filterStatus === tab ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {tab.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <Card>
          <div className="mb-4"><p className="text-sm text-slate-500">{drivers.length} driver{drivers.length !== 1 ? 's' : ''}</p></div>
          <Table columns={listCols} data={listData} isLoading={isLoading} />
        </Card>

        <Modal isOpen={showAddDriverModal} title="Add Driver" onClose={() => setShowAddDriverModal(false)}
          onConfirm={handleAddDriver} confirmText="Add Driver" isConfirmLoading={isAddingDriver}
          confirmDisabled={!addDriverForm.full_name.trim() || !addDriverForm.phone_number.trim() || !addDriverForm.license_number.trim() || !addDriverForm.license_expiry}>
          <div className="space-y-4">
            {addDriverError && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{addDriverError}</div>}
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Jean Mukendi', span: true },
                { key: 'phone_number', label: 'Phone', type: 'tel', placeholder: '+243 81 000 0000', span: false },
                { key: 'email', label: 'Email (optional)', type: 'email', placeholder: 'driver@example.com', span: false },
                { key: 'license_number', label: 'License Number', type: 'text', placeholder: 'CD-123456', span: false },
                { key: 'license_expiry', label: 'License Expiry', type: 'date', placeholder: '', span: false },
              ].map(f => (
                <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(addDriverForm as any)[f.key]}
                    onChange={e => setAddDriverForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Vehicle Type</label>
                <select value={addDriverForm.vehicle_type} onChange={e => setAddDriverForm(prev => ({ ...prev, vehicle_type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                </select>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // ── PROFILE VIEW ──────────────────────────────────────────────────────────

  const isSuspended = selectedDriver.verification_status === 'suspended' || !!selectedDriver.is_suspended
  const isPending = selectedDriver.verification_status === 'pending' || selectedDriver.verification_status === 'under_review'
  const isApproved = selectedDriver.verification_status === 'approved'
  const currentCategory: string = (selectedDriver as any).category || 'standard'

  return (
    <div className="space-y-6">
      <button onClick={() => { setSelectedDriver(null); setError(null) }} className="text-sm font-semibold text-blue-600 hover:text-blue-700">← Back to Queue</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">{selectedDriver.full_name || 'Unknown Driver'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {selectedDriver.phone_number && <span className="text-slate-600">{selectedDriver.phone_number}</span>}
            <Badge status={selectedDriver.verification_status as any}>{selectedDriver.verification_status.replace(/_/g, ' ')}</Badge>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${selectedDriver.is_online ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {selectedDriver.is_online ? '● Online' : '○ Offline'}
            </span>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          {/* Profile tabs */}
          <div className="flex flex-wrap gap-1 border-b border-slate-200">
            {PROFILE_TABS.map(tab => (
              <button key={tab} onClick={() => setProfileTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${profileTab === tab ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {profileTab === 'Overview' && (
            <div className="space-y-4">
              <Card>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Driver Information</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    ['Full Name', selectedDriver.full_name || '—'],
                    ['Phone', selectedDriver.phone_number || '—'],
                    ['License No.', selectedDriver.license_number],
                    ['License Expiry', selectedDriver.license_expiry ? new Date(selectedDriver.license_expiry).toLocaleDateString() : '—'],
                    ['Joined', new Date(selectedDriver.created_at).toLocaleDateString()],
                    ['Total Trips', selectedDriver.total_trips],
                    ['Rating', `${selectedDriver.rating.toFixed(1)} ⭐`],
                    ['Wallet', `${(selectedDriver.credit_balance ?? 0).toLocaleString()} CDF`],
                  ].map(([k, v]) => (
                    <div key={String(k)}><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{String(v)}</dd></div>
                  ))}
                </dl>
              </Card>

              {/* §4.7 Category, gender & payment mini-section */}
              <Card className="border-l-4 border-l-blue-400">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Category, Gender & Payment (§4.7)</h3>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Category</p>
                    <Badge status={CATEGORY_BADGE[currentCategory] as any}>{CATEGORY_LABELS[currentCategory] || currentCategory} {CATEGORY_MULTIPLIERS[currentCategory] || ''}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Gender (declared)</p>
                    <span className="font-semibold capitalize">{(selectedDriver as any).gender || 'Not set'}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Mobile Money</p>
                    <span className="font-semibold capitalize">{(selectedDriver as any).mobile_money_provider || '—'}</span>
                  </div>
                  {currentCategory === 'lady_driver' && (
                    <div>
                      <p className="text-xs text-slate-500">Passenger Preference</p>
                      <span className="font-semibold">{(selectedDriver as any).passenger_preference === 'female_only' ? 'Female only' : 'Any passenger'}</span>
                    </div>
                  )}
                </div>
                {isApproved && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" onClick={() => { setCategoryAction('premium'); setCategoryReason(''); setShowCategoryModal(true) }} disabled={currentCategory === 'premium'}>↑ Grant Premium</Button>
                    <Button size="sm" variant="warning" onClick={() => { setCategoryAction('lady_driver'); setCategoryReason(''); setShowCategoryModal(true) }} disabled={currentCategory === 'lady_driver'}>♀ Grant Lady Driver</Button>
                    <Button size="sm" variant="secondary" onClick={() => { setCategoryAction('standard'); setCategoryReason(''); setShowCategoryModal(true) }} disabled={currentCategory === 'standard'}>↓ Demote to Standard</Button>
                  </div>
                )}
              </Card>

              {/* Internal notes */}
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Internal Notes (admin only)</h3>
                  <Button size="sm" variant="secondary" onClick={() => { loadNotes(selectedDriver.id); setShowNoteModal(true) }}>+ Note</Button>
                </div>
                {notes.length === 0
                  ? <p className="text-sm text-slate-400">No notes yet.</p>
                  : notes.map(n => (
                    <div key={n.id} className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-sm">
                      <p className="text-slate-800">{n.note}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
              </Card>
            </div>
          )}

          {/* DOCUMENTS */}
          {profileTab === 'Documents' && (
            <div className="space-y-4">
              <Card className="border border-blue-100 bg-blue-50">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700">Reviewer Checklist — Category, Gender & Payment</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-xs text-slate-500">Category</p><Badge status={CATEGORY_BADGE[currentCategory] as any}>{CATEGORY_LABELS[currentCategory] || currentCategory}</Badge></div>
                  <div><p className="text-xs text-slate-500">Declared gender</p><span className="font-semibold capitalize">{(selectedDriver as any).gender || 'Not set'}</span></div>
                  <div><p className="text-xs text-slate-500">Mobile money</p><span className="font-semibold capitalize">{(selectedDriver as any).mobile_money_provider || '—'}</span></div>
                </div>
                <p className="mt-2 text-xs text-blue-600">Premium: AC required + year ≥ 2015. Lady Driver: gender = female confirmed on national ID.</p>
              </Card>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-600">Completeness:</span>
                <span className="rounded-full bg-slate-100 px-3 py-0.5 text-sm font-bold">{docCompleteness(selectedDriver.documents)}</span>
              </div>

              {isPending && (
                <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Button variant="success" onClick={handleApprove} isLoading={isProcessing} className="flex-1">✓ Approve All + Activate Driver</Button>
                  <Button variant="danger" onClick={() => { setShowRejectModal(true); setRejectReason('') }} disabled={isProcessing} className="flex-1">✕ Reject Submission</Button>
                </div>
              )}

              {(!selectedDriver.documents || selectedDriver.documents.length === 0)
                ? <Card><p className="text-sm text-slate-400">No documents submitted yet.</p></Card>
                : selectedDriver.documents.map(doc => {
                  const isExpanded = expandedDocId === doc.id
                  const isThisDocRejecting = rejectingDocId === doc.id
                  const isThisDocLoading = docActionLoading === doc.id
                  const canAct = doc.status === 'pending' || doc.status === 'under_review'
                  return (
                    <div key={doc.id} className="overflow-hidden rounded-2xl border border-slate-200">
                      <button onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                        className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors text-left">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-900">{formatDocType(doc.document_type)}</span>
                          <Badge status={doc.status as any}>{doc.status.replace(/_/g, ' ')}</Badge>
                        </div>
                        <svg className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="space-y-4 border-t border-slate-200 p-4">
                          <DocumentPreview fileUrl={doc.file_url} fileType={getFileType(doc.file_url)} fileName={formatDocType(doc.document_type)} />
                          {canAct && (
                            !isThisDocRejecting
                              ? <div className="flex gap-3">
                                <Button variant="success" size="sm" onClick={() => handleApproveDocument(doc)} isLoading={isThisDocLoading} className="flex-1">✓ Approve</Button>
                                <Button variant="danger" size="sm" onClick={() => { setRejectingDocId(doc.id); setDocRejectReason('') }} disabled={isThisDocLoading} className="flex-1">✕ Reject</Button>
                              </div>
                              : <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-500">Quick reason (click to fill):</p>
                                <div className="flex flex-wrap gap-2">
                                  {REJECTION_REASON_CHIPS.map(chip => (
                                    <button key={chip} onClick={() => setDocRejectReason(chip)}
                                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${docRejectReason === chip ? 'border-red-400 bg-red-100 text-red-700' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}>
                                      {chip}
                                    </button>
                                  ))}
                                </div>
                                <textarea value={docRejectReason} onChange={e => setDocRejectReason(e.target.value)}
                                  placeholder="Or type a custom reason…" rows={2}
                                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                <div className="flex gap-2">
                                  <Button variant="danger" size="sm" onClick={() => handleRejectDocument(doc)} isLoading={isThisDocLoading} disabled={!docRejectReason.trim()} className="flex-1">Confirm Reject</Button>
                                  <Button variant="secondary" size="sm" onClick={() => setRejectingDocId(null)} className="flex-1">Cancel</Button>
                                </div>
                              </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}

          {/* VEHICLE */}
          {profileTab === 'Vehicle' && (
            <Card>
              {selectedDriver.vehicle
                ? <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    ['Type', selectedDriver.vehicle.vehicle_type],
                    ['Plate', selectedDriver.vehicle.license_plate],
                    ['Make', selectedDriver.vehicle.make],
                    ['Model', selectedDriver.vehicle.model],
                    ['Year', selectedDriver.vehicle.year],
                    ['Color', selectedDriver.vehicle.color],
                    ['Capacity', selectedDriver.vehicle.passenger_capacity ? `${selectedDriver.vehicle.passenger_capacity} passengers` : '—'],
                    ['Air Conditioning', selectedDriver.vehicle.has_air_conditioning ? '✓ Yes' : '✗ No'],
                    ['Provides Helmet', selectedDriver.vehicle.provides_helmet ? '✓ Yes' : '✗ No'],
                  ].map(([k, v]) => (
                    <div key={String(k)}><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{String(v ?? '—')}</dd></div>
                  ))}
                </dl>
                : <p className="text-sm text-slate-400">No vehicle data on file.</p>}
            </Card>
          )}

          {/* PAYMENT INFO */}
          {profileTab === 'Payment Info' && (
            <Card>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Payment Info (V2_A_1 §1)</h3>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Auth Phone (read-only)</dt>
                  <dd className="font-semibold text-slate-900">{selectedDriver.phone_number || '—'}</dd>
                  <p className="mt-0.5 text-xs text-slate-400">Permanent — phone changes require a re-OTP workflow.</p>
                </div>
                <div>
                  <dt className="text-slate-500">Mobile Money Provider</dt>
                  <dd className="mt-1">
                    {(selectedDriver as any).mobile_money_provider
                      ? <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold uppercase ${(selectedDriver as any).mobile_money_provider === 'mpesa' ? 'bg-green-100 text-green-700' : (selectedDriver as any).mobile_money_provider === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {(selectedDriver as any).mobile_money_provider}
                      </span>
                      : <span className="text-slate-400">Not set</span>}
                  </dd>
                  <p className="mt-1 text-xs text-slate-400">Operations role can change provider on driver's behalf when driver reports a switch in support.</p>
                </div>
              </dl>
            </Card>
          )}

          {/* DYNAMIC TABS */}
          {!['Overview', 'Documents', 'Vehicle', 'Payment Info'].includes(profileTab) && (
            <Card>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{profileTab}</h3>
              {tabLoading
                ? <div className="flex h-40 items-center justify-center text-slate-400">Loading…</div>
                : tabData.length === 0
                  ? <div className="flex h-40 items-center justify-center text-slate-400">No data available.</div>
                  : <div className="space-y-2 max-h-[32rem] overflow-y-auto">
                    {tabData.map((item, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 px-4 py-3 text-xs">
                        <pre className="whitespace-pre-wrap break-all text-slate-700">{JSON.stringify(item, null, 2)}</pre>
                      </div>
                    ))}
                  </div>}
            </Card>
          )}
        </div>

        {/* Right action panel */}
        <div className="space-y-3">
          <Card>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Quick Stats</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Rating</span><span className="font-bold text-amber-500">{selectedDriver.rating.toFixed(1)} ⭐</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Trips</span><span className="font-bold">{selectedDriver.total_trips}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Wallet</span><span className={`font-bold ${(selectedDriver.credit_balance ?? 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>{(selectedDriver.credit_balance ?? 0).toLocaleString()} CDF</span></div>
            </div>
          </Card>

          <Card className="space-y-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">KYC</p>
            {isPending && <>
              <Button variant="success" onClick={handleApprove} isLoading={isProcessing} className="w-full">✓ Approve</Button>
              <Button variant="danger" onClick={() => { setShowRejectModal(true); setRejectReason('') }} disabled={isProcessing} className="w-full">✕ Reject</Button>
            </>}
            {isApproved && !isSuspended && <Button variant="warning" onClick={() => { setShowSuspendModal(true); setSuspendReason(''); setSuspendEndDate(''); setSuspendAppealUrl(''); setSuspendIndefinite(false) }} disabled={isProcessing} className="w-full">⊘ Suspend</Button>}
            {isSuspended && <Button variant="success" onClick={handleUnsuspend} isLoading={isProcessing} className="w-full">↑ Reinstate</Button>}
          </Card>

          <Card className="space-y-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Account</p>
            <Button variant="secondary" size="sm" onClick={handleForceOffline} disabled={isProcessing || !selectedDriver.is_online} className="w-full">Force Offline</Button>
            <Button variant="secondary" size="sm" onClick={handleForceLogout} disabled={isProcessing} className="w-full">Force Logout</Button>
            <Button variant="secondary" size="sm" onClick={() => { setShowNoteModal(true); loadNotes(selectedDriver.id) }} className="w-full">Add Note</Button>
            <Button variant="secondary" size="sm" onClick={() => { setShowWarnModal(true); setWarnMessage('') }} className="w-full">Send Warning</Button>
            <Button variant="danger" size="sm" onClick={() => { setShowBanModal(true); setBanReason('') }} className="w-full">Permanent Ban</Button>
          </Card>
        </div>
      </div>

      {/* ── MODALS ── */}

      <Modal isOpen={showRejectModal} title="Reject Driver Submission" onClose={() => { setShowRejectModal(false); setRejectReason('') }}
        onConfirm={handleReject} confirmText="Reject" confirmVariant="danger" isConfirmLoading={isProcessing} confirmDisabled={rejectReason.trim().length < 20}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Select a reason or type one (≥ 20 chars). Driver sees this verbatim.</p>
          <div className="flex flex-wrap gap-2">
            {REJECTION_REASON_CHIPS.map(chip => (
              <button key={chip} onClick={() => setRejectReason(chip)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${rejectReason === chip ? 'border-red-400 bg-red-100 text-red-700' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}>
                {chip}
              </button>
            ))}
          </div>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Or type a custom reason…" rows={3}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          {rejectReason.trim().length > 0 && rejectReason.trim().length < 20 && <p className="text-xs text-red-500">{20 - rejectReason.trim().length} more characters required.</p>}
        </div>
      </Modal>

      <Modal isOpen={showSuspendModal} title="Suspend Driver" onClose={() => setShowSuspendModal(false)}
        onConfirm={handleSuspend} confirmText="Suspend" confirmVariant="warning" isConfirmLoading={isProcessing} confirmDisabled={!suspendReason.trim()}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Reason (required) *</label>
            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} rows={3} placeholder="Describe why the driver is being suspended…"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={suspendIndefinite} onChange={e => setSuspendIndefinite(e.target.checked)} />
            Indefinite suspension
          </label>
          {!suspendIndefinite && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">End Date (optional)</label>
              <input type="date" value={suspendEndDate} onChange={e => setSuspendEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          )}
          {suspendIndefinite && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">⚠ Indefinite suspensions require Super Admin co-sign. Ensure a Super Admin reviews this in the Audit log.</p>}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Appeal URL (optional)</label>
            <input type="url" value={suspendAppealUrl} onChange={e => setSuspendAppealUrl(e.target.value)} placeholder="https://support.albotaxi.app/appeal"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCategoryModal} title={`${categoryAction === 'standard' ? 'Demote to' : 'Grant'} ${CATEGORY_LABELS[categoryAction]}`}
        onClose={() => setShowCategoryModal(false)} onConfirm={handleCategoryGrant} confirmText="Confirm" isConfirmLoading={isProcessing} confirmDisabled={!categoryReason.trim()}>
        <div className="space-y-4">
          {categoryAction === 'premium' && <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700"><strong>Eligibility:</strong> AC required + vehicle year ≥ 2015. Verify in Vehicle tab and vehicle photos before granting.</div>}
          {categoryAction === 'lady_driver' && <div className="rounded-xl bg-purple-50 px-3 py-2 text-xs text-purple-700"><strong>Eligibility:</strong> declared gender = female. Verify against national ID in Documents tab before granting.</div>}
          {categoryAction === 'standard' && <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">Driver will still receive Standard requests. They lose access to Premium/Lady Driver requests.</div>}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Reason (driver will be notified) *</label>
            <textarea value={categoryReason} onChange={e => setCategoryReason(e.target.value)} rows={3}
              placeholder={categoryAction === 'premium' ? 'Vehicle and AC verified, year 2019…' : categoryAction === 'lady_driver' ? 'Gender verified against national ID…' : 'Repeated low ratings / wrong vehicle reported…'}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
      </Modal>

      <Modal isOpen={showNoteModal} title="Add Internal Note" onClose={() => setShowNoteModal(false)}
        onConfirm={handleAddNote} confirmText="Save Note" isConfirmLoading={isProcessing} confirmDisabled={!noteText.trim()}>
        <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Internal note — not visible to driver…"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
      </Modal>

      <Modal isOpen={showWarnModal} title="Send Warning" onClose={() => setShowWarnModal(false)}
        onConfirm={handleSendWarning} confirmText="Send Warning" isConfirmLoading={isProcessing} confirmDisabled={!warnMessage.trim()}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Category *</label>
            <select value={warnCategory} onChange={e => setWarnCategory(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              {WARNING_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Message (shown to driver) *</label>
            <textarea value={warnMessage} onChange={e => setWarnMessage(e.target.value)} rows={4} placeholder="Describe the issue and expected behaviour…"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>
      </Modal>

      <Modal isOpen={showBanModal} title="Permanent Ban" onClose={() => setShowBanModal(false)}
        onConfirm={handlePermanentBan} confirmText="Permanently Ban" confirmVariant="danger" isConfirmLoading={isProcessing} confirmDisabled={!banReason.trim()}>
        <div className="space-y-3">
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">This action is irreversible. The driver will be permanently barred from the platform.</div>
          <textarea value={banReason} onChange={e => setBanReason(e.target.value)} rows={4} placeholder="Reason for permanent ban (required)…"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </Modal>
    </div>
  )
}
