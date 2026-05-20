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
            {tabLoading
              ? <div className="flex h-40 items-center justify-center text-slate-500">Loading...</div>
              : tabData.length === 0
                ? <div className="flex h-40 items-center justify-center text-slate-500">No {profileTab.toLowerCase()} found.</div>
                : <div className="space-y-3">{(tabData as Record<string, unknown>[]).map((item, i) => (
                    <div key={(item.id as string) || i} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(item, null, 2)}</pre>
                    </div>
                  ))}</div>
            }
          </Card>
        )}

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
        <Button variant="secondary" onClick={loadCustomers}>Refresh</Button>
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
    </div>
  )
}