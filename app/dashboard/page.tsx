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
  const [email, setEmail] = useState<string | null>(null)
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
      setEmail(user.email ?? null)

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
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
          Loading...
        </main>
      </>
    )
  }

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="mx-auto max-w-6xl p-6 space-y-8">
          {isFirstTime && (
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <img
                  src="/jar-logosm.png"
                  alt="MFP Publication Agent logo"
                  className="h-12 w-12 object-contain"
                />

                <div>
                  <h1 className="text-2xl font-bold">
                    Welcome to the MFP Publication Agent
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    This tool helps you search active Master Food Preserver publications and
                    get answers with source support. Start with a real question, review the
                    cited source pages, and report anything that seems confusing or incorrect.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-blue-50 p-4">
                  <p className="font-semibold">1. Ask a real question</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Try a food preservation question you would actually ask during class,
                    study, or practice.
                  </p>
                </div>

                <div className="rounded-xl border bg-green-50 p-4">
                  <p className="font-semibold">2. Review the sources</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Open the cited PDF pages before relying on an answer, especially for
                    safety guidance.
                  </p>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="font-semibold">3. Report issues</p>
                  <p className="mt-1 text-sm text-gray-600">
                    If something seems wrong, missing, or confusing, use the Help page to
                    report an issue.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/chat"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700 transition"
                >
                  Start chatting
                </Link>

                <Link
                  href="/help"
                  className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
                >
                  View help
                </Link>

                <Link
                  href="/report-issue"
                  className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Report an issue
                </Link>
              </div>
            </section>
          )}

          <section className="grid gap-6 md:grid-cols-3">
            <Link
              href="/chat"
              className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition flex items-start gap-4"
            >
              <img src="/ask-agent.png" alt="" className="w-12 h-12" />
              <div>
                <h2 className="text-xl font-bold">Ask the Agent</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Search active MFP publications and get grounded answers with sources.
                </p>
              </div>
            </Link>

            <Link
              href="/request-access"
              className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition flex items-start gap-4"
            >
              <img src="/request-access.png" alt="" className="w-12 h-12" />
              <div>
                <h2 className="text-xl font-bold">Request Access</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Share this page with others who need access to the agent.
                </p>
              </div>
            </Link>

            {profile?.role === 'admin' && (
              <Link
                href="/admin"
                className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition flex items-start gap-4"
              >
                <img src="/admin.png" alt="" className="w-12 h-12" />
                <div>
                  <h2 className="text-xl font-bold">Admin</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage publications, process PDFs, and approve access requests.
                  </p>
                </div>
              </Link>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img src="/questions-dash.png" alt="" className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Recent Questions</h2>
              </div>

              <Link
                href="/chat"
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm shadow hover:bg-blue-700 transition"
              >
                Go to chat
              </Link>
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-gray-600">
                No questions yet. Start in Chat to see your recent questions here.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border p-4 bg-white hover:bg-gray-50 transition"
                  >
                    <p className="font-medium">{item.question}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.created_at).toLocaleString()}
                      {item.answer_mode && ` • Mode: ${item.answer_mode}`}
                      {item.category && ` • Category: ${item.category}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <img src="/questions.png" alt="" className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Recent Feedback</h2>
            </div>

            {feedback.length === 0 ? (
              <p className="text-sm text-gray-600">No feedback yet.</p>
            ) : (
              <div className="space-y-3">
                {feedback.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border p-4 bg-white hover:bg-gray-50 transition"
                  >
                    <p className="font-medium">
                      {item.feedback_type.replaceAll('_', ' ')}
                    </p>
                    {item.question && (
                      <p className="text-sm text-gray-600 mt-1">{item.question}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <img src="/info.png" alt="" className="w-6 h-6" />
              <h2 className="text-xl font-bold">About this tool</h2>
            </div>

            <p className="text-sm text-gray-600 leading-6">
              This agent answers only from active uploaded MFP publications. If it cannot
              find support in the source documents, it should say so. Review the cited
              source pages before relying on answers for food preservation decisions.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}