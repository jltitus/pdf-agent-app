'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'

type UserRow = {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  full_name: string | null
  role: string | null
  is_active: boolean | null
  city: string | null
  state: string | null
  mfp_affiliation: string | null
  last_login_at: string | null
  last_activity_at: string | null
  last_chat_at: string | null
  total_questions_asked: number
  avatar_url: string | null
  has_profile: boolean
}

const primaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-xl bg-[#d73f09] px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#b23408] disabled:bg-[#e8a08a] disabled:cursor-not-allowed'
const secondaryButton =
  'inline-flex min-h-9 items-center justify-center rounded-xl border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm hover:bg-[#f3f0ed] disabled:opacity-60'
const inputClass =
  'w-full min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary shadow-sm'
const cardClass =
  'rounded-3xl border border-[#d8d1c7] bg-white p-4 shadow-sm sm:p-6'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function formatRelative(value?: string | null) {
  if (!value) return '—'
  const diff = Date.now() - new Date(value).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'no_profile'>('all')
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null)
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        window.location.href = '/login'
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.session.user.id)
        .single()
      if (profile?.role === 'admin' && profile?.is_active) {
        setIsAdmin(true)
        setCurrentUserId(data.session.user.id)
        await loadUsers()
      }
      setLoading(false)
    }
    init()
  }, [])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function loadUsers() {
    const token = await getToken()
    if (!token) return
    const res = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await res.json().catch(() => ({}))
    if (res.ok) {
      setUsers(
        [...(result.users ?? [])].sort((a: UserRow, b: UserRow) =>
          (a.full_name ?? a.email ?? '').localeCompare(b.full_name ?? b.email ?? '')
        )
      )
    } else {
      setMessage(result.error ?? 'Failed to load users.')
    }
  }

  async function updateUserStatus(user: UserRow, isActive: boolean) {
    const action = isActive ? 'reactivate' : 'deactivate'
    if (!confirm(`Are you sure you want to ${action} ${user.full_name ?? user.email}?`)) return
    setUpdatingEmail(user.email)
    setMessage(isActive ? 'Reactivating…' : 'Deactivating…')
    const token = await getToken()
    if (!token) { setUpdatingEmail(null); return }
    const res = await fetch('/api/update-user-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: user.email, isActive }),
    })
    const result = await res.json().catch(() => ({}))
    setMessage(res.ok ? (result.message ?? (isActive ? 'User reactivated.' : 'User deactivated.')) : (result.error ?? 'Update failed.'))
    setUpdatingEmail(null)
    if (res.ok) await loadUsers()
  }

  async function changeRole(user: UserRow, role: 'admin' | 'user') {
    const action = role === 'admin' ? 'grant admin access to' : 'remove admin access from'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.full_name ?? user.email}?`)) return
    setChangingRoleId(user.id)
    setMessage(`Updating role…`)
    const token = await getToken()
    if (!token) { setChangingRoleId(null); return }
    const res = await fetch('/api/admin/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: user.id, role }),
    })
    const result = await res.json().catch(() => ({}))
    setMessage(res.ok ? (result.message ?? 'Role updated.') : (result.error ?? 'Update failed.'))
    setChangingRoleId(null)
    if (res.ok) await loadUsers()
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`Delete ${user.full_name ?? user.email}? This removes their login account and profile. Chat history remains.`)) return
    if (!confirm('This cannot be undone. Confirm permanent deletion?')) return
    setDeletingEmail(user.email)
    setMessage('Deleting user…')
    const token = await getToken()
    if (!token) { setDeletingEmail(null); return }
    const res = await fetch('/api/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: user.email }),
    })
    const result = await res.json().catch(() => ({}))
    setMessage(res.ok ? (result.message ?? 'User deleted.') : (result.error ?? 'Delete failed.'))
    setDeletingEmail(null)
    if (res.ok) await loadUsers()
  }

  const filtered = users.filter((u) => {
    const s = search.trim().toLowerCase()
    const matchesSearch =
      !s ||
      (u.full_name ?? '').toLowerCase().includes(s) ||
      (u.email ?? '').toLowerCase().includes(s) ||
      (u.mfp_affiliation ?? '').toLowerCase().includes(s) ||
      (u.city ?? '').toLowerCase().includes(s) ||
      (u.state ?? '').toLowerCase().includes(s)
    const matchesRole =
      roleFilter === 'all' || u.role === roleFilter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active === true) ||
      (statusFilter === 'inactive' && u.is_active === false) ||
      (statusFilter === 'no_profile' && !u.has_profile)
    return matchesSearch && matchesRole && matchesStatus
  })

  const totalActive = users.filter((u) => u.is_active === true).length
  const totalInactive = users.filter((u) => u.is_active === false).length
  const totalAdmin = users.filter((u) => u.role === 'admin').length
  const totalNoProfile = users.filter((u) => !u.has_profile).length

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] px-4 py-10">
        <p className="text-center text-secondary">Loading…</p>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] px-4 py-10">
        <p className="text-center text-red-700 font-semibold">Admin access required.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#d73f09]">Admin</p>
            <h1 className="text-2xl font-bold text-primary">User management</h1>
            <p className="mt-1 text-sm text-secondary">{users.length} total accounts</p>
          </div>
          <a
            href="/admin"
            className={secondaryButton}
          >
            ← Admin dashboard
          </a>
        </div>

        {message && (
          <div className="rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm font-medium text-primary shadow-sm">
            {message}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Active', value: totalActive, color: 'text-green-700' },
            { label: 'Inactive', value: totalInactive, color: 'text-red-700' },
            { label: 'Admins', value: totalAdmin, color: 'text-[#d73f09]' },
            { label: 'No profile', value: totalNoProfile, color: 'text-secondary' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#d8d1c7] bg-white p-4 shadow-sm text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-xs text-secondary">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className={cardClass}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, affiliation, location…"
              className={`${inputClass} sm:flex-1`}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary shadow-sm"
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary shadow-sm"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="no_profile">No profile</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-secondary">{filtered.length} of {users.length} users shown</p>
        </div>

        {/* User list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className={`${cardClass} text-center text-secondary`}>No users match your filters.</div>
          ) : (
            filtered.map((user) => {
              const isExpanded = expandedId === user.id
              return (
                <div key={user.id} className={cardClass}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: identity */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3f0ed] text-lg font-bold text-[#d73f09]">
                        {(user.full_name ?? user.email ?? '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-primary truncate">
                          {user.full_name ?? <span className="text-secondary italic">No name</span>}
                        </p>
                        <p className="text-xs text-secondary truncate">{user.email}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            user.is_active === true
                              ? 'bg-green-100 text-green-700'
                              : user.is_active === false
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-secondary'
                          }`}>
                            {user.is_active === true ? 'Active' : user.is_active === false ? 'Inactive' : 'No profile'}
                          </span>
                          {user.role && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              user.role === 'admin' ? 'bg-[#f7f0dd] text-[#d73f09]' : 'bg-[#f3f0ed] text-secondary'
                            }`}>
                              {user.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: quick stats + actions */}
                    <div className="flex flex-col gap-2 sm:items-end sm:text-right shrink-0">
                      <div className="text-xs text-secondary space-y-0.5">
                        <p>Last active: <strong className="text-primary">{formatRelative(user.last_activity_at)}</strong></p>
                        <p>Questions: <strong className="text-primary">{user.total_questions_asked ?? 0}</strong></p>
                        <p>Joined: <strong className="text-primary">{formatDate(user.created_at)}</strong></p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : user.id)}
                          className={secondaryButton}
                        >
                          {isExpanded ? 'Hide details' : 'Details'}
                        </button>
                        {user.has_profile && (
                          <button
                            type="button"
                            onClick={() => updateUserStatus(user, !user.is_active)}
                            disabled={updatingEmail === user.email}
                            className={secondaryButton}
                          >
                            {updatingEmail === user.email
                              ? '…'
                              : user.is_active
                                ? 'Deactivate'
                                : 'Reactivate'}
                          </button>
                        )}
                        {user.has_profile && user.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => changeRole(user, user.role === 'admin' ? 'user' : 'admin')}
                            disabled={changingRoleId === user.id}
                            className={`inline-flex min-h-9 items-center justify-center rounded-xl border px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
                              user.role === 'admin'
                                ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                                : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            }`}
                          >
                            {changingRoleId === user.id ? '…' : user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteUser(user)}
                          disabled={deletingEmail === user.email}
                          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingEmail === user.email ? '…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-4 rounded-2xl bg-[#fcfaf7] p-4 text-sm space-y-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 text-xs">
                        <div><p className="font-semibold text-secondary">Auth ID</p><p className="text-primary font-mono break-all">{user.id}</p></div>
                        <div><p className="font-semibold text-secondary">Location</p><p className="text-primary">{[user.city, user.state].filter(Boolean).join(', ') || '—'}</p></div>
                        <div><p className="font-semibold text-secondary">Affiliation</p><p className="text-primary">{user.mfp_affiliation ?? '—'}</p></div>
                        <div><p className="font-semibold text-secondary">Last login</p><p className="text-primary">{formatDate(user.last_login_at ?? user.last_sign_in_at)}</p></div>
                        <div><p className="font-semibold text-secondary">Last chat</p><p className="text-primary">{formatDate(user.last_chat_at)}</p></div>
                        <div><p className="font-semibold text-secondary">Has profile</p><p className="text-primary">{user.has_profile ? 'Yes' : 'No'}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
