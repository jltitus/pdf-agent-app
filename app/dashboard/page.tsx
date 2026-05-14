'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'
import HeaderBar from '../components/HeaderBar'

type Profile = {
  full_name: string | null
  role: string | null
}

type HistoryItem = {
  id: string
  question: string
  answer: string
  category?: string | null
  answer_mode?: string | null
  created_at: string
}

type FeedbackItem = {
  id: string
  feedback_type: string
  question?: string | null
  created_at: string
}

export default function DashboardPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [isFirstTime, setIsFirstTime] = useState(false)

  useEffect(() => {
    async function loadDashboard() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const user = data.session.user

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      const { data: historyData } = await supabase
        .from('chat_history')
        .select('id, question, answer, category, answer_mode, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      const recentHistory = (historyData ?? []) as HistoryItem[]
      setHistory(recentHistory)
      setIsFirstTime(recentHistory.length === 0)

      const { data: feedbackData } = await supabase
        .from('chat_feedback')
        .select('id, feedback_type, question, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      setFeedback((feedbackData ?? []) as FeedbackItem[])
      setLoading(false)
    }

    loadDashboard()
  }, [supabase])

  if (loading) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8 text-primary">
          Loading...
        </main>
      </>
    )
  }

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 text-primary">
        <div className="mx-auto max-w-6xl space-y-8 p-6">

          {/* FIRST TIME */}
          {isFirstTime && (
            <section className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <img src="/jar-logosm.png" className="h-12 w-12" />

                <div>
                  <h1 className="text-2xl font-bold">
                    Welcome to the MFP Publication Agent
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm text-secondary">
                    This tool helps you search active Master Food Preserver publications and
                    get answers with source support. Always review cited sources before relying
                    on answers.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-gray-300 bg-blue-50 p-4">
                  <p className="font-semibold">1. Ask a real question</p>
                  <p className="mt-1 text-sm text-secondary">
                    Ask questions you’d actually use in practice or class.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-300 bg-green-50 p-4">
                  <p className="font-semibold">2. Review the sources</p>
                  <p className="mt-1 text-sm text-secondary">
                    Always verify answers against source documents.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="font-semibold">3. Report issues</p>
                  <p className="mt-1 text-sm text-secondary">
                    Report anything confusing or incorrect.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/chat" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
                  Start chatting
                </Link>

                <Link href="/help" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-primary hover:bg-gray-100">
                  View help
                </Link>

                <Link href="/report-issue" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-primary hover:bg-gray-100">
                  Report an issue
                </Link>
              </div>
            </section>
          )}

{/* ACTION CARDS */}
<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  {[
    { href: '/chat', icon: '🔎', title: 'Ask the Agent', text: 'Search publications and get sourced answers.' },
    { href: '/publications', icon: '📚', title: 'Publications', text: 'Browse PDFs and versions.' },
    { href: '/request-access', icon: '👥', title: 'Access', text: 'Share access with others.' },
    ...(profile?.role === 'admin'
      ? [{ href: '/admin', icon: '⚙️', title: 'Admin', text: 'Manage content and users.' }]
      : []),
  ].map((card) => (
    <Link
      key={card.href}
      href={card.href}
      className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm transition hover:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-2xl">
          {card.icon}
        </div>

        <div>
          <h2 className="text-lg font-bold text-primary">{card.title}</h2>
          <p className="mt-1 text-xs text-secondary">{card.text}</p>
        </div>
      </div>
    </Link>
  ))}
</section>

{/* HISTORY + FEEDBACK */}
<section className="grid gap-4 lg:grid-cols-2">
  <section className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
  <img src="/questions-dash.png" alt="" className="h-6 w-6" />
  <h2 className="text-xl font-bold">Recent Questions</h2>
</div>

      <Link
        href="/chat"
        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
      >
        Go to chat
      </Link>
    </div>

    {history.length === 0 ? (
      <p className="text-sm text-secondary">No questions yet.</p>
    ) : (
      <div className="divide-y divide-gray-200">
        {history.map((item) => (
          <Link
            key={item.id}
            href="/chat"
            className="block py-3 hover:bg-gray-50"
          >
            <p className="line-clamp-2 text-sm font-medium text-primary">
              {item.question}
            </p>
            <p className="mt-1 text-xs text-muted">
              {new Date(item.created_at).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    )}
  </section>

  <section className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
  <div className="mb-3 flex items-center gap-2">
  <img src="/questions.png" alt="" className="h-6 w-6" />
  <h2 className="text-xl font-bold">Recent Feedback</h2>
</div>

    {feedback.length === 0 ? (
      <p className="text-sm text-secondary">No feedback yet.</p>
    ) : (
      <div className="divide-y divide-gray-200">
        {feedback.map((item) => (
          <div key={item.id} className="py-3">
            <p className="text-sm font-medium capitalize">
              {item.feedback_type.replaceAll('_', ' ')}
            </p>

            {item.question && (
              <p className="mt-1 line-clamp-2 text-sm text-secondary">
                {item.question}
              </p>
            )}

            <p className="mt-1 text-xs text-muted">
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    )}
  </section>
</section>

{/* ABOUT */}
<section className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
  <div className="flex items-center gap-2">
  <img src="/info.png" alt="" className="h-6 w-6" />
  <h2 className="text-lg font-bold">About this tool</h2>
</div>
  <p className="mt-2 text-sm text-secondary">
    This agent answers only from active uploaded publications. Always review sources before relying on answers.
  </p>
</section>
        </div>
      </main>
    </>
  )
}