'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

type HistoryItem = {
  id: string
  question: string
  answer: string
  category: string | null
  answer_mode: string | null
  evidence_strength: { label: string } | null
  created_at: string
}

type SavedChat = {
  id: string
  question: string
  answer: string
  category: string | null
  answer_mode: string | null
  created_at: string
}

type Tab = 'all' | 'saved'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function evidenceBadgeClass(label?: string) {
  if (label === 'Strong') return 'border-green-300 bg-[#e7f0e7] text-green-800'
  if (label === 'Moderate') return 'border-[#d8d1c7] bg-[#f7f0dd] text-[#6b4a19]'
  if (label === 'Limited') return 'border-yellow-300 bg-yellow-50 text-[#6b4a19]'
  return 'border-[#d8d1c7] bg-[#f3f0ed] text-secondary'
}

function answerModeLabel(mode: string | null) {
  if (mode === 'recipe') return 'Recipe'
  if (mode === 'compare') return 'Compare'
  if (mode === 'safety') return 'Safety'
  return 'General'
}

interface HistoryCardProps {
  question: string
  answer: string
  category: string | null
  answer_mode: string | null
  evidence_strength?: { label: string } | null
  created_at: string
}

function HistoryCard({ question, answer, category, answer_mode, evidence_strength, created_at }: HistoryCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article className="overflow-hidden rounded-2xl border border-[#d8d1c7] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-5 text-left hover:bg-[#fcfaf7]"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-primary leading-snug">{question}</p>
          <span className="mt-0.5 shrink-0 text-sm text-muted">{expanded ? '▲' : '▼'}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">{formatDate(created_at)}</span>
          {category && (
            <span className="rounded-full bg-[#f3f0ed] px-2 py-0.5 text-[11px] font-semibold text-secondary">
              {category}
            </span>
          )}
          <span className="rounded-full bg-[#f3f0ed] px-2 py-0.5 text-[11px] font-semibold text-secondary">
            {answerModeLabel(answer_mode)}
          </span>
          {evidence_strength?.label && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${evidenceBadgeClass(evidence_strength.label)}`}>
              {evidence_strength.label}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#e8e1d8] px-5 pb-5 pt-4">
          <div className="prose prose-sm max-w-none text-secondary whitespace-pre-wrap text-sm leading-7">
            {answer}
          </div>
          <div className="mt-4">
            <Link
              href={`/chat?question=${encodeURIComponent(question)}`}
              className="inline-flex items-center rounded-xl bg-[#d73f09] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#b23408]"
            >
              Re-ask in chat →
            </Link>
          </div>
        </div>
      )}
    </article>
  )
}

export default function HistoryPage() {
  const supabase = createClient()

  const PAGE_SIZE = 50

  const [tab, setTab] = useState<Tab>('all')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [savedChats, setSavedChats] = useState<SavedChat[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const [{ data: hist }, savedRes] = await Promise.all([
        supabase
          .from('chat_history')
          .select('id, question, answer, category, answer_mode, evidence_strength, created_at')
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1),
        fetch('/api/saved-chats'),
      ])

      const items = (hist ?? []) as HistoryItem[]
      setHistory(items)
      setHasMore(items.length === PAGE_SIZE)

      if (savedRes.ok) {
        const saved = await savedRes.json()
        setSavedChats(saved.chats ?? [])
      }

      setLoading(false)
    }
    load()
  }, [supabase])

  async function loadMore() {
    setLoadingMore(true)
    const { data } = await supabase
      .from('chat_history')
      .select('id, question, answer, category, answer_mode, evidence_strength, created_at')
      .order('created_at', { ascending: false })
      .range(history.length, history.length + PAGE_SIZE - 1)
    const more = (data ?? []) as HistoryItem[]
    setHistory((prev) => [...prev, ...more])
    setHasMore(more.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  const categories = useMemo(() => {
    const source = tab === 'all' ? history : savedChats
    return Array.from(new Set(source.map((h) => h.category).filter(Boolean) as string[])).sort()
  }, [history, savedChats, tab])

  function exportCSV() {
    const rows = filtered as (HistoryItem | SavedChat)[]
    const headers = ['Date', 'Question', 'Answer', 'Category', 'Mode', 'Evidence']
    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`
    const lines = [
      headers.join(','),
      ...rows.map((item) =>
        [
          escape(formatDate(item.created_at)),
          escape(item.question),
          escape(item.answer),
          escape(item.category ?? ''),
          escape(answerModeLabel(item.answer_mode)),
          escape('evidence_strength' in item ? (item.evidence_strength?.label ?? '') : ''),
        ].join(',')
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mfp-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = useMemo(() => {
    const source: (HistoryItem | SavedChat)[] = tab === 'all' ? history : savedChats
    const q = search.trim().toLowerCase()
    return source.filter((item) => {
      const matchSearch = !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
      const matchCategory = categoryFilter === 'all' || item.category === categoryFilter
      const matchMode = modeFilter === 'all' || item.answer_mode === modeFilter
      return matchSearch && matchCategory && matchMode
    })
  }, [history, savedChats, tab, search, categoryFilter, modeFilter])

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-primary">
      <div className="mx-auto max-w-4xl space-y-6 px-3 py-5 sm:px-6 sm:py-8">

        {/* Header */}
        <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
          <div className="bg-[#d73f09] px-5 py-3 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em]">Oregon State University Extension</p>
          </div>
          <div className="p-5 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">Chat history</p>
            <h1 className="mt-2 text-3xl font-bold text-primary">Your past questions</h1>
            <p className="mt-2 text-sm leading-6 text-secondary">
              Search and revisit previous answers, or re-ask any question in chat.
            </p>
          </div>
        </section>

        {/* Tabs + filters */}
        <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
          {/* Tabs */}
          <div className="flex overflow-hidden rounded-xl border border-[#d8d1c7] w-fit">
            <button
              type="button"
              onClick={() => { setTab('all'); setCategoryFilter('all'); setModeFilter('all') }}
              className={`min-h-11 px-5 py-2.5 text-sm font-semibold transition ${tab === 'all' ? 'bg-[#d73f09] text-white' : 'bg-white text-primary hover:bg-[#f3f0ed]'}`}
            >
              All questions {!loading && `(${history.length})`}
            </button>
            <button
              type="button"
              onClick={() => { setTab('saved'); setCategoryFilter('all'); setModeFilter('all') }}
              className={`min-h-11 border-l border-[#d8d1c7] px-5 py-2.5 text-sm font-semibold transition ${tab === 'saved' ? 'bg-[#d73f09] text-white' : 'bg-white text-primary hover:bg-[#f3f0ed]'}`}
            >
              Saved {!loading && `(${savedChats.length})`}
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_160px_auto_auto]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions and answers…"
              className="w-full rounded-xl border border-[#d8d1c7] bg-white px-4 py-2.5 text-sm text-primary"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[#d8d1c7] bg-white px-4 py-2.5 text-sm text-primary"
            >
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="rounded-xl border border-[#d8d1c7] bg-white px-4 py-2.5 text-sm text-primary"
            >
              <option value="all">All modes</option>
              <option value="general">General</option>
              <option value="recipe">Recipe</option>
              <option value="compare">Compare</option>
              <option value="safety">Safety</option>
            </select>
            <button
              type="button"
              onClick={() => { setSearch(''); setCategoryFilter('all'); setModeFilter('all') }}
              className="rounded-xl border border-[#d8d1c7] bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="rounded-xl border border-[#d8d1c7] bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:bg-[#f3f0ed] disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          <p className="mt-3 text-xs text-muted">
            {loading ? 'Loading…' : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
          </p>
        </section>

        {/* Results */}
        {!loading && filtered.length === 0 ? (
          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm">
            <p className="text-sm text-secondary">
              {tab === 'all' && history.length === 0
                ? 'No questions yet. Start by asking a preservation question in chat.'
                : tab === 'saved' && savedChats.length === 0
                  ? 'No saved answers yet. Save any chat answer using the Save button in chat.'
                  : 'No results match your search. Try clearing the filters.'}
            </p>
            <Link
              href="/chat"
              className="mt-4 inline-flex items-center rounded-xl bg-[#d73f09] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#b23408]"
            >
              Go to chat →
            </Link>
          </section>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <HistoryCard
                key={item.id}
                question={item.question}
                answer={item.answer}
                category={item.category}
                answer_mode={item.answer_mode}
                evidence_strength={'evidence_strength' in item ? item.evidence_strength : null}
                created_at={item.created_at}
              />
            ))}
          </div>
        )}

        {tab === 'all' && hasMore && !search && categoryFilter === 'all' && modeFilter === 'all' && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-xl border border-[#d8d1c7] bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-[#f3f0ed] disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : `Load more (showing ${history.length})`}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
