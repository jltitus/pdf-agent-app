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

  // ---------------------------
  // LOAD DATA
  // ---------------------------
  useEffect(() => {
    async function loadData() {
      const { data: catData } = await supabase
        .from('documents')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null)

      const unique = Array.from(
        new Set((catData ?? []).map((d) => d.category).filter(Boolean))
      )

      setCategories(unique)

      const { data: hist } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setHistory(hist ?? [])
    }

    loadData()
  }, [])

  async function refreshHistory() {
    const { data } = await supabase
      .from('chat_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    setHistory(data ?? [])
  }

  // ---------------------------
  // ASK QUESTION
  // ---------------------------
  async function askQuestion(e: React.FormEvent) {
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
      setMessage(result.error)
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

  // ---------------------------
  // FEEDBACK
  // ---------------------------
  async function submitFeedback(type: string) {
    setFeedbackMessage('Saving...')

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

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
      setFeedbackMessage(result.error)
      return
    }

    setFeedbackSubmitted(type)
    setFeedbackMessage('Saved 👍')
  }

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">PDF Agent</h1>

      <form onSubmit={askQuestion} className="border p-4 rounded space-y-3">
        <select
          value={answerMode}
          onChange={(e) => setAnswerMode(e.target.value)}
          className="border p-2 w-full"
        >
          <option value="general">General</option>
          <option value="recipe">Recipe</option>
          <option value="compare">Compare</option>
          <option value="safety">Safety</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border p-2 w-full"
        >
          <option value="all">All</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="border p-2 w-full"
          placeholder="Ask something..."
          required
        />

        <button className="bg-black text-white px-4 py-2">
          {loading ? 'Thinking...' : 'Ask'}
        </button>

        {message && <p>{message}</p>}
      </form>

      {answer && (
        <div className="border p-4 rounded space-y-4">
          <div>
            <h2 className="font-bold">Answer</h2>

            {evidenceStrength && (
              <p className="text-sm">
                Evidence: {evidenceStrength.label}
              </p>
            )}

            <div className="whitespace-pre-wrap">{answer}</div>
          </div>

          {/* Feedback */}
          <div>
            <p className="font-bold">Was this helpful?</p>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => submitFeedback('helpful')} className="border px-2 py-1">
                👍 Helpful
              </button>

              <button onClick={() => submitFeedback('not_helpful')} className="border px-2 py-1">
                👎 Not helpful
              </button>

              <button onClick={() => submitFeedback('source_issue')} className="border px-2 py-1">
                ⚠️ Source issue
              </button>

              <button onClick={() => submitFeedback('missing_info')} className="border px-2 py-1">
                ➕ Missing info
              </button>
            </div>

            {feedbackMessage && <p>{feedbackMessage}</p>}
          </div>

          {/* Sources */}
          <div>
            <h3 className="font-bold">Sources</h3>

            {sources.map((s, i) => (
              <div key={i} className="border p-2 mt-2">
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm">{s.filename}</p>
                <p className="text-sm">Pages: {s.pages?.join(', ')}</p>

                {s.excerpts?.map((e, j) => (
                  <blockquote key={j} className="text-sm italic">
                    {e}
                  </blockquote>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="font-bold">Recent</h2>

        {history.map((h) => (
          <div
            key={h.id}
            className="border p-2 mt-2 cursor-pointer"
            onClick={() => {
              setQuestion(h.question)
              setAnswer(h.answer)
              setSources(h.sources || [])
              setEvidenceStrength(h.evidence_strength || null)
              setAnswerMode(h.answer_mode || 'general')
            }}
          >
            {h.question}
          </div>
        ))}
      </div>
    </main>
  )
}