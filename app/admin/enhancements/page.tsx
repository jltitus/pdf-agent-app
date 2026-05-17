'use client'

import { useEffect, useMemo, useState } from 'react'
import HeaderBar from '../../components/HeaderBar'
import { createClient } from '../../../lib/supabase/client'

type EnhancementStatus = 'new' | 'reviewed' | 'planned' | 'in_progress' | 'resolved' | 'declined'
type EnhancementPriority = 'low' | 'medium' | 'high'

type EnhancementRequest = {
  id: string
  source_type: 'manual' | 'chat_feedback' | 'issue_report'
  source_id?: string | null
  title: string
  description: string
  status: EnhancementStatus
  priority: EnhancementPriority
  created_at: string
  updated_at?: string | null
  resolved_at?: string | null
}

type AdminNote = {
  id: string
  entity_type: string
  entity_id: string
  note_text: string
  created_at: string
  admin_user_id?: string | null
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary'
const secondaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-100 disabled:opacity-60'
const primaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-gray-800 disabled:bg-gray-700 disabled:cursor-not-allowed'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function statusDisplay(status: EnhancementStatus) {
  if (status === 'in_progress') return 'In progress'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function sourceDisplay(source: EnhancementRequest['source_type']) {
  if (source === 'chat_feedback') return 'Feedback'
  if (source === 'issue_report') return 'Issue report'
  return 'Manual'
}

function statusClass(status: EnhancementStatus) {
  if (status === 'new') return 'bg-red-100 text-red-700'
  if (status === 'reviewed') return 'bg-yellow-100 text-yellow-800'
  if (status === 'planned') return 'bg-blue-100 text-blue-700'
  if (status === 'in_progress') return 'bg-purple-100 text-purple-700'
  if (status === 'resolved') return 'bg-green-100 text-green-700'
  if (status === 'declined') return 'bg-gray-100 text-secondary'
  return 'bg-gray-100 text-secondary'
}

function priorityClass(priority: EnhancementPriority) {
  if (priority === 'high') return 'bg-red-100 text-red-700'
  if (priority === 'medium') return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-100 text-secondary'
}

export default function AdminEnhancementsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState('')
  const [enhancements, setEnhancements] = useState<EnhancementRequest[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | EnhancementStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | EnhancementPriority>('all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [notesByEnhancementId, setNotesByEnhancementId] = useState<Record<string, AdminNote[]>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)

  const [manualTitle, setManualTitle] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualPriority, setManualPriority] = useState<EnhancementPriority>('medium')
  const [creatingManual, setCreatingManual] = useState(false)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user

      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin' && profile?.is_active) {
        setIsAdmin(true)
        await loadEnhancements()
      }

      setLoading(false)
    }

    init()
  }, [supabase])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function loadEnhancements() {
    setMessage('')
    const token = await getToken()

    if (!token) {
      setMessage('You must be signed in.')
      return
    }

    const response = await fetch('/api/enhancement-requests', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(`Could not load enhancements: ${result.error ?? 'Unknown enhancement error.'}`)
      setEnhancements([])
      return
    }

    const rows = (result.enhancements ?? []) as EnhancementRequest[]
    setEnhancements(rows)
    await loadAdminNotes(rows.map((item) => item.id))
  }

  async function loadAdminNotes(enhancementIds: string[]) {
    if (enhancementIds.length === 0) {
      setNotesByEnhancementId({})
      return
    }

    const token = await getToken()
    if (!token) return

    const response = await fetch(`/api/admin-notes?entityType=enhancement_request&entityIds=${encodeURIComponent(enhancementIds.join(','))}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(`Could not load admin notes: ${result.error ?? 'Unknown notes error.'}`)
      return
    }

    const grouped = (result.notes ?? []).reduce((acc: Record<string, AdminNote[]>, note: AdminNote) => {
      acc[note.entity_id] = acc[note.entity_id] ?? []
      acc[note.entity_id].push(note)
      return acc
    }, {})

    setNotesByEnhancementId(grouped)
  }

  async function createManualEnhancement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!manualTitle.trim() || !manualDescription.trim()) {
      setMessage('Add a title and description before creating an enhancement.')
      return
    }

    setCreatingManual(true)
    setMessage('Creating enhancement...')

    const token = await getToken()
    if (!token) {
      setMessage('You must be signed in.')
      setCreatingManual(false)
      return
    }

    const response = await fetch('/api/enhancement-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sourceType: 'manual',
        title: manualTitle,
        description: manualDescription,
        priority: manualPriority,
        status: 'new',
      }),
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(`Could not create enhancement: ${result.error ?? 'Unknown enhancement error.'}`)
      setCreatingManual(false)
      return
    }

    setManualTitle('')
    setManualDescription('')
    setManualPriority('medium')
    setMessage('Enhancement created.')
    setCreatingManual(false)
    await loadEnhancements()
  }

  async function updateEnhancement(id: string, updates: { status?: EnhancementStatus; priority?: EnhancementPriority }) {
    setSavingId(id)
    setMessage('Updating enhancement...')

    const token = await getToken()
    if (!token) {
      setMessage('You must be signed in.')
      setSavingId(null)
      return
    }

    const response = await fetch('/api/enhancement-requests', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, ...updates }),
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(`Could not update enhancement: ${result.error ?? 'Unknown update error.'}`)
      setSavingId(null)
      return
    }

    setMessage('Enhancement updated.')
    setSavingId(null)
    await loadEnhancements()
  }

  async function saveAdminNote(enhancementId: string) {
    const noteText = (noteDrafts[enhancementId] ?? '').trim()

    if (!noteText) {
      setMessage('Enter a note before saving.')
      return
    }

    setSavingNoteId(enhancementId)
    setMessage('Saving admin note...')

    const token = await getToken()
    if (!token) {
      setMessage('You must be signed in.')
      setSavingNoteId(null)
      return
    }

    const response = await fetch('/api/admin-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        entityType: 'enhancement_request',
        entityId: enhancementId,
        noteText,
      }),
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(`Could not save note: ${result.error ?? 'Unknown notes error.'}`)
      setSavingNoteId(null)
      return
    }

    setNoteDrafts((prev) => ({ ...prev, [enhancementId]: '' }))
    setMessage('Admin note saved.')
    setSavingNoteId(null)
    await loadAdminNotes(enhancements.map((item) => item.id))
  }

  const counts = useMemo(() => {
    return {
      total: enhancements.length,
      new: enhancements.filter((item) => item.status === 'new').length,
      reviewed: enhancements.filter((item) => item.status === 'reviewed').length,
      planned: enhancements.filter((item) => item.status === 'planned').length,
      in_progress: enhancements.filter((item) => item.status === 'in_progress').length,
      resolved: enhancements.filter((item) => item.status === 'resolved').length,
    }
  }, [enhancements])

  const filteredEnhancements = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return enhancements.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter
      const matchesSearch =
        !normalizedSearch ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.description.toLowerCase().includes(normalizedSearch) ||
        item.source_type.toLowerCase().includes(normalizedSearch) ||
        item.status.toLowerCase().includes(normalizedSearch) ||
        item.priority.toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesPriority && matchesSearch
    })
  }, [enhancements, search, statusFilter, priorityFilter])

  if (loading) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6 text-primary">
          Loading enhancements...
        </main>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6 text-primary">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-secondary">You must be an admin to review enhancements.</p>
        </main>
      </>
    )
  }

  return (
    <>
      <HeaderBar />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 text-primary">
        <div className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
          <section className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <a href="/admin" className="text-sm font-semibold text-blue-700 hover:underline">
                  ← Back to admin
                </a>
                <h1 className="mt-2 text-2xl font-bold leading-tight text-primary sm:text-3xl">
                  Enhancement Tracking
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary sm:text-base">
                  Track app improvements from feedback, issue reports, and manual admin ideas. Use status and priority to manage what should be reviewed, planned, built, or closed.
                </p>
              </div>

              <button type="button" onClick={loadEnhancements} className={secondaryButton}>
                Refresh
              </button>
            </div>
          </section>

          {message && (
            <div className="rounded-xl border border-gray-300 bg-white p-3 text-sm text-primary shadow-sm">
              {message}
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {[
              ['Total', counts.total, 'all'],
              ['New', counts.new, 'new'],
              ['Reviewed', counts.reviewed, 'reviewed'],
              ['Planned', counts.planned, 'planned'],
              ['In progress', counts.in_progress, 'in_progress'],
              ['Resolved', counts.resolved, 'resolved'],
            ].map(([label, value, status]) => (
              <button
                key={String(label)}
                type="button"
                onClick={() => setStatusFilter(status as typeof statusFilter)}
                className="rounded-2xl border border-gray-300 bg-white p-4 text-left shadow-sm hover:bg-gray-50"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
              </button>
            ))}
          </section>

          <section className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-5">
            <form onSubmit={createManualEnhancement} className="space-y-3">
              <div>
                <h2 className="text-xl font-bold text-primary">Add manual enhancement</h2>
                <p className="text-sm text-secondary">Use this for feature ideas that did not come from a specific feedback or issue record.</p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-primary">Title</label>
                  <input
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Example: Add printable answer view"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-primary">Priority</label>
                  <select value={manualPriority} onChange={(e) => setManualPriority(e.target.value as EnhancementPriority)} className={inputClass}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">Description</label>
                <textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Describe the requested improvement, why it matters, and any notes for implementation."
                  className="min-h-[96px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary"
                />
              </div>

              <button type="submit" disabled={creatingManual} className={primaryButton}>
                {creatingManual ? 'Creating...' : 'Create enhancement'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_auto] lg:items-end">
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">Search enhancements</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, description, source, status, or priority..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={inputClass}>
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">Priority</label>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)} className={inputClass}>
                  <option value="all">All priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                  setPriorityFilter('all')
                }}
                className={secondaryButton}
              >
                Clear filters
              </button>
            </div>

            <p className="mt-3 text-sm text-secondary">
              Showing <strong>{filteredEnhancements.length}</strong> of <strong>{enhancements.length}</strong> enhancement records.
            </p>
          </section>

          {filteredEnhancements.length === 0 ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-6 text-sm text-secondary shadow-sm">
              No enhancements match the current search/filter.
            </section>
          ) : (
            <section className="grid gap-4">
              {filteredEnhancements.map((item) => (
                <article key={item.id} className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-primary">{item.title}</h2>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                          {statusDisplay(item.status)}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${priorityClass(item.priority)}`}>
                          {item.priority} priority
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-muted">
                        Source: {sourceDisplay(item.source_type)} • Created {formatDate(item.created_at)}
                      </p>

                      <section className="mt-4 rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Description</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-primary">{item.description}</p>
                      </section>

                      <section className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Admin notes</p>
                          <span className="text-xs text-blue-800">{notesByEnhancementId[item.id]?.length ?? 0} note{(notesByEnhancementId[item.id]?.length ?? 0) === 1 ? '' : 's'}</span>
                        </div>

                        {(notesByEnhancementId[item.id]?.length ?? 0) > 0 && (
                          <div className="mt-3 space-y-2">
                            {notesByEnhancementId[item.id].map((note) => (
                              <div key={note.id} className="rounded-lg border border-blue-100 bg-white p-3">
                                <p className="whitespace-pre-wrap text-sm text-primary">{note.note_text}</p>
                                <p className="mt-1 text-xs text-muted">{formatDate(note.created_at)}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 grid gap-2">
                          <textarea
                            value={noteDrafts[item.id] ?? ''}
                            onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Add implementation notes, decisions, or release context..."
                            className="min-h-[88px] w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-primary"
                          />
                          <button
                            type="button"
                            onClick={() => saveAdminNote(item.id)}
                            disabled={savingNoteId === item.id}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold !text-white hover:bg-blue-800 disabled:bg-blue-300 sm:w-fit"
                          >
                            {savingNoteId === item.id ? 'Saving note...' : 'Save note'}
                          </button>
                        </div>
                      </section>
                    </div>

                    <div className="grid shrink-0 gap-2 lg:w-60">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted">Status</label>
                      <select
                        value={item.status}
                        onChange={(e) => updateEnhancement(item.id, { status: e.target.value as EnhancementStatus })}
                        disabled={savingId === item.id}
                        className={inputClass}
                      >
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="planned">Planned</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="declined">Declined</option>
                      </select>

                      <label className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Priority</label>
                      <select
                        value={item.priority}
                        onChange={(e) => updateEnhancement(item.id, { priority: e.target.value as EnhancementPriority })}
                        disabled={savingId === item.id}
                        className={inputClass}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </>
  )
}
