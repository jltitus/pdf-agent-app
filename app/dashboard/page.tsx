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

      setHistory((historyData ?? []) as HistoryItem[])

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
    return <main className="min-h-screen p-8">Loading...</main>
  }

return (
  <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
    <HeaderBar />

    {/* HERO HEADER */}
<div className="w-full border-b bg-gradient-to-r from-blue-100 via-blue-50 to-green-100">
  <div className="mx-auto max-w-6xl px-6 py-8 flex items-center gap-4">
    <img
      src="/jar-logosm.png"
      alt="MFP Publication Agent logo"
      className="w-12 h-12 object-contain"
    />
        <div>
          <h1 className="text-3xl font-bold">MFP Publication Agent</h1>
          <p className="text-sm text-gray-600">MASTER FOOD PRESERVERS</p>
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-6xl p-6 space-y-8">
      
      {/* ACTION CARDS */}
      <section className="grid md:grid-cols-3 gap-6">
        <Link
          href="/chat"
          className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition flex items-start gap-4"
        >
          <img src="/ask-agent.png" className="w-12 h-12" />
          <div>
            <h2 className="text-xl font-bold">Ask the Agent</h2>
            <p className="text-sm text-gray-600 mt-1">
              Search active MFP publications and get grounded answers with sources.
            </p>
          </div>
        </Link>

        <Link
          href="/request-access"
          className="rounded-2xl border bg-white p-6 shadow hover:shadow-md transition flex gap-4"
        >
          <img src="/request-access.png" className="w-12 h-12" />
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
            className="rounded-2xl border bg-white p-6 shadow hover:shadow-md transition flex gap-4"
          >
            <img src="/admin.png" className="w-12 h-12" />
            <div>
              <h2 className="text-xl font-bold">Admin</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage publications, process PDFs, and approve access requests.
              </p>
            </div>
          </Link>
        )}
      </section>

      {/* RECENT QUESTIONS */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src="/questions-dash.png" className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Recent Questions</h2>
          </div>

          <Link href="/chat">
            <button className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm shadow hover:bg-blue-700 transition">
              Go to chat
            </button>
          </Link>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-gray-600">No questions yet.</p>
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

      {/* RECENT FEEDBACK */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <img src="/questions.png" className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Recent Feedback</h2>
        </div>

        {feedback.length === 0 ? (
          <p className="text-sm text-gray-600">No feedback yet.</p>
        ) : (
          <div className="space-y-3">
            {feedback.map((item) => (
              <div key={item.id} className="rounded-xl border p-4 bg-white hover:bg-gray-50 transition">
                <p className="font-medium">{item.feedback_type}</p>
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

      {/* ABOUT */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <img src="/info.png" className="w-6 h-6" />
          <h2 className="text-xl font-bold">About this tool</h2>
        </div>

        <p className="text-sm text-gray-600 leading-6">
          This agent answers only from active uploaded MFP publications. If it cannot find support
          in the source documents, it should say so. Review the cited source pages before relying
          on answers for food preservation decisions.
        </p>
      </section>
    </div>
  </main>
)
  
}