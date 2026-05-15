import React, { useState, useEffect } from 'react'
import { Card, Badge, Button } from '../components'
import { supabaseService, AdminUserItem, IpAllowlistEntry, AdminSession } from '../services/supabaseService'
import { useAuth } from '../context/AuthContext'

type Tab = 'Admins' | 'IP Allowlist' | 'Sessions'

const ROLE_OPTIONS = ['readonly', 'support', 'finance', 'operations', 'super_admin']

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'danger',
  operations: 'info',
  finance: 'success',
  support: 'warning',
  readonly: 'neutral',
}

function RoleBadge({ role }: { role?: string | null }) {
  const r = role ?? 'readonly'
  return <Badge status={ROLE_BADGE[r] as any}>{r.replace('_', ' ')}</Badge>
}

export const AdminUsersView: React.FC = () => {
  const { user: me } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('Admins')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-brand-950">Admin User Management</h1>
        <p className="mt-1 text-brand-600">Manage admin accounts, roles, IP allowlist, and active sessions.</p>
      </div>

      <div className="flex gap-1 border-b border-brand-200">
        {(['Admins', 'IP Allowlist', 'Sessions'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-accent-600 text-accent-700'
                : 'text-brand-500 hover:text-brand-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Admins' && <AdminsTab currentUserId={me?.id} />}
      {activeTab === 'IP Allowlist' && <IpAllowlistTab />}
      {activeTab === 'Sessions' && <SessionsTab />}
    </div>
  )
}

// ── Admins Tab ────────────────────────────────────────────────────────────────

const AdminsTab: React.FC<{ currentUserId?: string }> = ({ currentUserId }) => {
  const [admins, setAdmins] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminUserItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [createForm, setCreateForm] = useState({
    email: '', full_name: '', phone_number: '', password: '', admin_role: 'readonly',
  })
  const [editForm, setEditForm] = useState({
    full_name: '', phone_number: '', admin_role: 'readonly', is_active: true,
  })

  useEffect(() => { fetchAdmins() }, [])

  async function fetchAdmins() {
    setLoading(true)
    setError(null)
    try {
      const resp = await supabaseService.listAdminUsers()
      setAdmins(resp.admins)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load admin users')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setActionLoading(true)
    setError(null)
    try {
      await supabaseService.createAdminUser(createForm)
      setShowCreate(false)
      setCreateForm({ email: '', full_name: '', phone_number: '', password: '', admin_role: 'readonly' })
      fetchAdmins()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to create admin')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setActionLoading(true)
    setError(null)
    try {
      await supabaseService.updateAdminUser(editTarget.id, editForm)
      setEditTarget(null)
      fetchAdmins()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to update admin')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDisable(admin: AdminUserItem) {
    if (admin.id === currentUserId) return
    if (!window.confirm(`Disable ${admin.full_name || admin.email}? They will lose admin access.`)) return
    setActionLoading(true)
    try {
      await supabaseService.disableAdminUser(admin.id)
      fetchAdmins()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to disable admin')
    } finally {
      setActionLoading(false)
    }
  }

  function openEdit(admin: AdminUserItem) {
    setEditForm({
      full_name: admin.full_name ?? '',
      phone_number: admin.phone_number ?? '',
      admin_role: admin.admin_role ?? 'readonly',
      is_active: admin.is_active,
    })
    setEditTarget(admin)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-500">{admins.length} admin account{admins.length !== 1 ? 's' : ''}</p>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ New Admin</Button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />
          </div>
        ) : admins.length === 0 ? (
          <p className="py-8 text-center text-sm text-brand-400">No admin users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-500">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">2FA</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Last Login</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {admins.map(a => (
                  <tr key={a.id} className="hover:bg-brand-50/50">
                    <td className="py-3 pr-4 font-medium text-brand-900">{a.full_name || '—'}</td>
                    <td className="py-3 pr-4 text-brand-600">{a.email || '—'}</td>
                    <td className="py-3 pr-4"><RoleBadge role={a.admin_role} /></td>
                    <td className="py-3 pr-4">
                      <Badge status={a.two_fa_enabled ? 'success' : 'neutral'}>
                        {a.two_fa_enabled ? 'Enabled' : 'Off'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge status={a.is_active ? 'active' : 'suspended'}>{a.is_active ? 'Active' : 'Disabled'}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-brand-500 whitespace-nowrap">
                      {a.last_login_at ? new Date(a.last_login_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(a)}>Edit</Button>
                        {a.id !== currentUserId && a.is_active && (
                          <Button variant="danger" size="sm" onClick={() => handleDisable(a)} isLoading={actionLoading}>
                            Disable
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create Admin User" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Full Name">
              <input required value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Email">
              <input type="email" required value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Phone (optional)">
              <input value={createForm.phone_number} onChange={e => setCreateForm(f => ({ ...f, phone_number: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Temporary Password">
              <input type="password" required minLength={8} value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Role">
              <RoleSelect value={createForm.admin_role} onChange={v => setCreateForm(f => ({ ...f, admin_role: v }))} />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" type="submit" isLoading={actionLoading}>Create Admin</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal title={`Edit — ${editTarget.full_name || editTarget.email}`} onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Full Name">
              <input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={editForm.phone_number} onChange={e => setEditForm(f => ({ ...f, phone_number: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Role">
              <RoleSelect value={editForm.admin_role} onChange={v => setEditForm(f => ({ ...f, admin_role: v }))} />
            </Field>
            <Field label="Status">
              <select value={editForm.is_active ? 'active' : 'disabled'} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value === 'active' }))} className={inputCls}>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button variant="primary" type="submit" isLoading={actionLoading}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── IP Allowlist Tab ──────────────────────────────────────────────────────────

const IpAllowlistTab: React.FC = () => {
  const [entries, setEntries] = useState<IpAllowlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ipCidr, setIpCidr] = useState('')
  const [label, setLabel] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    setLoading(true)
    try {
      const resp = await supabaseService.listIpAllowlist()
      setEntries(resp.entries)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load IP allowlist')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!ipCidr.trim()) return
    setAdding(true)
    try {
      await supabaseService.addIpAllowlist({ ip_cidr: ipCidr.trim(), label: label.trim() || undefined })
      setIpCidr('')
      setLabel('')
      fetchList()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to add IP')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm('Remove this IP from the allowlist?')) return
    try {
      await supabaseService.removeIpAllowlist(id)
      fetchList()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to remove IP')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          When entries are present, only listed IPs may access the admin portal. Leave empty to allow all IPs.
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleAdd} className="mb-6 flex flex-wrap gap-3">
          <input
            value={ipCidr}
            onChange={e => setIpCidr(e.target.value)}
            placeholder="IP or CIDR (e.g. 192.168.1.1 or 10.0.0.0/24)"
            className={`${inputCls} flex-1 min-w-[200px]`}
            required
          />
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className={`${inputCls} w-40`}
          />
          <Button variant="primary" size="sm" type="submit" isLoading={adding}>Add IP</Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-brand-400">No IP restrictions configured. All IPs are allowed.</p>
        ) : (
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id} className="flex items-center justify-between rounded-xl border border-brand-100 px-4 py-3">
                <div>
                  <p className="font-mono text-sm font-medium text-brand-900">{e.ip_cidr}</p>
                  {e.label && <p className="text-xs text-brand-500">{e.label}</p>}
                  <p className="text-xs text-brand-400">{new Date(e.created_at).toLocaleDateString()}</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => handleRemove(e.id)}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────

const SessionsTab: React.FC = () => {
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchSessions() }, [])

  async function fetchSessions() {
    setLoading(true)
    try {
      const resp = await supabaseService.listAdminSessions({ limit: 50 })
      setSessions(resp.sessions)
      setTotal(resp.total)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-500">{total} session{total !== 1 ? 's' : ''} recorded</p>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-brand-400">No sessions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-500">
                  <th className="pb-3 pr-4">Admin</th>
                  <th className="pb-3 pr-4">IP Address</th>
                  <th className="pb-3 pr-4">Started</th>
                  <th className="pb-3 pr-4">Expires</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {sessions.map(s => {
                  const expired = new Date(s.expires_at) < new Date()
                  return (
                    <tr key={s.id} className="hover:bg-brand-50/50">
                      <td className="py-3 pr-4 text-brand-700">{s.admin_email || s.admin_user_id.slice(0, 8)}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-brand-600">{s.ip_address || '—'}</td>
                      <td className="py-3 pr-4 text-brand-500 whitespace-nowrap">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-brand-500 whitespace-nowrap">{new Date(s.expires_at).toLocaleString()}</td>
                      <td className="py-3">
                        <Badge status={s.is_active && !expired ? 'active' : 'neutral'}>
                          {s.is_active && !expired ? 'Active' : 'Ended'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-brand-900 placeholder-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brand-700">{label}</label>
      {children}
    </div>
  )
}

function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
      {ROLE_OPTIONS.map(r => (
        <option key={r} value={r}>{r.replace('_', ' ')}</option>
      ))}
    </select>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-950">{title}</h2>
          <button onClick={onClose} className="text-brand-400 hover:text-brand-700 transition-colors text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
