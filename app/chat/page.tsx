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
  sources?: Source[]
  evidenceStrength?: EvidenceStrength | null
  chatHistoryId?: string | null
  feedbackSubmitted?: string | null
}

export default function ChatPage() {
  const supabase = createClient()

  const [question, setQuestion] = useState('')
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

  async function submitQuestion(currentQuestion: string, priorTurns: ConversationTurn[]) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    if (!token) {
      throw new Error('You must be signed in.')
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: currentQuestion,
        category,
        documentId,
        answerMode,
        conversationTurns: priorTurns.map((turn) => ({
          question: turn.question,
          answer: turn.answer,
        })),
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      throw new Error(result.error ?? 'Something went wrong.')
    }

    return result
  }

  async function askQuestion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) return

    setLoading(true)
    setMessage('')

    const currentQuestion = trimmedQuestion
    const priorTurns = conversationTurns

    setQuestion('')

    try {
      const result = await submitQuestion(currentQuestion, priorTurns)

      setConversationTurns((prev) =>
        [
          ...prev,
          {
            question: currentQuestion,
            answer: result.answer,
            sources: result.sources ?? [],
            evidenceStrength: result.evidenceStrength ?? null,
            chatHistoryId: result.chatHistoryId ?? null,
            feedbackSubmitted: null,
          },
        ].slice(-6)
      )

      setLoading(false)
      await refreshHistory()
    } catch (error: any) {
      setMessage(error.message ?? 'Connection error.')
      setQuestion(currentQuestion)
      setLoading(false)
    }
  }

  async function regenerateTurn(index: number) {
    const turn = conversationTurns[index]
    if (!turn) return

    setLoading(true)
    setMessage('')

    const priorTurns = conversationTurns.slice(0, index)

    try {
      const result = await submitQuestion(turn.question, priorTurns)

      setConversationTurns((prev) =>
        prev.map((existingTurn, turnIndex) =>
          turnIndex === index
            ? {
                ...existingTurn,
                answer: result.answer,
                sources: result.sources ?? [],
                evidenceStrength: result.evidenceStrength ?? null,
                chatHistoryId: result.chatHistoryId ?? null,
                feedbackSubmitted: null,
              }
            : existingTurn
        )
      )

      setLoading(false)
      await refreshHistory()
    } catch (error: any) {
      setMessage(error.message ?? 'Could not regenerate answer.')
      setLoading(false)
    }
  }

  async function submitFeedback(index: number, feedbackType: string) {
    const turn = conversationTurns[index]
    if (!turn) return

    setMessage('')

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    if (!token) {
      setMessage('You must be signed in.')
      return
    }

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        chatHistoryId: turn.chatHistoryId,
        feedbackType,
        question: turn.question,
        answer: turn.answer,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      setMessage(result.error ?? 'Feedback could not be saved.')
      return
    }

    setConversationTurns((prev) =>
      prev.map((existingTurn, turnIndex) =>
        turnIndex === index
          ? { ...existingTurn, feedbackSubmitted: feedbackType }
          : existingTurn
      )
    )
  }

  function startNewChat() {
    setQuestion('')
    setConversationTurns([])
    setMessage('')
  }

  function loadHistoryItem(item: HistoryItem) {
    setQuestion('')
    setConversationTurns([
      {
        question: item.question,
        answer: item.answer,
        sources: item.sources || [],
        evidenceStrength: item.evidence_strength || null,
        chatHistoryId: item.id,
        feedbackSubmitted: null,
      },
    ])
    setAnswerMode(item.answer_mode || 'general')
    setCategory(item.category || 'all')
    setMessage('')
  }

  function getSuggestedFollowUps() {
  if (answerMode === 'recipe') {
    return [
      'What are the storage instructions?',
      'What safety notes should I know?',
      'What processing time is listed?',
    ]
  }

  if (answerMode === 'safety') {
    return [
      'What should I avoid doing?',
      'What are the biggest safety risks?',
      'What does the publication say about storage?',
    ]
  }

  if (answerMode === 'compare') {
    return [
      'Where do the publications agree?',
      'Where do they differ?',
      'Are there any conflicts or gaps?',
    ]
  }

  return [
    'What about storage?',
    'What are the safety notes?',
    'What does the source say not to do?',
  ]
}

return (
  <>
    <HeaderBar />

      <main className="min-h-screen bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
          <header className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Master Food Preservers
            </p>

            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-bold">MFP Publication Agent</h1>
                <p className="mt-2 max-w-3xl text-gray-600">
                  Ask questions against active processed publications. Follow-up questions use the current chat context while still requiring support from source PDFs.
                </p>
              </div>

              <button
                type="button"
                onClick={startNewChat}
                className="w-fit rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              >
                New chat
              </button>
            </div>
          </header>

          <section className="rounded-2xl border p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Answer mode</label>
                <select
                  value={answerMode}
                  onChange={(e) => setAnswerMode(e.target.value)}
                  className="w-full rounded-lg border p-2"
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
                  className="w-full rounded-lg border p-2"
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
                  className="w-full rounded-lg border p-2"
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
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="flex min-h-[650px] flex-col rounded-2xl border">
              <div className="border-b p-4">
                <h2 className="text-lg font-bold">Current chat</h2>
                <p className="text-sm text-gray-600">
                  {conversationTurns.length > 0
                    ? 'Ask a follow-up in the message box below.'
                    : 'Start with a question about a publication, process, recipe, or safety guidance.'}
                </p>
              </div>

              <form onSubmit={askQuestion} className="space-y-3 border-b p-4">
                {message && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {message}
                  </div>
                )}

                <div className="flex flex-col gap-3 md:flex-row">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="min-h-[70px] flex-1 rounded-xl border p-3"
                    placeholder={
                      conversationTurns.length > 0
                        ? 'Ask a follow-up question...'
                        : 'Ask a question, such as “How do I safely dry herbs?”'
                    }
                    required
                  />

                  <button
                    type="submit"
                    className="rounded-xl bg-black px-5 py-3 text-white disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Searching...' : 'Send'}
                  </button>
                </div>
              </form>

              <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
                {conversationTurns.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 p-5">
                    <h3 className="font-semibold">Try asking:</h3>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        'How do I safely dry herbs?',
                        'What does SP 50 814 say about smoked fish?',
                        'What about storage?',
                        'Can I use low-temperature pasteurization for pickles?',
                      ].map((starter) => (
                        <button
                          key={starter}
                          type="button"
                          onClick={() => setQuestion(starter)}
                          className="rounded-full border bg-white px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  conversationTurns.map((turn, index) => (
                    <div key={`${turn.question}-${index}`} className="space-y-4">
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl bg-black px-4 py-3 text-white">
                          <p className="whitespace-pre-wrap">{turn.question}</p>
                        </div>
                      </div>

                      <div className="flex justify-start">
                        <div className="max-w-[92%] rounded-2xl border bg-white px-4 py-4 shadow-sm">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            MFP Publication Agent
                          </div>

                          <p className="whitespace-pre-wrap leading-7">
                            {turn.answer}
                          </p>

                          {turn.evidenceStrength && (
                            <div className="mt-4 rounded-lg border p-3">
                              <p className="text-sm">
                                <strong>Evidence:</strong>{' '}
                                {turn.evidenceStrength.label}
                              </p>
                              <p className="text-sm text-gray-600">
                                {turn.evidenceStrength.description}
                              </p>
                            </div>
                          )}

                          <div className="mt-4">
                            <h3 className="text-sm font-bold">Sources</h3>

                            {!turn.sources || turn.sources.length === 0 ? (
                              <p className="mt-1 text-sm text-gray-600">
                                No sources found.
                              </p>
                            ) : (
                              <div className="mt-2 space-y-2">
                                {turn.sources.map((source, sourceIndex) => {
                                  const firstPage = source.pages?.[0]
                                  const url = `/api/view-source?file=${encodeURIComponent(
                                    source.filename
                                  )}${firstPage ? `&page=${firstPage}` : ''}`

                                  return (
                                    <a
                                      key={`${source.filename}-${sourceIndex}`}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block rounded-lg border p-3 text-sm hover:bg-gray-50"
                                    >
                                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                        <p className="font-semibold">{source.title}</p>

                                        {sourceIndex === 0 && (
                                          <span className="w-fit rounded-full border px-2 py-1 text-xs font-medium">
                                            Primary source
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-gray-600">{source.filename}</p>
                                      <p>
                                        Pages:{' '}
                                        {source.pages?.join(', ') || 'Unknown'}
                                      </p>
                                    </a>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                            <button
                              type="button"
                              onClick={() => submitFeedback(index, 'helpful')}
                              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Helpful
                            </button>

                            <button
                              type="button"
                              onClick={() => submitFeedback(index, 'not_helpful')}
                              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Not helpful
                            </button>

                            <button
                              type="button"
                              onClick={() => submitFeedback(index, 'missing_source')}
                              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Missing source
                            </button>

                            <button
                              type="button"
                              onClick={() => regenerateTurn(index)}
                              disabled={loading}
                              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                            >
                              Regenerate
                            </button>
                          </div>

                          {turn.feedbackSubmitted && (
                            <p className="mt-2 text-xs text-gray-500">
                              Feedback saved: {turn.feedbackSubmitted}
                            </p>
                          )}
                          {index === conversationTurns.length - 1 && (
  <div className="mt-4 border-t pt-4">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
      Suggested follow-ups
    </p>

    <div className="flex flex-wrap gap-2">
      {getSuggestedFollowUps().map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => setQuestion(suggestion)}
          className="rounded-full border px-3 py-2 text-sm hover:bg-gray-50"
        >
          {suggestion}
        </button>
      ))}
    </div>
  </div>
)}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm text-gray-600">
                        Searching active publications...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border p-4">
                <h2 className="text-lg font-bold">Recent questions</h2>
                <p className="mb-3 text-sm text-gray-600">Latest 10</p>

                {history.length === 0 ? (
                  <p className="text-sm text-gray-600">No recent questions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full rounded-lg border p-3 text-left hover:bg-gray-50"
                        onClick={() => loadHistoryItem(item)}
                      >
                        <p className="line-clamp-2 text-sm font-medium">
                          {item.question}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                        {item.evidence_strength && (
                          <p className="mt-1 text-xs text-gray-500">
                            Evidence: {item.evidence_strength.label}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border p-4">
                <h2 className="text-lg font-bold">Tips</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
                  <li>Ask follow-ups in the same chat.</li>
                  <li>Use the publication filter to narrow answers.</li>
                  <li>Click sources to verify the answer.</li>
                  <li>Start a new chat when changing topics.</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </>
  )
}