'use client'

import { useEffect, useMemo, useState } from 'react'
import HeaderBar from '../../components/HeaderBar'
import { createClient } from '../../../lib/supabase/client'

type FeedbackItem = {
  id: string
  feedback_type: string
  question: string | null
  answer: string | null
  created_at: string
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

function displayFeedbackType(value: string) {
  return value.replaceAll('_', ' ')
}

function feedbackPillClass(value: string) {
  if (value === 'helpful') return 'bg-green-100 text-green-700'
  if (value === 'not_helpful') return 'bg-red-100 text-red-700'
  if (value === 'missing_source') return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-100 text-secondary'
}

export default function AdminFeedbackReviewPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'helpful' | 'not_helpful' | 'missing_source'>('all')
  const [notesByFeedbackId, setNotesByFeedbackId] = useState<Record<string, AdminNote[]>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)

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
        await loadFeedback()
      }

      setLoading(false)
    }

    init()
  }, [supabase])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function loadFeedback() {
    setMessage('')

    const { data, error } = await supabase
      .from('chat_feedback')
      .select('id, feedback_type, question, answer, created_at')
      .order('created_at', { ascending: false })
      .limit(250)

    if (error) {
      setMessage(`Could not load feedback: ${error.message}`)
      setFeedback([])
      return
    }

    const rows = (data ?? []) as FeedbackItem[]
    setFeedback(rows)
    await loadAdminNotes(rows.map((item) => item.id))
  }

  async function loadAdminNotes(feedbackIds: string[]) {
    if (feedbackIds.length === 0) {
      setNotesByFeedbackId({})
      return
    }

    const token = await getToken()
    if (!token) return

    const response = await fetch(`/api/admin-notes?entityType=chat_feedback&entityIds=${encodeURIComponent(feedbackIds.join(','))}`, {
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

    setNotesByFeedbackId(grouped)
  }

  async function saveAdminNote(feedbackId: string) {
    const noteText = (noteDrafts[feedbackId] ?? '').trim()

    if (!noteText) {
      setMessage('Enter a note before saving.')
      return
    }

    setSavingNoteId(feedbackId)
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
        entityType: 'chat_feedback',
        entityId: feedbackId,
        noteText,
      }),
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(`Could not save note: ${result.error ?? 'Unknown notes error.'}`)
      setSavingNoteId(null)
      return
    }

    setNoteDrafts((prev) => ({ ...prev, [feedbackId]: '' }))
    setMessage('Admin note saved.')
    setSavingNoteId(null)
    await loadAdminNotes(feedback.map((item) => item.id))
  }

  const counts = useMemo(() => {
    return {
      total: feedback.length,
      helpful: feedback.filter((item) => item.feedback_type === 'helpful').length,
      not_helpful: feedback.filter((item) => item.feedback_type === 'not_helpful').length,
      missing_source: feedback.filter((item) => item.feedback_type === 'missing_source').length,
    }
  }, [feedback])

  const filteredFeedback = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return feedback.filter((item) => {
      const matchesType = typeFilter === 'all' || item.feedback_type === typeFilter
      const matchesSearch =
        !normalizedSearch ||
        (item.question ?? '').toLowerCase().includes(normalizedSearch) ||
        (item.answer ?? '').toLowerCase().includes(normalizedSearch) ||
        item.feedback_type.toLowerCase().includes(normalizedSearch)

      return matchesType && matchesSearch
    })
  }, [feedback, search, typeFilter])

  function exportFeedbackCSV() {
    if (filteredFeedback.length === 0) return

    const headers = ['Question', 'Answer', 'Feedback Type', 'Date']
    const rows = filteredFeedback.map((item) => [
      item.question ?? '',
      item.answer ?? '',
      item.feedback_type,
      formatDate(item.created_at),
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'feedback-review.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6 text-primary">
          Loading feedback review...
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
          <p className="mt-2 text-secondary">You must be an admin to review feedback.</p>
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
                  Detailed Feedback Review
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary sm:text-base">
                  Review tester feedback with the full saved question and answer. Use this page to identify missing sources, weak answers, and trusted-answer candidates.
                </p>
              </div>

              <button type="button" onClick={loadFeedback} className={secondaryButton}>
                Refresh
              </button>
            </div>
          </section>

          {message && (
            <div className="rounded-xl border border-gray-300 bg-white p-3 text-sm text-primary shadow-sm">
              {message}
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Total', counts.total],
              ['Helpful', counts.helpful],
              ['Not helpful', counts.not_helpful],
              ['Missing source', counts.missing_source],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto] lg:items-end">
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">Search feedback</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search question, answer, or feedback type..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">Type</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className={inputClass}>
                  <option value="all">All feedback</option>
                  <option value="helpful">Helpful</option>
                  <option value="not_helpful">Not helpful</option>
                  <option value="missing_source">Missing source</option>
                </select>
              </div>

              <button type="button" onClick={exportFeedbackCSV} className={primaryButton}>
                Export shown
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setTypeFilter('all')
                }}
                className={secondaryButton}
              >
                Clear
              </button>
            </div>

            <p className="mt-3 text-sm text-secondary">
              Showing <strong>{filteredFeedback.length}</strong> of <strong>{feedback.length}</strong> feedback records.
            </p>
          </section>

          {filteredFeedback.length === 0 ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-6 text-sm text-secondary shadow-sm">
              No feedback matches the current search/filter.
            </section>
          ) : (
            <section className="grid gap-4">
              {filteredFeedback.map((item) => (
                <article key={item.id} className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${feedbackPillClass(item.feedback_type)}`}>
                          {displayFeedbackType(item.feedback_type)}
                        </span>
                        <span className="text-xs text-muted">{formatDate(item.created_at)}</span>
                      </div>

                      <section className="mt-4 rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Question</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-primary">
                          {item.question || 'No question saved'}
                        </p>
                      </section>

                      <section className="mt-3 rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Answer</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-primary">
                          {item.answer || 'No answer saved'}
                        </p>
                      </section>

                      <section className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Admin notes</p>
                          <span className="text-xs text-blue-800">{notesByFeedbackId[item.id]?.length ?? 0} note{(notesByFeedbackId[item.id]?.length ?? 0) === 1 ? '' : 's'}</span>
                        </div>

                        {(notesByFeedbackId[item.id]?.length ?? 0) > 0 && (
                          <div className="mt-3 space-y-2">
                            {notesByFeedbackId[item.id].map((note) => (
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
                            placeholder="Add internal notes, follow-up context, or reviewer decisions..."
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
