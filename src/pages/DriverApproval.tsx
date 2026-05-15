import React, { useEffect, useState, useCallback } from 'react'
import {
  supabaseService,
  Driver,
  DriverTripItem,
  DriverEarningsResponse,
  DriverRatingsResponse,
  DriverComplianceResponse,
  ActivityEvent,
} from '../services/supabaseService'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Table } from '../components/Table'
import { Badge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { DocumentPreview } from '../components/DocumentPreview'

type DriverTab = 'Profile' | 'Trips' | 'Earnings' | 'Ratings' | 'Compliance' | 'Activity'
const DRIVER_TABS: DriverTab[] = ['Profile', 'Trips', 'Earnings', 'Ratings', 'Compliance', 'Activity']

export const DriverApproval: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [driverOfferMetrics, setDriverOfferMetrics] = useState<{ offers_sent: number; updates_received: number; update_rate: number } | null>(null)
  const [isOfferMetricsLoading, setIsOfferMetricsLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendEndDate, setSuspendEndDate] = useState('')
  const [suspendAppealContact, setSuspendAppealContact] = useState('')
  const [isIndefinite, setIsIndefinite] = useState(true)
  const [isSuspending, setIsSuspending] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'standard' | 'premium' | 'lady_driver'>('standard')
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string; fileType: 'image' | 'pdf'; fileName: string } | null>(null)

  // Profile tabs
  const [activeDriverTab, setActiveDriverTab] = useState<DriverTab>('Profile')
  const [driverTrips, setDriverTrips] = useState<DriverTripItem[]>([])
  const [driverTripsTotal, setDriverTripsTotal] = useState(0)
  const [driverEarnings, setDriverEarnings] = useState<DriverEarningsResponse | null>(null)
  const [driverRatings, setDriverRatings] = useState<DriverRatingsResponse | null>(null)
  const [driverCompliance, setDriverCompliance] = useState<DriverComplianceResponse | null>(null)
  const [driverActivity, setDriverActivity] = useState<ActivityEvent[]>([])
  const [driverTabLoading, setDriverTabLoading] = useState(false)

  useEffect(() => { loadDrivers() }, [statusFilter])

  useEffect(() => {
    if (selectedDriver && activeDriverTab !== 'Profile') {
      loadDriverTabData(activeDriverTab, selectedDriver.id)
    }
  }, [activeDriverTab, selectedDriver])

  const loadDrivers = async () => {
    setIsLoading(true)
    try {
      const data = await supabaseService.getDrivers(statusFilter)
      setDrivers(data)
    } catch (error) {
      console.error('Failed to load drivers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedDriver) return
    try {
      await supabaseService.approveDriver(selectedDriver.id)
      setSelectedDriver(null)
      loadDrivers()
    } catch (error) {
      console.error('Failed to approve driver:', error)
    }
  }

  const handleReject = async () => {
    if (!selectedDriver) return
    try {
      await supabaseService.rejectDriver(selectedDriver.id, rejectFeedback)
      setShowRejectModal(false)
      setRejectFeedback('')
      setSelectedDriver(null)
      loadDrivers()
    } catch (error) {
      console.error('Failed to reject driver:', error)
    }
  }

  const handleSuspend = async () => {
    if (!selectedDriver) return
    setIsSuspending(true)
    try {
      await supabaseService.suspendDriver(selectedDriver.id, {
        reason: suspendReason,
        end_date: isIndefinite ? undefined : suspendEndDate || undefined,
        appeal_contact: suspendAppealContact || undefined,
      })
      setShowSuspendModal(false)
      setSuspendReason('')
      setSuspendEndDate('')
      setSuspendAppealContact('')
      setIsIndefinite(true)
      setSelectedDriver(null)
      loadDrivers()
    } catch (error) {
      console.error('Failed to suspend driver:', error)
    } finally {
      setIsSuspending(false)
    }
  }

  const handleUnsuspend = async () => {
    if (!selectedDriver) return
    try {
      await supabaseService.unsuspendDriver(selectedDriver.id)
      setSelectedDriver(null)
      loadDrivers()
    } catch (error) {
      console.error('Failed to unsuspend driver:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedDriver) return
    try {
      await supabaseService.deleteDriver(selectedDriver.id)
      setShowDeleteModal(false)
      setSelectedDriver(null)
      loadDrivers()
    } catch (error) {
      console.error('Failed to delete driver:', error)
    }
  }

  const loadDriverTabData = useCallback(async (tab: DriverTab, driverId: string) => {
    setDriverTabLoading(true)
    try {
      if (tab === 'Trips') {
        const r = await supabaseService.getDriverTrips(driverId, { limit: 25 })
        setDriverTrips(r.trips)
        setDriverTripsTotal(r.total)
      } else if (tab === 'Earnings') {
        const r = await supabaseService.getDriverEarnings(driverId, { limit: 25 })
        setDriverEarnings(r)
      } else if (tab === 'Ratings') {
        const r = await supabaseService.getDriverRatings(driverId, { limit: 25 })
        setDriverRatings(r)
      } else if (tab === 'Compliance') {
        const r = await supabaseService.getDriverCompliance(driverId)
        setDriverCompliance(r)
      } else if (tab === 'Activity') {
        const r = await supabaseService.getDriverActivity(driverId, 30)
        setDriverActivity(r)
      }
    } catch {
      // non-critical — show empty state
    } finally {
      setDriverTabLoading(false)
    }
  }, [])

  const handleCategoryChange = async () => {
    if (!selectedDriver) return
    try {
      await supabaseService.updateDriverCategory(selectedDriver.id, selectedCategory)
      setShowCategoryModal(false)
      // Reload driver detail to show updated category
      const updated = await supabaseService.getDriverDetail(selectedDriver.id)
      setSelectedDriver(updated)
      loadDrivers()
    } catch (error) {
      console.error('Failed to update driver category:', error)
    }
  }

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'vehicle_type', label: 'Vehicle Type' },
    { key: 'verification_status', label: 'Status' },
    { key: 'submitted_at', label: 'Submitted' },
  ]

  const tableData = drivers.map((d: Driver) => ({
    ...d,
    id: d.id.slice(0, 8),
    full_name: d.full_name || 'N/A',
    phone_number: d.phone_number || '-',
    vehicle_type: d.vehicle_type || '-',
    verification_status: d.verification_status,
    submitted_at: d.submitted_at ? new Date(d.submitted_at).toLocaleDateString() : '-',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Driver Approval</h1>
          <p className="mt-1 text-sm text-brand-500">
            Review, approve, reject, or manage driver profiles
          </p>
        </div>
        <Button variant="secondary" onClick={loadDrivers}>
          ↻ Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {/* Status Filter + List */}
        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            {['pending', 'under_review', 'approved', 'rejected', 'suspended'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setStatusFilter(status)
                  setSelectedDriver(null)
                }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </Button>
            ))}
          </div>
          <Table
            columns={columns}
            data={tableData}
            isLoading={isLoading}
            onRowClick={(row) => {
              const driver = drivers.find((d) => d.id.startsWith(row.id))
              if (driver) {
                setDriverOfferMetrics(null)
                supabaseService.getDriverDetail(driver.id).then((detail) => {
                  setSelectedDriver(detail)
                }).catch(() => {
                  setSelectedDriver(driver)
                })
                // Load offer metrics for this driver
                setIsOfferMetricsLoading(true)
                supabaseService.getOfferUpdateMetrics().then((metrics) => {
                  const driverData = metrics.driver_breakdown.find(
                    (d) => d.driver_id === driver.id
                  )
                  if (driverData) {
                    setDriverOfferMetrics({
                      offers_sent: driverData.offers_sent,
                      updates_received: driverData.updates_received,
                      update_rate: driverData.update_rate,
                    })
                  }
                }).catch(() => {
                  // Silently fail — offer metrics are non-critical
                }).finally(() => {
                  setIsOfferMetricsLoading(false)
                })
              }
            }}
          />
        </Card>

        {/* Driver Detail */}
        {selectedDriver && (
          <Card>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-brand-900">{selectedDriver.full_name || 'Driver Profile'}</h3>
                <p className="text-xs text-brand-400 mt-0.5">ID: {selectedDriver.id}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { setSelectedDriver(null); setActiveDriverTab('Profile') }}>✕ Close</Button>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap gap-2 mb-5">
              <Badge status={
                selectedDriver.verification_status === 'approved' ? 'success' :
                selectedDriver.verification_status === 'rejected' || selectedDriver.verification_status === 'suspended' ? 'danger' :
                selectedDriver.verification_status === 'under_review' ? 'warning' : 'default'
              }>{selectedDriver.verification_status.replace('_', ' ')}</Badge>
              {selectedDriver.category && <Badge status="info">{selectedDriver.category.replace('_', ' ')}</Badge>}
              {selectedDriver.is_online && <Badge status="success">Online</Badge>}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mb-5 border-b border-brand-100 pb-5">
              {(selectedDriver.verification_status === 'pending' || selectedDriver.verification_status === 'under_review') && (
                <>
                  <Button variant="success" size="sm" onClick={handleApprove}>✓ Approve</Button>
                  <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)}>✕ Reject</Button>
                </>
              )}
              {selectedDriver.verification_status === 'approved' && (
                <Button variant="warning" size="sm" onClick={() => setShowSuspendModal(true)}>⊘ Suspend</Button>
              )}
              {selectedDriver.verification_status === 'suspended' && (
                <Button variant="success" size="sm" onClick={handleUnsuspend}>↺ Reinstate</Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => { setSelectedCategory((selectedDriver.category as any) || 'standard'); setShowCategoryModal(true) }}>
                🏷 Category
              </Button>
              <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>🗑 Delete</Button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-brand-100 mb-6 overflow-x-auto">
              {DRIVER_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveDriverTab(tab)}
                  className={`whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
                    activeDriverTab === tab
                      ? 'border-b-2 border-accent-600 text-accent-700'
                      : 'text-brand-500 hover:text-brand-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {driverTabLoading && (
              <div className="flex justify-center py-8">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />
              </div>
            )}

            {/* Profile tab — original content inlined */}
            {!driverTabLoading && activeDriverTab === 'Profile' && (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <Card>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-brand-900">
                    {selectedDriver.full_name || 'Driver Profile'}
                  </h3>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Badge status={
                    selectedDriver.verification_status === 'approved' ? 'success' :
                    selectedDriver.verification_status === 'rejected' || selectedDriver.verification_status === 'suspended' ? 'danger' :
                    selectedDriver.verification_status === 'under_review' ? 'warning' :
                    'default'
                  }>
                    {selectedDriver.verification_status.replace('_', ' ')}
                  </Badge>
                  {selectedDriver.category && (
                    <Badge status="info">{selectedDriver.category.replace('_', ' ')}</Badge>
                  )}
                  {selectedDriver.is_online && <Badge status="success">Online</Badge>}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-brand-500">Phone</p>
                    <p className="font-medium text-brand-900">{selectedDriver.phone_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">Email</p>
                    <p className="font-medium text-brand-900">{selectedDriver.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">Gender</p>
                    <p className="font-medium text-brand-900 capitalize">{selectedDriver.gender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">Category</p>
                    <p className="font-medium text-brand-900 capitalize">{selectedDriver.category || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">Passenger Preference</p>
                    <p className="font-medium text-brand-900 capitalize">{selectedDriver.passenger_preference || 'Any'}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">License</p>
                    <p className="font-medium text-brand-900">{selectedDriver.license_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">License Expiry</p>
                    <p className="font-medium text-brand-900">{selectedDriver.license_expiry ? new Date(selectedDriver.license_expiry).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">Vehicle Type</p>
                    <p className="font-medium text-brand-900">{selectedDriver.vehicle_type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">Rating</p>
                    <p className="font-medium text-brand-900">{selectedDriver.rating ? `${selectedDriver.rating.toFixed(1)} ★` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">Total Trips</p>
                    <p className="font-medium text-brand-900">{selectedDriver.total_trips || 0}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">Payment Phone</p>
                    <p className="font-medium text-brand-900">{selectedDriver.payment_phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-brand-500">Address</p>
                    <p className="font-medium text-brand-900">{selectedDriver.address || '-'}</p>
                  </div>
                </div>

                {/* Mobile Money Info */}
                {(selectedDriver.mobile_money_mpesa || selectedDriver.mobile_money_orange || selectedDriver.mobile_money_airtel) && (
                  <div className="mt-4 border-t border-brand-100 pt-4">
                    <h4 className="mb-2 text-sm font-medium text-brand-700">Mobile Money</h4>
                    <div className="space-y-1 text-sm text-brand-900">
                      {selectedDriver.mobile_money_mpesa && <p>M-Pesa: {selectedDriver.mobile_money_mpesa}</p>}
                      {selectedDriver.mobile_money_orange && <p>Orange Money: {selectedDriver.mobile_money_orange}</p>}
                      {selectedDriver.mobile_money_airtel && <p>Airtel Money: {selectedDriver.mobile_money_airtel}</p>}
                    </div>
                  </div>
                )}

                {selectedDriver.verification_feedback && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-700">Feedback</p>
                    <p className="mt-1 text-sm text-amber-600">{selectedDriver.verification_feedback}</p>
                  </div>
                )}

                {selectedDriver.verification_status === 'suspended' && (
                  <div className="mt-4 space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-700">Suspension Details</p>
                    {selectedDriver.suspension_end_date && (
                      <p className="text-sm text-red-600">
                        <span className="font-medium">End Date:</span>{' '}
                        {new Date(selectedDriver.suspension_end_date).toLocaleDateString()}
                      </p>
                    )}
                    {!selectedDriver.suspension_end_date && (
                      <p className="text-sm text-red-600">
                        <span className="font-medium">Duration:</span> Indefinite
                      </p>
                    )}
                    {selectedDriver.appeal_contact && (
                      <p className="text-sm text-red-600">
                        <span className="font-medium">Appeal Contact:</span>{' '}
                        {selectedDriver.appeal_contact}
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {/* Vehicle Info */}
              {selectedDriver.vehicle && (
                <Card>
                  <h3 className="mb-3 text-lg font-semibold text-brand-900">Vehicle</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-brand-500">Make</p>
                      <p className="font-medium text-brand-900">{selectedDriver.vehicle.make}</p>
                    </div>
                    <div>
                      <p className="text-brand-500">Model</p>
                      <p className="font-medium text-brand-900">{selectedDriver.vehicle.model}</p>
                    </div>
                    <div>
                      <p className="text-brand-500">Year</p>
                      <p className="font-medium text-brand-900">{selectedDriver.vehicle.year}</p>
                    </div>
                    <div>
                      <p className="text-brand-500">Color</p>
                      <p className="font-medium text-brand-900">{selectedDriver.vehicle.color}</p>
                    </div>
                    <div>
                      <p className="text-brand-500">License Plate</p>
                      <p className="font-medium text-brand-900">{selectedDriver.vehicle.license_plate}</p>
                    </div>
                    <div>
                      <p className="text-brand-500">Type</p>
                      <p className="font-medium text-brand-900">{selectedDriver.vehicle.vehicle_type}</p>
                    </div>
                    {selectedDriver.vehicle.passenger_capacity && (
                      <div>
                        <p className="text-brand-500">Capacity</p>
                        <p className="font-medium text-brand-900">{selectedDriver.vehicle.passenger_capacity} seats</p>
                      </div>
                    )}
                    {selectedDriver.vehicle.has_air_conditioning !== undefined && (
                      <div>
                        <p className="text-brand-500">A/C</p>
                        <p className="font-medium text-brand-900">{selectedDriver.vehicle.has_air_conditioning ? 'Yes' : 'No'}</p>
                      </div>
                    )}
                    {selectedDriver.vehicle.provides_helmet !== undefined && (
                      <div>
                        <p className="text-brand-500">Helmet</p>
                        <p className="font-medium text-brand-900">{selectedDriver.vehicle.provides_helmet ? 'Yes' : 'No'}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Documents */}
              {selectedDriver.documents && selectedDriver.documents.length > 0 && (
                <Card>
                  <h3 className="mb-3 text-lg font-semibold text-brand-900">Documents</h3>
                  <div className="space-y-3">
                    {selectedDriver.documents.map((doc) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(doc.file_url)
                      return (
                        <div key={doc.id} className="rounded-xl border border-brand-100 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-brand-900 capitalize">
                                {doc.document_type.replace(/_/g, ' ')}
                              </p>
                              <Badge status={
                                doc.status === 'approved' ? 'success' :
                                doc.status === 'rejected' ? 'danger' :
                                doc.status === 'under_review' ? 'warning' :
                                'default'
                              }>
                                {doc.status}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  setPreviewDoc({
                                    fileUrl: doc.file_url,
                                    fileType: isImage ? 'image' : 'pdf',
                                    fileName: doc.document_type.replace(/_/g, ' '),
                                  })
                                }
                                className="text-sm font-medium text-brand-600 hover:text-brand-700"
                              >
                                Preview →
                              </button>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-brand-400 hover:text-brand-500"
                              >
                                Open
                              </a>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-4">
              {/* Action Buttons */}
              <Card className="space-y-3">
                <h3 className="text-lg font-semibold text-brand-900">Actions</h3>

                {(selectedDriver.verification_status === 'pending' ||
                  selectedDriver.verification_status === 'under_review') && (
                  <>
                    <Button variant="success" className="w-full" onClick={handleApprove}>
                      ✓ Approve
                    </Button>
                    <Button variant="danger" className="w-full" onClick={() => setShowRejectModal(true)}>
                      ✕ Reject
                    </Button>
                  </>
                )}
                {selectedDriver.verification_status === 'approved' && (
                  <Button variant="warning" className="w-full" onClick={() => setShowSuspendModal(true)}>
                    ⊘ Suspend
                  </Button>
                )}
                {selectedDriver.verification_status === 'suspended' && (
                  <Button variant="success" className="w-full" onClick={handleUnsuspend}>
                    ↺ Unsuspend / Reinstate
                  </Button>
                )}

                {/* Category Management */}
                <div className="border-t border-brand-100 pt-3">
                  <h4 className="mb-2 text-sm font-medium text-brand-700">Category</h4>
                  <p className="mb-2 text-xs text-brand-500">
                    Current: <span className="font-medium capitalize text-brand-900">{selectedDriver.category || 'Not set'}</span>
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setSelectedCategory((selectedDriver.category as any) || 'standard')
                      setShowCategoryModal(true)
                    }}
                  >
                    🏷 Change Category
                  </Button>
                </div>

                {/* Delete Driver */}
                <div className="border-t border-brand-100 pt-3">
                  <h4 className="mb-2 text-sm font-medium text-red-700">Danger Zone</h4>
                  <Button variant="danger" className="w-full" onClick={() => setShowDeleteModal(true)}>
                    🗑 Delete Driver
                  </Button>
                </div>
              </Card>

              {/* Stats Card */}
              <Card>
                <h3 className="mb-3 text-lg font-semibold text-brand-900">Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-brand-500">Total Trips</span>
                    <span className="font-medium text-brand-900">{selectedDriver.total_trips || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-500">Rating</span>
                    <span className="font-medium text-brand-900">{selectedDriver.rating ? `${selectedDriver.rating.toFixed(1)} ★` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-500">Online</span>
                    <span className={`font-medium ${selectedDriver.is_online ? 'text-green-600' : 'text-brand-400'}`}>
                      {selectedDriver.is_online ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-500">Credit Balance</span>
                    <span className="font-medium text-brand-900">
                      {selectedDriver.credit_balance != null ? `${selectedDriver.credit_balance.toLocaleString()} CDF` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-500">Submitted</span>
                    <span className="font-medium text-brand-900">
                      {selectedDriver.submitted_at ? new Date(selectedDriver.submitted_at).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-500">Activated</span>
                    <span className="font-medium text-brand-900">
                      {selectedDriver.activation_date ? new Date(selectedDriver.activation_date).toLocaleDateString() : '-'}
                    </span>
                  </div>

                  {/* Offer Update Metrics */}
                  <div className="border-t border-brand-100 pt-2 mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-brand-600">Offer Updates</span>
                      {isOfferMetricsLoading && (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                      )}
                    </div>
                    {driverOfferMetrics ? (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-brand-400">Offers Sent</span>
                          <span className="font-medium text-brand-700">{driverOfferMetrics.offers_sent}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-brand-400">Updates Received</span>
                          <span className="font-medium text-brand-700">{driverOfferMetrics.updates_received}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-brand-400">Update Rate</span>
                          <span className={`font-medium ${driverOfferMetrics.update_rate > 60 ? 'text-red-600' : 'text-green-600'}`}>
                            {driverOfferMetrics.update_rate.toFixed(1)}%
                            {driverOfferMetrics.update_rate > 60 && ' ⚠'}
                          </span>
                        </div>
                      </>
                    ) : !isOfferMetricsLoading ? (
                      <p className="text-xs text-brand-400">No offer data available</p>
                    ) : null}
                  </div>
                </div>
              </Card>
            </div>
            </div>
            )}{/* end Profile tab */}

            {/* Trips tab */}
            {!driverTabLoading && activeDriverTab === 'Trips' && (
              <div>
                <p className="text-xs text-brand-400 mb-3">{driverTripsTotal} total trips</p>
                {driverTrips.length === 0 ? (
                  <p className="text-brand-400 text-sm text-center py-8">No trips found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-brand-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-500">
                          <th className="pb-2 pr-4">Date</th>
                          <th className="pb-2 pr-4">Pickup</th>
                          <th className="pb-2 pr-4">Dropoff</th>
                          <th className="pb-2 pr-4">Price</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-50">
                        {driverTrips.map(t => (
                          <tr key={t.id} className="hover:bg-brand-50/50">
                            <td className="py-2.5 pr-4 text-brand-500 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</td>
                            <td className="py-2.5 pr-4 text-brand-700 max-w-[160px] truncate">{t.picking_point?.name || '—'}</td>
                            <td className="py-2.5 pr-4 text-brand-700 max-w-[160px] truncate">{t.destination?.name || '—'}</td>
                            <td className="py-2.5 pr-4 font-medium text-brand-900">{t.price != null ? `${t.price} CDF` : '—'}</td>
                            <td className="py-2.5">
                              <Badge status={t.status === 'completed' ? 'approved' : t.status === 'cancelled' ? 'rejected' : 'pending'}>{t.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Earnings tab */}
            {!driverTabLoading && activeDriverTab === 'Earnings' && (
              <div>
                {driverEarnings && (
                  <div className="mb-4 flex gap-4">
                    <div className="rounded-xl bg-brand-50 px-4 py-3">
                      <p className="text-xs text-brand-500">Credit Balance</p>
                      <p className="text-lg font-bold text-brand-900">{driverEarnings.credit_balance.toLocaleString()} CDF</p>
                    </div>
                    <div className="rounded-xl bg-brand-50 px-4 py-3">
                      <p className="text-xs text-brand-500">Transactions</p>
                      <p className="text-lg font-bold text-brand-900">{driverEarnings.total}</p>
                    </div>
                  </div>
                )}
                {!driverEarnings || driverEarnings.transactions.length === 0 ? (
                  <p className="text-brand-400 text-sm text-center py-8">No transactions found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-brand-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-500">
                          <th className="pb-2 pr-4">Date</th>
                          <th className="pb-2 pr-4">Type</th>
                          <th className="pb-2 pr-4">Amount</th>
                          <th className="pb-2">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-50">
                        {driverEarnings.transactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-brand-50/50">
                            <td className="py-2.5 pr-4 text-brand-500 whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</td>
                            <td className="py-2.5 pr-4">
                              <Badge status={tx.type === 'credit' ? 'approved' : 'warning'}>{tx.type}</Badge>
                            </td>
                            <td className="py-2.5 pr-4 font-medium text-brand-900">{tx.amount.toLocaleString()} CDF</td>
                            <td className="py-2.5 text-brand-600 max-w-[200px] truncate">{tx.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Ratings tab */}
            {!driverTabLoading && activeDriverTab === 'Ratings' && (
              <div>
                {driverRatings && (
                  <div className="mb-4 flex gap-4">
                    <div className="rounded-xl bg-brand-50 px-4 py-3">
                      <p className="text-xs text-brand-500">Average Rating</p>
                      <p className="text-lg font-bold text-brand-900">{driverRatings.avg_rating.toFixed(1)} ★</p>
                    </div>
                    <div className="rounded-xl bg-brand-50 px-4 py-3">
                      <p className="text-xs text-brand-500">Total Reviews</p>
                      <p className="text-lg font-bold text-brand-900">{driverRatings.total}</p>
                    </div>
                  </div>
                )}
                {!driverRatings || driverRatings.ratings.length === 0 ? (
                  <p className="text-brand-400 text-sm text-center py-8">No ratings found.</p>
                ) : (
                  <div className="space-y-3">
                    {driverRatings.ratings.map(r => (
                      <div key={r.id} className="rounded-xl border border-brand-100 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-brand-900">{'★'.repeat(Math.round(r.rate))}{'☆'.repeat(5 - Math.round(r.rate))}</span>
                          <span className="text-xs text-brand-400">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        {r.comment && <p className="mt-1 text-sm text-brand-600">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Compliance tab */}
            {!driverTabLoading && activeDriverTab === 'Compliance' && (
              <div className="space-y-4">
                {driverCompliance ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: 'Status', value: driverCompliance.verification_status },
                        { label: 'License #', value: driverCompliance.license_number || '—' },
                        { label: 'License Expiry', value: driverCompliance.license_expiry ? new Date(driverCompliance.license_expiry).toLocaleDateString() : '—' },
                        { label: 'Submitted', value: driverCompliance.submitted_at ? new Date(driverCompliance.submitted_at).toLocaleDateString() : '—' },
                        { label: 'Activated', value: driverCompliance.activation_date ? new Date(driverCompliance.activation_date).toLocaleDateString() : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl bg-brand-50 px-3 py-2">
                          <p className="text-xs text-brand-500">{label}</p>
                          <p className="font-medium text-brand-900">{value}</p>
                        </div>
                      ))}
                    </div>
                    {driverCompliance.verification_feedback && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-medium text-amber-700">Feedback</p>
                        <p className="mt-1 text-sm text-amber-600">{driverCompliance.verification_feedback}</p>
                      </div>
                    )}
                    <h4 className="font-semibold text-brand-800 mt-4">Documents</h4>
                    {driverCompliance.documents.length === 0 ? (
                      <p className="text-brand-400 text-sm">No documents uploaded.</p>
                    ) : driverCompliance.documents.map(doc => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(doc.file_url)
                      return (
                        <div key={doc.id} className="flex items-center justify-between rounded-xl border border-brand-100 px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-brand-900 capitalize">{doc.document_type.replace(/_/g, ' ')}</p>
                            <Badge status={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : doc.status === 'under_review' ? 'warning' : 'default'}>{doc.status}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setPreviewDoc({ fileUrl: doc.file_url, fileType: isImage ? 'image' : 'pdf', fileName: doc.document_type.replace(/_/g, ' ') })}
                              className="text-sm font-medium text-brand-600 hover:text-brand-700">Preview →</button>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-400 hover:text-brand-500">Open</a>
                          </div>
                        </div>
                      )
                    })}
                  </>
                ) : <p className="text-brand-400 text-sm text-center py-8">No compliance data.</p>}
              </div>
            )}

            {/* Activity tab */}
            {!driverTabLoading && activeDriverTab === 'Activity' && (
              <div className="space-y-2">
                {driverActivity.length === 0 ? (
                  <p className="text-brand-400 text-sm text-center py-8">No activity found.</p>
                ) : driverActivity.map((ev, i) => (
                  <div key={ev.id + i} className="flex items-center gap-3 rounded-xl border border-brand-100 px-4 py-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ev.type === 'ride' ? 'bg-accent-100 text-accent-700' : 'bg-brand-100 text-brand-600'}`}>
                      {ev.type === 'ride' ? '🚗' : '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-900 truncate">{ev.summary}</p>
                      {ev.amount != null && <p className="text-xs text-brand-500">{ev.amount} CDF</p>}
                    </div>
                    <span className="text-xs text-brand-400 whitespace-nowrap">{ev.created_at ? new Date(ev.created_at).toLocaleDateString() : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setRejectFeedback('')
        }}
        title="Reject Driver"
        onConfirm={handleReject}
        confirmText="Reject"
        confirmVariant="danger"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-600">
            Are you sure you want to reject this driver application?
          </p>
          <div>
            <label className="block text-sm font-medium text-brand-700">
              Feedback (optional)
            </label>
            <textarea
              className="mt-1 block w-full rounded-xl border border-brand-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={3}
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              placeholder="Enter feedback for the driver..."
            />
          </div>
        </div>
      </Modal>

      {/* Suspend Modal — Dedicated suspension composer */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false)
          setSuspendReason('')
          setSuspendEndDate('')
          setSuspendAppealContact('')
          setIsIndefinite(true)
        }}
        title="Suspend Driver"
        onConfirm={handleSuspend}
        confirmText={isSuspending ? 'Suspending...' : 'Suspend'}
        confirmVariant="danger"
        confirmDisabled={suspendReason.trim().length < 10 || isSuspending}
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-600">
            This driver will not be able to accept rides while suspended.
            The reason is shown verbatim on the driver's SuspendedPage.
          </p>

          {/* Reason (required, ≥10 chars) */}
          <div>
            <label className="block text-sm font-medium text-brand-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="mt-1 block w-full rounded-xl border border-brand-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Explain why this driver is being suspended (min. 10 characters)..."
            />
            {suspendReason.length > 0 && suspendReason.length < 10 && (
              <p className="mt-1 text-xs text-red-500">
                Reason must be at least 10 characters ({suspendReason.length}/10)
              </p>
            )}
          </div>

          {/* Duration — Indefinite toggle + optional end date */}
          <div>
            <label className="block text-sm font-medium text-brand-700">Duration</label>
            <label className="mt-1 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isIndefinite}
                onChange={(e) => setIsIndefinite(e.target.checked)}
                className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-brand-600">Indefinite suspension</span>
            </label>
            {!isIndefinite && (
              <div className="mt-2">
                <label className="block text-xs text-brand-500">End Date</label>
                <input
                  type="date"
                  value={suspendEndDate}
                  onChange={(e) => setSuspendEndDate(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-brand-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            )}
          </div>

          {/* Appeal Contact (optional) */}
          <div>
            <label className="block text-sm font-medium text-brand-700">
              Appeal Contact <span className="text-brand-400">(optional)</span>
            </label>
            <input
              type="text"
              value={suspendAppealContact}
              onChange={(e) => setSuspendAppealContact(e.target.value)}
              placeholder="Email, phone, or link for the driver to appeal"
              className="mt-1 block w-full rounded-xl border border-brand-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Two-person rule notice for indefinite suspensions */}
          {isIndefinite && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-700">⚠ Two-Person Rule</p>
              <p className="mt-1 text-xs text-amber-600">
                Indefinite suspensions require approval from both Operations and Super Admin.
                Ensure you have coordinated before proceeding.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Driver"
        onConfirm={handleDelete}
        confirmText="Delete Permanently"
        confirmVariant="danger"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-700">⚠ Irreversible Action</p>
            <p className="mt-1 text-sm text-red-600">
              This will permanently delete the driver profile for <strong>{selectedDriver?.full_name || 'this driver'}</strong>.
              This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* Category Change Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Change Driver Category"
        onConfirm={handleCategoryChange}
        confirmText="Save Category"
        confirmVariant="primary"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-600">
            Select a new category for <strong className="text-brand-900">{selectedDriver?.full_name || 'this driver'}</strong>:
          </p>
          <div className="space-y-2">
            {(['standard', 'premium', 'lady_driver'] as const).map((cat) => (
              <label
                key={cat}
                className={`flex cursor-pointer items-center rounded-xl border p-3 ${
                  selectedCategory === cat
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-brand-100 bg-white hover:bg-brand-50'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  checked={selectedCategory === cat}
                  onChange={() => setSelectedCategory(cat)}
                  className="h-4 w-4 text-brand-600"
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-brand-900 capitalize">
                    {cat.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-brand-500">
                    {cat === 'standard' ? 'Standard service for all passengers' :
                     cat === 'premium' ? 'Premium vehicles with higher rates' :
                     'Female drivers for female passengers'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Modal>
      {/* Document Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="relative mx-4 max-h-[90vh] max-w-[90vw] overflow-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-900 capitalize">
                {previewDoc.fileName}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1.5 text-brand-500 hover:bg-brand-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <DocumentPreview
              fileUrl={previewDoc.fileUrl}
              fileType={previewDoc.fileType}
              fileName={previewDoc.fileName}
            />
          </div>
        </div>
      )}

    </div>
  )
}
