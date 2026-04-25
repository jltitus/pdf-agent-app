'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import HeaderBar from '../components/HeaderBar'
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

type DocumentOption = {
  id: string
  title: string
  filename: string
  category?: string | null
}

type ConversationTurn = {
  question: string
  answer: string
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
  const [documentId, setDocumentId] = useState('all')
  const [documents, setDocuments] = useState<DocumentOption[]>([])
  const [answerMode, setAnswerMode] = useState('general')

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([])

  const filteredDocuments = useMemo(() => {
    if (category === 'all') return documents
    return documents.filter((doc) => doc.category === category)
  }, [documents, category])

  useEffect(() => {
    if (
      documentId !== 'all' &&
      !filteredDocuments.some((doc) => doc.id === documentId)
    ) {
      setDocumentId('all')
    }
  }, [category, documentId, filteredDocuments])

  useEffect(() => {
    async function loadData() {
      const { data: docData } = await supabase
        .from('documents')
        .select('id, title, filename, category')
        .eq('is_active', true)
        .order('title', { ascending: true })

      const activeDocs = (docData ?? []) as DocumentOption[]
      setDocuments(activeDocs)

      const uniqueCategories = Array.from(
        new Set(activeDocs.map((doc) => doc.category).filter(Boolean) as string[])
      ).sort()

      setCategories(uniqueCategories)

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
        documentId,
        answerMode,
        conversationTurns,
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

    setConversationTurns((prev) =>
      [
        ...prev,
        {
          question,
          answer: result.answer,
        },
      ].slice(-4)
    )

    setLoading(false)
    await refreshHistory()
  }

  function startNewChat() {
    setQuestion('')
    setAnswer('')
    setSources([])
    setEvidenceStrength(null)
    setConversationTurns([])
    setMessage('')
  }

  return (
    <main className="min-h-screen bg-white p-6 md:p-10">
      <HeaderBar />
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <p className="text-sm font-semibold text-gray-500">
            MASTER FOOD PRESERVERS
          </p>
          <h1 className="text-4xl font-bold">MFP Publication Agent</h1>
          <p className="mt-2 max-w-3xl text-gray-600">
            Ask questions against active processed publications. Use filters to narrow the search and improve speed.
            Follow-up questions use recent conversation context while still requiring support from the source PDFs.
          </p>
        </header>

        {conversationTurns.length > 0 && (
          <section className="rounded-2xl border p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">
              Continuing current chat
            </p>
            <p>
              {conversationTurns.length} recent question
              {conversationTurns.length === 1 ? '' : 's'} will be used to understand follow-ups.
            </p>
          </section>
        )}

        <form onSubmit={askQuestion} className="space-y-4 rounded-2xl border p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Answer mode</label>
              <select
                value={answerMode}
                onChange={(e) => setAnswerMode(e.target.value)}
                className="w-full rounded border p-2"
              >
                <option value="general">General question</option>
                <option value="recipe">Find a recipe</option>
                <option value="compare">Compare documents</option>
                <option value="safety">Safety guidance</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border p-2"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Publication</label>
              <select
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full rounded border p-2"
              >
                <option value="all">All publications</option>
                {filteredDocuments.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title || doc.filename}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[120px] w-full rounded border p-3"
            placeholder={
              conversationTurns.length > 0
                ? 'Ask a follow-up question...'
                : 'Ask your question...'
            }
            required
          />

          {message && <div className="text-red-600">{message}</div>}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Ask'}
            </button>

            <button
              type="button"
              onClick={startNewChat}
              className="rounded border px-4 py-2"
            >
              New chat
            </button>
          </div>
        </form>

        {answer && (
          <div className="space-y-6 rounded-2xl border p-5 md:p-6">
            <div>
              <h2 className="text-xl font-bold">Answer</h2>
              <p className="whitespace-pre-wrap leading-7">{answer}</p>
            </div>

            {evidenceStrength && (
              <div className="rounded border p-3">
                <strong>Evidence:</strong> {evidenceStrength.label}
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
                  {sources.map((source, index) => {
                    const firstPage = source.pages?.[0]
                    const url = `/api/view-source?file=${encodeURIComponent(
                      source.filename
                    )}${firstPage ? `&page=${firstPage}` : ''}`

                    return (
                      <a
                        key={`${source.filename}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded border p-3 hover:bg-gray-50"
                      >
                        <p className="font-semibold">{source.title}</p>
                        <p className="text-sm text-gray-600">{source.filename}</p>
                        <p className="text-sm">
                          Pages: {source.pages?.join(', ') || 'Unknown'}
                        </p>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
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
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded border p-3 text-left hover:bg-gray-50"
                  onClick={() => {
                    setQuestion(item.question)
                    setAnswer(item.answer)
                    setSources(item.sources || [])
                    setEvidenceStrength(item.evidence_strength || null)
                    setAnswerMode(item.answer_mode || 'general')
                    setCategory(item.category || 'all')
                    setConversationTurns([
                      {
                        question: item.question,
                        answer: item.answer,
                      },
                    ])
                    setMessage('')
                  }}
                >
                  <p className="font-medium">{item.question}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                    {item.answer_mode ? ` • Mode: ${item.answer_mode}` : ''}
                    {item.evidence_strength ? ` • Evidence: ${item.evidence_strength.label}` : ''}
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