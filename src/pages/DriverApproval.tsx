import React, { useState, useEffect } from 'react'
import { Card, Button, Modal, Badge, Table } from '../components'
import { Driver, supabaseService } from '../services/supabaseService'

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
      setError('Failed to load drivers')
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
      setDrivers(drivers.filter((d: Driver) => d.id !== selectedDriver.id))
      setShowDetailView(false)
      setSelectedDriver(null)
      setError(null)
    } catch (err) {
      setError('Failed to approve driver')
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
      setDrivers(drivers.filter((d: Driver) => d.id !== selectedDriver.id))
      setShowDetailView(false)
      setSelectedDriver(null)
      setShowRejectModal(false)
      setRejectReason('')
      setError(null)
    } catch (err) {
      setError('Failed to reject driver')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSuspend = async () => {
    if (!selectedDriver) return

    try {
      setIsProcessing(true)
      await supabaseService.suspendDriver(selectedDriver.id, rejectReason)
      setDrivers(drivers.filter((d: Driver) => d.id !== selectedDriver.id))
      setShowDetailView(false)
      setSelectedDriver(null)
      setShowRejectModal(false)
      setRejectReason('')
      setError(null)
    } catch (err) {
      setError('Failed to suspend driver')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const tableColumns = [
    { key: 'full_name', label: 'Name' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'license_number', label: 'License' },
    { key: 'verification_status', label: 'Status', width: 'w-28' },
    { key: 'submitted_at', label: 'Submitted', width: 'w-28' },
  ]

  if (!showDetailView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Driver Approval</h1>
          <p className="text-gray-600 mt-2">
            Review and approve pending driver applications
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
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
            data={drivers.map((d: Driver) => ({
              ...d,
              full_name: d.full_name || 'N/A',
              phone_number: d.phone_number || 'N/A',
              submitted_at: d.submitted_at
                ? new Date(d.submitted_at).toLocaleDateString()
                : 'N/A',
            }))}
            onRowClick={(row) => {
              const driver = drivers.find((d) => d.id === row.id)
              if (driver) {
                setSelectedDriver(driver)
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

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Driver Details</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-lg font-semibold">
            {selectedDriver.full_name || 'Unknown Driver'}
          </span>
          {selectedDriver.phone_number && (
            <span className="text-gray-600">{selectedDriver.phone_number}</span>
          )}
          <Badge status={selectedDriver.verification_status}>
            {selectedDriver.verification_status === 'under_review'
              ? 'Under Review'
              : selectedDriver.verification_status.charAt(0).toUpperCase() +
                selectedDriver.verification_status.slice(1)}
          </Badge>
        </div>
      </div>

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
                  <p className="font-semibold text-orange-700">
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
              <h2 className="text-xl font-semibold mb-4">Documents</h2>
              <div className="space-y-4">
                {selectedDriver.documents.map((doc) => (
                  <div key={doc.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-700 capitalize">{doc.document_type}</p>
                      <Badge status={doc.status}>
                        {doc.status}
                      </Badge>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: Actions and Stats */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Driver Stats</h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-600 text-sm">Rating</p>
                <p className="text-3xl font-bold text-yellow-500">
                  {selectedDriver.rating.toFixed(1)} ⭐
                </p>
              </div>
              <div className="border-t pt-3">
                <p className="text-gray-600 text-sm">Total Trips</p>
                <p className="text-2xl font-bold">{selectedDriver.total_trips}</p>
              </div>
              <div className="border-t pt-3">
                <p className="text-gray-600 text-sm">Wallet Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  {selectedDriver.credit_balance?.toFixed(2) ?? '0.00'}
                </p>
              </div>
              <div className="border-t pt-3">
                <p className="text-gray-600 text-sm">Status</p>
                <p className="text-lg font-bold">
                  {selectedDriver.is_online ? '🟢 Online' : '🔴 Offline'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-3">
            {(selectedDriver.verification_status === 'pending' ||
              selectedDriver.verification_status === 'under_review') && (
              <>
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
              </>
            )}
            {selectedDriver.verification_status === 'approved' && (
              <Button
                variant="warning"
                onClick={() => setShowRejectModal(true)}
                isLoading={isProcessing}
                className="w-full"
              >
                ⊘ Suspend
              </Button>
            )}
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showRejectModal}
        title={
          selectedDriver.verification_status === 'pending'
            ? 'Reject Driver Application'
            : 'Suspend Driver Profile'
        }
        onClose={() => {
          setShowRejectModal(false)
          setRejectReason('')
        }}
        onConfirm={
          selectedDriver.verification_status === 'pending' ? handleReject : handleSuspend
        }
        confirmText={
          selectedDriver.verification_status === 'pending' ? 'Reject' : 'Suspend'
        }
        confirmVariant={
          selectedDriver.verification_status === 'pending' ? 'danger' : 'warning'
        }
        isConfirmLoading={isProcessing}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            {selectedDriver.verification_status === 'pending'
              ? 'Please provide a reason for rejecting this driver application.'
              : 'Please provide a reason for suspending this driver profile.'}
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={4}
            required
          />
        </div>
      </Modal>
    </div>
  )
}
