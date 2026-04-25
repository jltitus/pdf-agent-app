'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

type Source = {
  title: string
  filename: string
  pages?: number[]
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

  async function askQuestion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setAnswer('')
    setSources([])
    setEvidenceStrength(null)
    setMessage('')

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

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-white p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <p className="text-sm font-semibold text-gray-500">
            MASTER FOOD PRESERVERS
          </p>
          <h1 className="text-4xl font-bold">
            MFP Publication Agent
          </h1>
        </header>

        <form onSubmit={askQuestion} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <select
              value={answerMode}
              onChange={(e) => setAnswerMode(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="general">General question</option>
              <option value="recipe">Find a recipe</option>
              <option value="compare">Compare documents</option>
              <option value="safety">Safety guidance</option>
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="all">All publications</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full border p-3 rounded min-h-[120px]"
            placeholder="Ask your question..."
          />

          {message && (
            <div className="text-red-600">{message}</div>
          )}

          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Ask'}
          </button>
        </form>

        {answer && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Answer</h2>
              <p className="whitespace-pre-wrap">{answer}</p>
            </div>

            {evidenceStrength && (
              <div className="border p-3 rounded">
                <strong>Evidence:</strong>{' '}
                {evidenceStrength.label}
                <p className="text-sm text-gray-600">
                  {evidenceStrength.description}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold">Sources</h3>

              {sources.length === 0 ? (
                <p>No sources found.</p>
              ) : (
                <div className="space-y-3">
                  {sources.map((s, i) => {
                    const firstPage = s.pages?.[0]
                    const url = `/api/view-source?file=${encodeURIComponent(
                      s.filename
                    )}${firstPage ? `&page=${firstPage}` : ''}`

                    return (
                      <a
                        key={`${s.filename}-${i}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border rounded p-3 hover:bg-gray-50"
                      >
                        <p className="font-semibold">{s.title}</p>
                        <p className="text-sm text-gray-600">
                          {s.filename}
                        </p>
                        <p className="text-sm">
                          Pages: {s.pages?.join(', ') || 'Unknown'}
                        </p>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}