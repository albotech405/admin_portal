import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Badge, Modal, Table } from '../components'
import { supabaseService } from '../services/supabaseService'

type Customer = {
  id: string
  full_name?: string
  phone_number?: string
  email?: string
  status?: string
  total_trips?: number
  rating?: number
  created_at?: string
  is_banned?: boolean
  [key: string]: unknown
}

type CustomerDetail = Customer & {
  gender?: string
  last_active_at?: string
}

type SavedPlace = {
  id: string
  name: string
  address_type: string
  display_name: string
  latitude: number
  longitude: number
  is_default: boolean
  notes: string | null
  created_at: string
}

type ActivityEvent = Record<string, unknown>

const STATUS_TABS = ['all', 'active', 'banned', 'inactive']

const PROFILE_TABS = ['Overview', 'Trips', 'Saved Places', 'Emergency Contacts', 'Notifications', 'Activity'] as const
type ProfileTab = typeof PROFILE_TABS[number]

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState<string | null>(null)

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [profileTab, setProfileTab] = useState<ProfileTab>('Overview')
  const [tabData, setTabData] = useState<unknown[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  const [showBanModal, setShowBanModal] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ full_name: '', phone_number: '', email: '' })
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [notifyTarget, setNotifyTarget] = useState<'all' | 'individual'>('all')
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [notifySuccess, setNotifySuccess] = useState(false)
  const [notifyError, setNotifyError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const openNotifyModal = (target: 'all' | 'individual') => {
    setNotifyTarget(target)
    setNotifyTitle('')
    setNotifyMessage('')
    setNotifySuccess(false)
    setNotifyError(null)
    setShowNotifyModal(true)
  }

  const handleSendNotification = async () => {
    if (!notifyTitle.trim() || !notifyMessage.trim()) return
    setIsSending(true)
    setNotifyError(null)
    try {
      if (notifyTarget === 'all') {
        await supabaseService.sendNotification({ title: notifyTitle, message: notifyMessage, target: 'all' })
      } else if (selectedCustomer) {
        await supabaseService.sendTargetedNotification({ user_ids: [selectedCustomer.id], title: notifyTitle, message: notifyMessage })
      }
      setNotifySuccess(true)
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : 'Failed to send notification')
    } finally {
      setIsSending(false)
    }
  }

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true)
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (statusFilter !== 'all') params.status = statusFilter
      const data = await supabaseService.getCustomers(params)
      setCustomers(data as Customer[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { void loadCustomers() }, [loadCustomers])

  const openCustomer = async (customerId: string) => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getCustomerDetail(customerId)
      setSelectedCustomer(data as CustomerDetail)
      setProfileTab('Overview')
      setTabData([])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTabData = async (tab: ProfileTab, customerId: string) => {
    setTabLoading(true)
    setTabData([])
    try {
      switch (tab) {
        case 'Trips': setTabData(await supabaseService.getCustomerTrips(customerId)); break
        case 'Saved Places': setTabData(await supabaseService.getCustomerSavedAddresses(customerId)); break
        case 'Emergency Contacts': setTabData(await supabaseService.getCustomerEmergencyContacts(customerId)); break
        case 'Notifications': setTabData(await supabaseService.getCustomerNotifications(customerId)); break
        case 'Activity': {
          const d = await supabaseService.getCustomerActivity(customerId)
          setTabData(Array.isArray(d) ? d : [d])
          break
        }
        default: break
      }
    } catch { /* ignore */ }
    setTabLoading(false)
  }

  const handleTabSwitch = (tab: ProfileTab) => {
    setProfileTab(tab)
    if (selectedCustomer && tab !== 'Overview') void loadTabData(tab, selectedCustomer.id)
  }

  const handleBan = async () => {
    if (!selectedCustomer || !banReason.trim()) return
    try {
      setIsProcessing(true)
      await supabaseService.banCustomer(selectedCustomer.id, banReason)
      setSelectedCustomer({ ...selectedCustomer, is_banned: true, status: 'banned' })
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, is_banned: true, status: 'banned' } : c))
      setShowBanModal(false)
      setBanReason('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to ban customer') }
    finally { setIsProcessing(false) }
  }

  const handleUnban = async () => {
    if (!selectedCustomer) return
    try {
      setIsProcessing(true)
      await supabaseService.unbanCustomer(selectedCustomer.id)
      setSelectedCustomer({ ...selectedCustomer, is_banned: false, status: 'active' })
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, is_banned: false, status: 'active' } : c))
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to unban customer') }
    finally { setIsProcessing(false) }
  }

  const handleAddCustomer = async () => {
    if (!addForm.full_name.trim() || !addForm.phone_number.trim()) return
    setIsAdding(true)
    setAddError(null)
    try {
      await supabaseService.createCustomer({
        full_name: addForm.full_name.trim(),
        phone_number: addForm.phone_number.trim(),
        email: addForm.email.trim() || undefined,
      })
      setShowAddModal(false)
      setAddForm({ full_name: '', phone_number: '', email: '' })
      void loadCustomers()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create customer')
    } finally {
      setIsAdding(false)
    }
  }

  if (selectedCustomer) {
    const isBanned = selectedCustomer.is_banned || selectedCustomer.status === 'banned'
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedCustomer(null)} className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
          ← Back to Customers
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">{selectedCustomer.full_name || 'Customer'}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {selectedCustomer.phone_number && <span className="text-slate-600 text-sm">{selectedCustomer.phone_number}</span>}
              <Badge status={isBanned ? 'rejected' : 'approved'}>{isBanned ? 'Banned' : (selectedCustomer.status || 'Active')}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => openNotifyModal('individual')}>Send Notification</Button>
            {isBanned
              ? <Button variant="primary" size="sm" onClick={handleUnban} disabled={isProcessing}>Unban Customer</Button>
              : <Button variant="danger" size="sm" onClick={() => setShowBanModal(true)}>Ban Customer</Button>
            }
          </div>
        </div>

        {error && <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {PROFILE_TABS.map(tab => (
            <button key={tab} onClick={() => handleTabSwitch(tab)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${profileTab === tab ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {tab}
            </button>
          ))}
        </div>

        {profileTab === 'Overview' && (
          <Card>
            <h2 className="text-lg font-semibold text-slate-950 mb-4">Profile</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {([
                ['Full Name', selectedCustomer.full_name || 'N/A'],
                ['Phone', selectedCustomer.phone_number || 'N/A'],
                ['Email', selectedCustomer.email || 'N/A'],
                ['Gender', (selectedCustomer.gender as string) || 'not_set'],
                ['Status', selectedCustomer.status || 'active'],
                ['Total Trips', String(selectedCustomer.total_trips ?? 0)],
                ['Rating', selectedCustomer.rating ? Number(selectedCustomer.rating).toFixed(1) : 'N/A'],
                ['Joined', selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : 'N/A'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-950 mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        {profileTab !== 'Overview' && (
          <Card>
            <h2 className="text-lg font-semibold text-slate-950 mb-4">{profileTab}</h2>
            {tabLoading ? (
              <div className="flex h-40 items-center justify-center text-slate-500">Loading...</div>
            ) : profileTab === 'Saved Places' ? (
              tabData.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-slate-500">No saved places found.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(tabData as SavedPlace[]).map((place) => {
                    const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
                      HOME: { label: 'Home', icon: '🏠', color: 'bg-blue-50 border-blue-200' },
                      WORK: { label: 'Work', icon: '💼', color: 'bg-amber-50 border-amber-200' },
                    }
                    const cfg = typeConfig[place.address_type] ?? { label: place.address_type || 'Other', icon: '📍', color: 'bg-slate-50 border-slate-200' }
                    return (
                      <div key={place.id} className={`rounded-2xl border px-4 py-4 ${cfg.color}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl leading-none mt-0.5">{cfg.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-950">{place.name}</span>
                              {place.is_default && (
                                <span className="rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5">Default</span>
                              )}
                              <span className="rounded-full bg-slate-200 text-slate-600 text-xs font-medium px-2 py-0.5">{cfg.label}</span>
                            </div>
                            <p className="text-sm text-slate-700 mt-1 leading-snug">{place.display_name}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {Number(place.latitude).toFixed(5)}, {Number(place.longitude).toFixed(5)}
                            </p>
                            {place.notes && <p className="text-xs text-slate-500 italic mt-1">&ldquo;{place.notes}&rdquo;</p>}
                            <p className="text-xs text-slate-400 mt-2">Added {new Date(place.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : profileTab === 'Activity' ? (
              (() => {
                const activityItem = tabData[0] as { events?: ActivityEvent[] } | undefined
                const events = activityItem?.events ?? []
                return events.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-slate-500">No activity found.</div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                    {events.map((ev, i) => (
                      <div key={(ev.id as string) || i} className="relative">
                        <span className="absolute -left-[1.375rem] top-1.5 h-3 w-3 rounded-full bg-slate-400 border-2 border-white ring-1 ring-slate-300" />
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-slate-950 capitalize">
                              {String(ev.event_type ?? 'Event').replace(/_/g, ' ')}
                            </span>
                            {ev.timestamp && (
                              <span className="text-xs text-slate-400">
                                {new Date(ev.timestamp as string).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {ev.description && <p className="text-xs text-slate-600 mt-1">{ev.description as string}</p>}
                          {ev.details && (
                            <pre className="text-xs text-slate-500 mt-1 whitespace-pre-wrap overflow-x-auto">
                              {typeof ev.details === 'string' ? ev.details : JSON.stringify(ev.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()
            ) : profileTab === 'Emergency Contacts' ? (
              tabData.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-slate-500">No emergency contacts found.</div>
              ) : (
                <div className="space-y-3">
                  {(tabData as Array<{ id: string; name: string; phone_number: string; contact_relationship?: string; created_at: string }>).map((contact) => (
                    <div key={contact.id} className="flex items-center gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg">🆘</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-950 capitalize">{contact.name}</span>
                          {contact.contact_relationship && (
                            <span className="rounded-full bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 capitalize">
                              {contact.contact_relationship}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-0.5">{contact.phone_number}</p>
                        <p className="text-xs text-slate-400 mt-1">Added {new Date(contact.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : tabData.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-slate-500">No {profileTab.toLowerCase()} found.</div>
            ) : (
              <div className="space-y-3">
                {(tabData as Record<string, unknown>[]).map((item, i) => (
                  <div key={(item.id as string) || i} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      {Object.entries(item).map(([key, val]) => (
                        <div key={key}>
                          <dt className="text-slate-500">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</dt>
                          <dd className="font-medium text-slate-950 mt-0.5 break-all">
                            {val === null || val === undefined
                              ? '—'
                              : typeof val === 'boolean'
                              ? val ? 'Yes' : 'No'
                              : Array.isArray(val)
                              ? val.length === 0 ? 'None' : val.map(String).join(', ')
                              : typeof val === 'object'
                              ? JSON.stringify(val)
                              : key.endsWith('_at') && typeof val === 'string'
                              ? (() => { const d = new Date(val); return isNaN(d.getTime()) ? val : d.toLocaleString() })()
                              : String(val)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Modal isOpen={showNotifyModal} onClose={() => setShowNotifyModal(false)} title={notifyTarget === 'all' ? 'Notify All Customers' : `Notify ${selectedCustomer?.full_name || 'Customer'}`}>
          <div className="space-y-4">
            {notifySuccess ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="text-4xl">✅</span>
                <p className="font-semibold text-slate-950">Notification sent successfully!</p>
                <Button variant="secondary" onClick={() => setShowNotifyModal(false)}>Close</Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  {notifyTarget === 'all'
                    ? 'This will send a push notification to all active customers.'
                    : `This will send a push notification to ${selectedCustomer?.full_name || 'this customer'} only.`}
                </p>
                {notifyError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{notifyError}</div>}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                    <input
                      type="text"
                      value={notifyTitle}
                      onChange={e => setNotifyTitle(e.target.value)}
                      placeholder="e.g. Service Update"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Message</label>
                    <textarea
                      rows={4}
                      value={notifyMessage}
                      onChange={e => setNotifyMessage(e.target.value)}
                      placeholder="Write your message here..."
                      className="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowNotifyModal(false)}>Cancel</Button>
                  <Button variant="primary" onClick={handleSendNotification} disabled={!notifyTitle.trim() || !notifyMessage.trim() || isSending}>
                    {isSending ? 'Sending...' : 'Send Notification'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>

        <Modal isOpen={showBanModal} onClose={() => { setShowBanModal(false); setBanReason('') }} title="Ban Customer">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Provide a reason for the ban. This is recorded in the audit log.</p>
            <textarea
              className="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              rows={4} placeholder="Reason for ban..." value={banReason} onChange={e => setBanReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowBanModal(false); setBanReason('') }}>Cancel</Button>
              <Button variant="danger" onClick={handleBan} disabled={!banReason.trim() || isProcessing}>
                {isProcessing ? 'Banning...' : 'Confirm Ban'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Customer Operations</h1>
          <p className="mt-2 text-slate-600">Search, review, and manage customer accounts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => { setAddError(null); setShowAddModal(true) }}>+ Add Customer</Button>
          <Button variant="secondary" onClick={() => openNotifyModal('all')}>Notify All Customers</Button>
          <Button variant="secondary" onClick={loadCustomers}>Refresh</Button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadCustomers()}
            placeholder="Search by name, phone, or ID..."
            className="flex-1 min-w-48 rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <Button size="sm" variant="primary" onClick={loadCustomers}>Search</Button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <Table
          columns={[
            { key: 'full_name', label: 'Name' },
            { key: 'phone_number', label: 'Phone' },
            { key: 'status', label: 'Status', width: 'w-28' },
            { key: 'total_trips', label: 'Trips', width: 'w-20' },
            { key: 'rating', label: 'Rating', width: 'w-20' },
            { key: 'created_at', label: 'Joined', width: 'w-32' },
          ]}
          data={customers.map(c => ({
            ...c,
            full_name: c.full_name || 'N/A',
            phone_number: c.phone_number || 'N/A',
            status: c.is_banned ? 'banned' : (c.status || 'active'),
            total_trips: c.total_trips ?? 0,
            rating: c.rating ? Number(c.rating).toFixed(1) : 'N/A',
            created_at: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A',
          }))}
          onRowClick={row => void openCustomer(row.id as string)}
          isLoading={isLoading}
        />
      </Card>

      <Modal
        isOpen={showAddModal}
        title="Add New Customer"
        onClose={() => setShowAddModal(false)}
        onConfirm={handleAddCustomer}
        confirmText="Create & Send OTP"
        isConfirmLoading={isAdding}
        confirmDisabled={!addForm.full_name.trim() || !addForm.phone_number.trim()}
      >
        <div className="space-y-3">
          {addError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{addError}</div>}
          <p className="text-xs text-slate-500">The customer will receive an OTP on their phone to log in for the first time.</p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input
              type="text" value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="e.g. John Doe"
              className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number <span className="text-red-500">*</span></label>
            <input
              type="tel" value={addForm.phone_number} onChange={e => setAddForm(f => ({ ...f, phone_number: e.target.value }))}
              placeholder="e.g. +221 77 000 0000"
              className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email (optional)</label>
            <input
              type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              placeholder="e.g. john@example.com"
              className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}