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
    <main className="min-h-screen p-6 md:p-10">
      <HeaderBar />
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Master Food Preservers
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            MFP Publication Agent Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}. You are signed in as{' '}
            <strong>{email}</strong>.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            href="/chat"
            className="rounded-2xl border p-5 hover:bg-gray-50"
          >
            <h2 className="text-xl font-bold">Ask the Agent</h2>
            <p className="mt-2 text-sm text-gray-600">
              Search active MFP publications and get grounded answers with sources.
            </p>
          </Link>

          <Link
            href="/request-access"
            className="rounded-2xl border p-5 hover:bg-gray-50"
          >
            <h2 className="text-xl font-bold">Request Access</h2>
            <p className="mt-2 text-sm text-gray-600">
              Share this page with others who need access to the agent.
            </p>
          </Link>

          {profile?.role === 'admin' && (
            <Link
              href="/admin"
              className="rounded-2xl border p-5 hover:bg-gray-50"
            >
              <h2 className="text-xl font-bold">Admin</h2>
              <p className="mt-2 text-sm text-gray-600">
                Manage publications, process PDFs, and approve access requests.
              </p>
            </Link>
          )}
        </section>

        <section className="rounded-2xl border p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Recent Questions</h2>
            <Link href="/chat" className="text-sm underline">
              Go to chat
            </Link>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-gray-600">
              No questions yet. Start by asking the agent something from the publications.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <Link
                  key={item.id}
                  href="/chat"
                  className="block rounded-lg border p-3 hover:bg-gray-50"
                >
                  <p className="font-medium">{item.question}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                    {item.answer_mode ? ` • Mode: ${item.answer_mode}` : ''}
                    {item.category ? ` • Category: ${item.category}` : ''}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border p-5 md:p-6">
          <h2 className="text-2xl font-bold">Recent Feedback</h2>

          {feedback.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">
              No feedback submitted yet.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {feedback.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="font-medium">{item.feedback_type}</p>
                  {item.question && (
                    <p className="mt-1 text-sm text-gray-600">{item.question}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border p-5 md:p-6">
          <h2 className="text-xl font-bold">About this tool</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            This agent answers only from active uploaded MFP publications. If it cannot find support
            in the source documents, it should say so. Always review the cited source pages and excerpts
            before relying on an answer for food preservation decisions.
          </p>
        </section>
      </div>
    </main>
  )
}