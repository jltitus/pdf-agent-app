'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'

type TrustedAnswer = {
  id: string
  question: string
  answer: string
  category: string | null
  answer_mode: string | null
  is_active: boolean
  created_at: string
}

type SimilarMatch = {
  chatId: string
  chatQuestion: string
  createdAt: string
  matchedTrustedId: string
  matchedQuestion: string
  similarity: number
}

const primaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-xl bg-[#d73f09] px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#b23408] disabled:bg-[#e8a08a] disabled:cursor-not-allowed'
const secondaryButton =
  'inline-flex min-h-9 items-center justify-center rounded-xl border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm hover:bg-[#f3f0ed] disabled:opacity-60'
const inputClass =
  'w-full min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary shadow-sm'
const textareaClass =
  'w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary shadow-sm'
const cardClass =
  'rounded-3xl border border-[#d8d1c7] bg-white p-4 shadow-sm sm:p-6'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

const CATEGORIES = [
  'Canning', 'Drying', 'Freezing', 'Fermentation', 'Jam & Jelly',
  'Pickling', 'Safety', 'Storage',
]
const ANSWER_MODES = [
  { value: 'general', label: 'General question' },
  { value: 'recipe', label: 'Find a recipe' },
  { value: 'compare', label: 'Compare documents' },
  { value: 'safety', label: 'Safety guidance' },
]

export default function AdminTrustedAnswersPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [answers, setAnswers] = useState<TrustedAnswer[]>([])
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newMode, setNewMode] = useState('general')
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [similarMatches, setSimilarMatches] = useState<SimilarMatch[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [similarLoaded, setSimilarLoaded] = useState(false)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase
        .from('profiles').select('role, is_active').eq('id', data.session.user.id).single()
      if (profile?.role === 'admin' && profile?.is_active) {
        setIsAdmin(true)
        await loadAnswers()
      }
      setLoading(false)
    }
    init()
  }, [])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function loadAnswers() {
    const { data, error } = await supabase
      .from('trusted_answers')
      .select('id, question, answer, category, answer_mode, is_active, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) setAnswers(data as TrustedAnswer[])
  }

  async function createAnswer(e: React.FormEvent) {
    e.preventDefault()
    if (!newQuestion.trim() || !newAnswer.trim()) {
      setMessage('Question and answer are required.')
      return
    }
    setCreating(true)
    setMessage('')
    const token = await getToken()
    if (!token) { setCreating(false); return }
    const res = await fetch('/api/trusted-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        category: newCategory || null,
        answerMode: newMode,
        sources: [],
      }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(result.error ?? 'Failed to create trusted answer.')
      setCreating(false)
      return
    }
    setMessage('Trusted answer created.')
    setNewQuestion('')
    setNewAnswer('')
    setNewCategory('')
    setNewMode('general')
    setShowCreateForm(false)
    setCreating(false)
    await loadAnswers()
  }

  function startEdit(item: TrustedAnswer) {
    setEditingId(item.id)
    setEditQuestion(item.question)
    setEditAnswer(item.answer)
    setExpandedId(item.id)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditQuestion('')
    setEditAnswer('')
  }

  async function saveEdit(item: TrustedAnswer) {
    setSavingId(item.id)
    setMessage('Saving…')
    const { error } = await supabase
      .from('trusted_answers')
      .update({ question: editQuestion, answer: editAnswer, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    setMessage(error ? `Update failed: ${error.message}` : 'Trusted answer updated.')
    setSavingId(null)
    if (!error) { cancelEdit(); await loadAnswers() }
  }

  async function toggleActive(item: TrustedAnswer) {
    setTogglingId(item.id)
    setMessage(item.is_active ? 'Deactivating…' : 'Activating…')
    const { error } = await supabase
      .from('trusted_answers')
      .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    setMessage(error ? `Failed: ${error.message}` : item.is_active ? 'Deactivated.' : 'Activated.')
    setTogglingId(null)
    await loadAnswers()
  }

  async function deleteAnswer(item: TrustedAnswer) {
    if (!confirm(`Delete trusted answer for: "${item.question}"? This cannot be undone.`)) return
    setDeletingId(item.id)
    setMessage('Deleting…')
    const { error } = await supabase.from('trusted_answers').delete().eq('id', item.id)
    setMessage(error ? `Delete failed: ${error.message}` : 'Trusted answer deleted.')
    setDeletingId(null)
    await loadAnswers()
  }

  async function loadSimilarMatches() {
    setSimilarLoading(true)
    const token = await getToken()
    if (!token) { setSimilarLoading(false); return }
    const res = await fetch('/api/admin/similar-questions', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await res.json().catch(() => ({}))
    if (res.ok) setSimilarMatches(result.matches ?? [])
    setSimilarLoading(false)
    setSimilarLoaded(true)
  }

  const filtered = answers.filter((item) => {
    const s = search.trim().toLowerCase()
    const matchesSearch =
      !s ||
      item.question.toLowerCase().includes(s) ||
      item.answer.toLowerCase().includes(s) ||
      (item.category ?? '').toLowerCase().includes(s)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.is_active) ||
      (statusFilter === 'inactive' && !item.is_active)
    return matchesSearch && matchesStatus
  })

  const activeCount = answers.filter((a) => a.is_active).length

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
      <div className="mx-auto max-w-4xl space-y-5">

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#d73f09]">Admin</p>
            <h1 className="text-2xl font-bold text-primary">Trusted answers</h1>
            <p className="mt-1 text-sm text-secondary">
              {answers.length} total · {activeCount} active
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/admin" className={secondaryButton}>← Dashboard</a>
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={primaryButton}
            >
              {showCreateForm ? 'Cancel' : '+ New trusted answer'}
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm font-medium text-primary shadow-sm">
            {message}
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <div className={cardClass}>
            <h2 className="mb-4 text-base font-bold text-primary">Create trusted answer</h2>
            <form onSubmit={createAnswer} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">Question *</label>
                <input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className={inputClass}
                  placeholder="Exact or near-exact question users ask…"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">Answer *</label>
                <textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className={`${textareaClass} min-h-[120px]`}
                  placeholder="Verified, source-grounded answer…"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-primary">Category (optional)</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputClass}>
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-primary">Answer mode</label>
                  <select value={newMode} onChange={(e) => setNewMode(e.target.value)} className={inputClass}>
                    {ANSWER_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={creating} className={primaryButton}>
                  {creating ? 'Creating…' : 'Create trusted answer'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} className={secondaryButton}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Similar questions finder */}
        <div className={cardClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-primary">Similar question detection</h2>
              <p className="text-xs text-secondary">Find recent user questions that closely match existing trusted answers.</p>
            </div>
            <button
              type="button"
              onClick={loadSimilarMatches}
              disabled={similarLoading}
              className={secondaryButton}
            >
              {similarLoading ? 'Scanning…' : similarLoaded ? 'Refresh' : 'Run detection'}
            </button>
          </div>

          {similarLoaded && similarMatches.length === 0 && (
            <p className="mt-3 text-sm text-secondary">No similar question matches found.</p>
          )}

          {similarMatches.length > 0 && (
            <div className="mt-4 space-y-3">
              {similarMatches.map((m) => (
                <div key={m.chatId} className="rounded-2xl bg-[#fcfaf7] p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="rounded-full bg-[#f7f0dd] px-2 py-0.5 text-xs font-bold text-[#d73f09]">
                      {Math.round(m.similarity * 100)}% match
                    </span>
                    <span className="text-xs text-muted">{formatDate(m.createdAt)}</span>
                  </div>
                  <p className="font-semibold text-primary">User asked: {m.chatQuestion}</p>
                  <p className="mt-1 text-secondary">Matched trusted: {m.matchedQuestion}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className={cardClass}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions and answers…"
              className={`${inputClass} sm:flex-1`}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary shadow-sm"
            >
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-secondary">{filtered.length} of {answers.length} shown</p>
        </div>

        {/* Answer list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className={`${cardClass} text-center text-secondary`}>No trusted answers found.</div>
          ) : (
            filtered.map((item) => {
              const isEditing = editingId === item.id
              const isExpanded = expandedId === item.id
              return (
                <div key={item.id} className={`${cardClass} ${!item.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-secondary'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {item.category && (
                          <span className="rounded-full bg-[#f3f0ed] px-2 py-0.5 text-xs font-semibold text-secondary">
                            {item.category}
                          </span>
                        )}
                        {item.answer_mode && item.answer_mode !== 'general' && (
                          <span className="rounded-full bg-[#f3f0ed] px-2 py-0.5 text-xs font-semibold text-secondary">
                            {item.answer_mode}
                          </span>
                        )}
                        <span className="text-xs text-muted">{formatDate(item.created_at)}</span>
                      </div>
                      <p className="font-semibold text-primary leading-snug">{item.question}</p>
                      {!isEditing && (
                        <p className={`mt-1 text-sm text-secondary ${!isExpanded ? 'line-clamp-2' : ''}`}>
                          {item.answer}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button type="button" onClick={() => setExpandedId(isExpanded ? null : item.id)} className={secondaryButton}>
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                      <button type="button" onClick={() => isEditing ? cancelEdit() : startEdit(item)} className={secondaryButton}>
                        {isEditing ? 'Cancel edit' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        disabled={togglingId === item.id}
                        className={secondaryButton}
                      >
                        {togglingId === item.id ? '…' : item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAnswer(item)}
                        disabled={deletingId === item.id}
                        className="inline-flex min-h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        {deletingId === item.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>

                  {/* Edit form */}
                  {isEditing && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-secondary uppercase tracking-wide">Question</label>
                        <input
                          value={editQuestion}
                          onChange={(e) => setEditQuestion(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-secondary uppercase tracking-wide">Answer</label>
                        <textarea
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          className={`${textareaClass} min-h-[120px]`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(item)}
                          disabled={savingId === item.id}
                          className={primaryButton}
                        >
                          {savingId === item.id ? 'Saving…' : 'Save changes'}
                        </button>
                        <button type="button" onClick={cancelEdit} className={secondaryButton}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded answer */}
                  {isExpanded && !isEditing && (
                    <div className="mt-4 rounded-2xl bg-[#fcfaf7] p-4 text-sm text-primary whitespace-pre-wrap leading-6">
                      {item.answer}
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
