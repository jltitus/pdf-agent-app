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

const sampleQuestions = [
  'What is the safe processing time for applesauce?',
  'Can I safely dry herbs at home?',
  'Where can I find tested salsa recipes?',
  'How should I answer questions about low-sugar jam?',
]

export default function DashboardPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
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
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-[#f7f4ef] p-6 text-primary">
          <div className="mx-auto max-w-6xl rounded-2xl border border-[#d8d1c7] bg-white p-5 shadow-sm">
            Loading MFP Publication Agent...
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-[#f7f4ef] text-primary">
        <div className="mx-auto max-w-7xl space-y-6 px-3 py-5 sm:px-6 sm:py-8">
          <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
            <div className="bg-[#d73f09] px-5 py-3 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">
                Oregon State University Extension
              </p>
            </div>

            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                  Professional preservation reference system
                </p>

                <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-primary sm:text-4xl lg:text-5xl">
                  Find trusted preservation answers faster.
                </h1>

                <p className="mt-5 max-w-3xl text-base leading-7 text-secondary sm:text-lg">
                  Search current OSU Extension Master Food Preserver publications,
                  review source citations, and support the communities you serve
                  with evidence-based preservation guidance.
                </p>

                <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
                  <Link
                    href="/chat"
                    className="rounded-xl bg-[#d73f09] px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#b23408]"
                  >
                    Ask a preservation question
                  </Link>

                  <Link
                    href="/publications"
                    className="rounded-xl border border-[#d8d1c7] bg-white px-5 py-3 text-center text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
                  >
                    Browse publications
                  </Link>

                  <Link
                    href="/community"
                    className="rounded-xl border border-[#d8d1c7] bg-white px-5 py-3 text-center text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
                  >
                    Connect with MFPs
                  </Link>
                </div>
              </div>

              <aside className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-5">
                <h2 className="text-xl font-bold text-primary">
                  Current OSU publication guidance
                </h2>

                <p className="mt-3 text-sm leading-6 text-secondary">
                  This system contains digital copies of OSU Extension Master
                  Food Preserver publications. New and updated publications are
                  added as guidance evolves.
                </p>

                <div className="mt-5 rounded-xl border border-[#ead9bf] bg-[#f7f0dd] p-4 text-sm leading-6 text-secondary">
                  <strong className="text-primary">Best practice:</strong>{' '}
                  Review citations and source excerpts before providing
                  preservation recommendations.
                </div>

                <p className="mt-4 text-xs text-muted">
                  Signed in as {profile?.full_name || 'MFP user'}
                </p>
              </aside>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Search trusted guidance',
                text: 'Ask preservation questions using grounded OSU Extension publications.',
              },
              {
                title: 'Review citations and sources',
                text: 'Open referenced publications and confirm the original preservation guidance.',
              },
              {
                title: 'Support Oregon communities',
                text: 'Answer preservation questions with greater confidence and consistency.',
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[#d8d1c7] bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-bold text-primary">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-secondary">{item.text}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                    Common preservation questions
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-primary">
                    Start with trusted questions.
                  </h2>
                </div>

                <Link
                  href="/chat"
                  className="text-sm font-semibold text-[#d73f09] underline-offset-4 hover:underline"
                >
                  Open chat →
                </Link>
              </div>

              <div className="mt-5 grid gap-3">
                {sampleQuestions.map((question) => (
                  <Link
                    key={question}
                    href={`/chat?question=${encodeURIComponent(question)}`}
                    className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-4 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
                  >
                    {question}
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                Professional network
              </p>

              <h2 className="mt-2 text-2xl font-bold text-primary">
                Connect with other Oregon MFPs.
              </h2>

              <p className="mt-3 text-sm leading-6 text-secondary">
                Your profile helps other Master Food Preservers find you by
                interests, specialties, and location so the community can share
                experience and support one another.
              </p>

              <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
                <Link
                  href="/profile"
                  className="rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
                >
                  Update profile
                </Link>

                <Link
                  href="/community"
                  className="rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
                >
                  Find MFPs
                </Link>

                {profile?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
                  >
                    Admin tools
                  </Link>
                )}
              </div>
            </section>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-primary">Recent questions</h2>
                <Link
                  href="/chat"
                  className="rounded-xl bg-[#d73f09] px-3 py-2 text-xs font-semibold text-white hover:bg-[#b23408]"
                >
                  Go to chat
                </Link>
              </div>

              {history.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-4 text-sm text-secondary">
                  No questions yet. Start by asking a preservation question.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-[#e5ded5]">
                  {history.map((item) => (
                    <Link key={item.id} href="/chat" className="block py-3 hover:bg-[#fcfaf7]">
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

            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-bold text-primary">Recent feedback</h2>

              {feedback.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-4 text-sm text-secondary">
                  No feedback yet.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-[#e5ded5]">
                  {feedback.map((item) => (
                    <div key={item.id} className="py-3">
                      <p className="text-sm font-medium capitalize text-primary">
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
        </div>
      </main>
    </>
  )
}