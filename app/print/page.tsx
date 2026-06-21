'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

type Source = {
  title: string
  filename: string
  pages?: number[]
  excerpts?: string[]
  category?: string | null
  version?: string | null
}

type HistoryItem = {
  id: string
  question: string
  answer: string
  category: string | null
  answer_mode: string | null
  evidence_strength: { label: string; description: string } | null
  sources: Source[] | null
  created_at: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function answerModeLabel(mode: string | null) {
  if (mode === 'recipe') return 'Recipe question'
  if (mode === 'compare') return 'Comparison question'
  if (mode === 'safety') return 'Safety question'
  return 'General question'
}

function PrintContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const supabase = createClient()

  const [item, setItem] = useState<HistoryItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setError('No answer ID provided.'); return }

    supabase
      .from('chat_history')
      .select('id, question, answer, category, answer_mode, evidence_strength, sources, created_at')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setError('Could not load this answer.'); return }
        setItem(data as HistoryItem)
      })
  }, [id, supabase])

  if (error) {
    return (
      <div className="p-8 text-center text-red-700">{error}</div>
    )
  }

  if (!item) {
    return (
      <div className="p-8 text-center text-gray-500">Loading…</div>
    )
  }

  const sources = item.sources ?? []

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 text-[#1a1a1a]">
      {/* Print / Close controls — hidden when printing */}
      <div className="mb-8 flex gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-[#d73f09] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#b23408]"
        >
          Print / Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      {/* Header */}
      <header className="border-b-2 border-[#d73f09] pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#d73f09]">
          Oregon State University Extension
        </p>
        <h1 className="mt-1 text-xl font-bold">MFP Volunteer Resource Hub</h1>
        <p className="mt-2 text-sm text-gray-500">
          {formatDate(item.created_at)} · {answerModeLabel(item.answer_mode)}
          {item.category ? ` · ${item.category}` : ''}
          {item.evidence_strength ? ` · ${item.evidence_strength.label} confidence` : ''}
        </p>
      </header>

      {/* Question */}
      <section className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Question</p>
        <p className="mt-2 text-lg font-semibold leading-snug">{item.question}</p>
      </section>

      {/* Answer */}
      <section className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Answer</p>
        {item.evidence_strength && (
          <p className="mt-1 text-xs text-gray-500">{item.evidence_strength.description}</p>
        )}
        <p className="mt-3 text-[15px] leading-7 whitespace-pre-wrap">{item.answer}</p>
      </section>

      {/* Sources */}
      {sources.length > 0 && (
        <section className="mt-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Sources ({sources.length})
          </p>
          <div className="mt-3 space-y-4">
            {sources.map((source, i) => (
              <div key={i} className="border-l-2 border-gray-200 pl-4">
                <p className="font-semibold text-sm">{source.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{source.filename}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                  {source.category && <span>{source.category}</span>}
                  {source.version && <span>Version {source.version}</span>}
                  {source.pages && source.pages.length > 0 && (
                    <span>Pages: {source.pages.join(', ')}</span>
                  )}
                </div>
                {source.excerpts && source.excerpts.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {source.excerpts.map((excerpt, j) => (
                      <p key={j} className="text-xs leading-5 text-gray-600 italic">
                        "{excerpt}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <footer className="mt-10 border-t border-gray-200 pt-4">
        <p className="text-[11px] leading-5 text-gray-400">
          This answer was generated by the MFP Volunteer Resource Hub using OSU Extension
          Master Food Preserver publications. Always verify preservation guidance with the original
          source documents before making recommendations. Publication content reflects guidance
          available at the time of indexing.
        </p>
      </footer>
    </div>
  )
}

export default function PrintPage() {
  return (
    <>
      <style>{`
        @media print {
          header, nav, [data-print-hide] { display: none !important; }
          body { background: white; }
        }
      `}</style>
      <Suspense>
        <PrintContent />
      </Suspense>
    </>
  )
}
