import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Badge, Table } from '../components'
import {
  Customer,
  supabaseService,
  CustomerTripItem,
  SavedAddress,
  EmergencyContact,
  CustomerNotificationItem,
  ActivityEvent,
} from '../services/supabaseService'

type ProfileTab = 'Overview' | 'Trip History' | 'Saved Places' | 'Emergency Contacts' | 'Notifications' | 'Activity'

const PROFILE_TABS: ProfileTab[] = ['Overview', 'Trip History', 'Saved Places', 'Emergency Contacts', 'Notifications', 'Activity']

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [banReason, setBanReason] = useState('')
  const [showBanModal, setShowBanModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>('Overview')

  // Tab data
  const [trips, setTrips] = useState<CustomerTripItem[]>([])
  const [tripsTotal, setTripsTotal] = useState(0)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [notifications, setNotifications] = useState<CustomerNotificationItem[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  useEffect(() => { loadCustomers() }, [])

  useEffect(() => {
    if (selectedCustomer) loadTabData(activeTab)
  }, [activeTab, selectedCustomer])

  const loadCustomers = async () => {
    setIsLoading(true)
    try {
      const data = await supabaseService.getCustomers(searchQuery || undefined)
      setCustomers(data)
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load customers')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTabData = useCallback(async (tab: ProfileTab) => {
    if (!selectedCustomer) return
    setTabLoading(true)
    try {
      const id = selectedCustomer.id
      if (tab === 'Trip History') {
        const r = await supabaseService.getCustomerTrips(id, { limit: 25 })
        setTrips(r.trips)
        setTripsTotal(r.total)
      } else if (tab === 'Saved Places') {
        const r = await supabaseService.getCustomerSavedAddresses(id)
        setSavedAddresses(r)
      } else if (tab === 'Emergency Contacts') {
        const r = await supabaseService.getCustomerEmergencyContacts(id)
        setEmergencyContacts(r)
      } else if (tab === 'Notifications') {
        const r = await supabaseService.getCustomerNotifications(id, { limit: 25 })
        setNotifications(r.notifications)
      } else if (tab === 'Activity') {
        const r = await supabaseService.getCustomerActivity(id, 30)
        setActivity(r)
      }
    } catch {
      // non-critical — show empty state
    } finally {
      setTabLoading(false)
    }
  }, [selectedCustomer])

  const handleBan = async () => {
    if (!selectedCustomer || !banReason.trim()) return
    setActionLoading(true)
    try {
      await supabaseService.banCustomer(selectedCustomer.id, banReason)
      setShowBanModal(false)
      setBanReason('')
      setSelectedCustomer(null)
      loadCustomers()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to ban customer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnban = async (customer: Customer) => {
    setActionLoading(true)
    try {
      await supabaseService.unbanCustomer(customer.id)
      loadCustomers()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to unban customer')
    } finally {
      setActionLoading(false)
    }
  }

  const tableColumns = [
    { key: 'full_name', label: 'Name' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'gender', label: 'Gender' },
    { key: 'customer_rating', label: 'Rating', width: 'w-20' },
    { key: 'status', label: 'Status', width: 'w-24' },
    { key: 'created_at', label: 'Joined', width: 'w-28' },
  ]

  const tableData = customers.map((c) => ({
    ...c,
    full_name: c.full_name || 'N/A',
    phone_number: c.phone_number || 'N/A',
    email: c.email || '—',
    gender: c.gender || '—',
    customer_rating: c.customer_rating?.toFixed(1) || '—',
    status: c.is_active ? <Badge status="active">Active</Badge> : <Badge status="suspended">Banned</Badge>,
    created_at: new Date(c.created_at).toLocaleDateString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-950">Customer Operations</h1>
          <p className="mt-1 text-brand-600">Browse, search, and manage customer accounts.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadCustomers} isLoading={isLoading}>Refresh</Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search by name, phone, or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
            className="flex-1 min-w-[250px] rounded-2xl border border-brand-200 px-4 py-2.5 text-sm text-brand-900 placeholder-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <Button variant="primary" size="sm" onClick={loadCustomers}>Search</Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 text-sm text-brand-500">{customers.length} customer{customers.length !== 1 ? 's' : ''} found</div>
        <Table
          columns={tableColumns}
          data={tableData}
          isLoading={isLoading}
          onRowClick={(row: any) => {
            const c = customers.find((c) => c.id === row.id)
            if (c) { setSelectedCustomer(c); setActiveTab('Overview') }
          }}
        />
      </Card>

      {/* Customer Profile Panel */}
      {selectedCustomer && (
        <Card className="border-l-4 border-l-brand-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-brand-950">{selectedCustomer.full_name || 'Unknown'}</h2>
              <p className="mt-0.5 text-xs text-brand-400">ID: {selectedCustomer.id}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedCustomer(null)}>Close</Button>
              {selectedCustomer.is_active ? (
                <Button variant="danger" size="sm" onClick={() => setShowBanModal(true)}>Ban</Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => handleUnban(selectedCustomer)} isLoading={actionLoading}>Unban</Button>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-brand-100 mb-6 overflow-x-auto">
            {PROFILE_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-accent-600 text-accent-700'
                    : 'text-brand-500 hover:text-brand-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {tabLoading && (
            <div className="flex justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />
            </div>
          )}

          {!tabLoading && activeTab === 'Overview' && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                { label: 'Phone', value: selectedCustomer.phone_number || 'N/A' },
                { label: 'Email', value: selectedCustomer.email || '—' },
                { label: 'Gender', value: selectedCustomer.gender || 'Not set' },
                { label: 'Rating', value: `${selectedCustomer.customer_rating?.toFixed(1) || '—'} / 5.0` },
                { label: 'Joined', value: new Date(selectedCustomer.created_at).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-brand-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-500">{label}</p>
                  <p className="mt-1 font-medium text-brand-900">{value}</p>
                </div>
              ))}
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-500">Status</p>
                <p className="mt-1">
                  {selectedCustomer.is_active ? <Badge status="active">Active</Badge> : <Badge status="suspended">Banned</Badge>}
                </p>
              </div>
            </div>
          )}

          {!tabLoading && activeTab === 'Trip History' && (
            <div>
              <p className="text-xs text-brand-400 mb-3">{tripsTotal} total trips</p>
              {trips.length === 0 ? (
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
                      {trips.map(t => (
                        <tr key={t.id} className="hover:bg-brand-50/50">
                          <td className="py-2.5 pr-4 text-brand-500 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</td>
                          <td className="py-2.5 pr-4 text-brand-700 max-w-[160px] truncate">{t.picking_point?.name || '—'}</td>
                          <td className="py-2.5 pr-4 text-brand-700 max-w-[160px] truncate">{t.destination?.name || '—'}</td>
                          <td className="py-2.5 pr-4 font-medium text-brand-900">{t.price != null ? `${t.price} CDF` : '—'}</td>
                          <td className="py-2.5"><Badge status={t.status === 'completed' ? 'approved' : t.status === 'cancelled' ? 'rejected' : 'pending'}>{t.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!tabLoading && activeTab === 'Saved Places' && (
            <div className="space-y-2">
              {savedAddresses.length === 0 ? (
                <p className="text-brand-400 text-sm text-center py-8">No saved addresses.</p>
              ) : savedAddresses.map(a => (
                <div key={a.id} className="flex items-start justify-between rounded-xl bg-brand-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-brand-900">{a.name || a.address_type || 'Address'}</p>
                    <p className="text-sm text-brand-600 mt-0.5">{a.display_name || '—'}</p>
                  </div>
                  {(a.latitude && a.longitude) && (
                    <p className="text-xs text-brand-400">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!tabLoading && activeTab === 'Emergency Contacts' && (
            <div className="space-y-2">
              {emergencyContacts.length === 0 ? (
                <p className="text-brand-400 text-sm text-center py-8">No emergency contacts.</p>
              ) : emergencyContacts.map(ec => (
                <div key={ec.id} className="rounded-xl bg-brand-50 px-4 py-3">
                  <p className="font-medium text-brand-900">{ec.name}</p>
                  <p className="text-sm text-brand-600">{ec.phone_number}</p>
                  {ec.contact_relationship && <p className="text-xs text-brand-400">{ec.contact_relationship}</p>}
                </div>
              ))}
            </div>
          )}

          {!tabLoading && activeTab === 'Notifications' && (
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-brand-400 text-sm text-center py-8">No notifications.</p>
              ) : notifications.map(n => (
                <div key={n.id} className="flex items-start justify-between rounded-xl bg-brand-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-brand-900 text-sm">{n.title}</p>
                    <p className="text-xs text-brand-500 mt-0.5">{n.content}</p>
                    <p className="text-xs text-brand-400 mt-1">{n.notification_type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge status={n.status === 'read' ? 'approved' : 'pending'}>{n.status}</Badge>
                    <span className="text-xs text-brand-400">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!tabLoading && activeTab === 'Activity' && (
            <div className="space-y-2">
              {activity.length === 0 ? (
                <p className="text-brand-400 text-sm text-center py-8">No activity found.</p>
              ) : activity.map((ev, i) => (
                <div key={ev.id + i} className="flex items-center gap-3 rounded-xl border border-brand-100 px-4 py-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    ev.type === 'ride' ? 'bg-accent-100 text-accent-700' : 'bg-brand-100 text-brand-600'
                  }`}>
                    {ev.type === 'ride' ? '🚗' : '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-900 truncate">{ev.summary}</p>
                    {ev.amount != null && <p className="text-xs text-brand-500">{ev.amount} CDF</p>}
                  </div>
                  <span className="text-xs text-brand-400 whitespace-nowrap">
                    {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-brand-950">Ban Customer</h2>
            <p className="mt-2 text-sm text-brand-600">
              {selectedCustomer?.full_name || 'Unknown'} — {selectedCustomer?.phone_number}
            </p>
            <div className="mt-4">
              <label className="text-sm font-medium text-brand-700">Reason (required)</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter the reason for banning this customer…"
                className="mt-1 w-full rounded-2xl border border-brand-200 px-4 py-3 text-sm text-brand-900 placeholder-brand-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                rows={3}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowBanModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleBan} isLoading={actionLoading} disabled={!banReason.trim()}>
                Confirm Ban
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
