'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

type Source = {
  title: string
  filename: string
  pages?: number[]
  excerpts?: string[]
}

type EvidenceStrength = {
  label: 'Strong' | 'Moderate' | 'Limited' | 'Not found'
  description: string
}

type HistoryItem = {
  id: string
  question: string
  answer: string
  category?: string | null
  answer_mode?: string | null
  sources?: Source[]
  evidence_strength?: EvidenceStrength | null
  created_at: string
}

const modeLabels: Record<string, string> = {
  general: 'General question',
  recipe: 'Find a recipe',
  compare: 'Compare documents',
  safety: 'Safety guidance',
}

export default function ChatPage() {
  const supabase = createClient()

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [evidenceStrength, setEvidenceStrength] =
    useState<EvidenceStrength | null>(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [category, setCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>([])
  const [answerMode, setAnswerMode] = useState('general')

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [chatHistoryId, setChatHistoryId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState('')

  useEffect(() => {
    async function loadData() {
      const { data: catData } = await supabase
        .from('documents')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null)

      const unique = Array.from(
        new Set((catData ?? []).map((d) => d.category).filter(Boolean))
      ).sort()

      setCategories(unique)

      const { data: hist } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setHistory((hist ?? []) as HistoryItem[])
    }

    loadData()
  }, [supabase])

  async function refreshHistory() {
    const { data } = await supabase
      .from('chat_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    setHistory((data ?? []) as HistoryItem[])
  }

  async function askQuestion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setAnswer('')
    setSources([])
    setEvidenceStrength(null)
    setMessage('')
    setFeedbackMessage('')
    setFeedbackSubmitted('')

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    if (!token) {
      setMessage('You must be signed in.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question,
        category,
        answerMode,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      setMessage(result.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    setAnswer(result.answer)
    setSources(result.sources ?? [])
    setEvidenceStrength(result.evidenceStrength ?? null)
    setChatHistoryId(result.chatHistoryId ?? null)

    setLoading(false)
    await refreshHistory()
  }

  async function submitFeedback(type: string) {
    setFeedbackMessage('Saving feedback...')

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    if (!token) {
      setFeedbackMessage('You must be signed in.')
      return
    }

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        chatHistoryId,
        question,
        answer,
        sources,
        feedbackType: type,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      setFeedbackMessage(result.error ?? 'Feedback could not be saved.')
      return
    }

    setFeedbackSubmitted(type)
    setFeedbackMessage('Feedback saved. Thank you!')
  }

  return (
    <main className="min-h-screen bg-white p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Master Food Preservers
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            MFP Publication Agent
          </h1>
          <p className="max-w-3xl text-gray-600">
            Ask questions against active processed publications. Answers are limited
            to uploaded source documents and include source pages when available.
          </p>
        </header>

        <section className="rounded-2xl border p-5 md:p-6">
          <form onSubmit={askQuestion} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Answer mode
                </label>
                <select
                  value={answerMode}
                  onChange={(e) => setAnswerMode(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="general">General question</option>
                  <option value="recipe">Find a recipe</option>
                  <option value="compare">Compare documents</option>
                  <option value="safety">Safety guidance</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="all">All active publications</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Your question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-36 w-full rounded-lg border px-3 py-2"
                placeholder="Example: What does the publication say about safely storing smoked fish?"
                required
              />
            </div>

            {message && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {message}
              </div>
            )}

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
              >
                {loading ? 'Searching publications...' : 'Ask'}
              </button>

              <p className="text-sm text-gray-500">
                If the answer is not found, the agent will say so.
              </p>
            </div>
          </form>
        </section>

        {answer && (
          <section className="rounded-2xl border p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 border-b pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Answer</h2>
                <p className="text-sm text-gray-500">
                  Mode: {modeLabels[answerMode] ?? answerMode}
                </p>
              </div>

              {evidenceStrength && (
                <div className="rounded-xl border px-4 py-3 text-sm md:max-w-xs">
                  <p className="font-semibold">
                    Evidence strength: {evidenceStrength.label}
                  </p>
                  <p className="text-gray-600">
                    {evidenceStrength.description}
                  </p>
                </div>
              )}
            </div>

            <div className="whitespace-pre-wrap leading-7">{answer}</div>

            <div className="mt-6 border-t pt-5">
              <h3 className="mb-3 font-bold">Was this answer useful?</h3>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => submitFeedback('helpful')}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Helpful
                </button>

                <button
                  type="button"
                  onClick={() => submitFeedback('not_helpful')}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Not helpful
                </button>

                <button
                  type="button"
                  onClick={() => submitFeedback('source_issue')}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Source issue
                </button>

                <button
                  type="button"
                  onClick={() => submitFeedback('missing_info')}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Answer missing info
                </button>
              </div>

              {feedbackMessage && (
                <p className="mt-2 text-sm text-gray-600">{feedbackMessage}</p>
              )}

              {feedbackSubmitted && (
                <p className="mt-1 text-xs text-gray-500">
                  Last feedback: {feedbackSubmitted}
                </p>
              )}
            </div>

            <div className="mt-6 border-t pt-5">
              <h3 className="mb-3 text-xl font-bold">Sources</h3>

              {sources.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No structured source metadata returned.
                </p>
              ) : (
                <div className="space-y-3">
                  {sources.map((s, i) => (
                    <article key={`${s.filename}-${i}`} className="rounded-xl border p-4">
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-sm text-gray-600">{s.filename}</p>
                      <p className="text-sm">
                        Pages: {s.pages?.join(', ') || 'Unknown'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="rounded-2xl border p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent questions</h2>
            <span className="text-sm text-gray-500">Latest 10</span>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-gray-600">No recent questions yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="w-full rounded-lg border p-3 text-left hover:bg-gray-50"
                  onClick={() => {
                    setQuestion(h.question)
                    setAnswer(h.answer)
                    setSources(h.sources || [])
                    setEvidenceStrength(h.evidence_strength || null)
                    setAnswerMode(h.answer_mode || 'general')
                    setCategory(h.category || 'all')
                    setMessage('')
                    setFeedbackMessage('')
                    setFeedbackSubmitted('')
                    setChatHistoryId(h.id)
                  }}
                >
                  <p className="font-medium">{h.question}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(h.created_at).toLocaleString()}
                    {h.answer_mode ? ` • ${modeLabels[h.answer_mode] ?? h.answer_mode}` : ''}
                    {h.evidence_strength ? ` • Evidence: ${h.evidence_strength.label}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}