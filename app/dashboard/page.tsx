'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

type Profile = {
  full_name: string | null
  role: string | null
}

type HistoryItem = {
  id: string
  question: string
  created_at: string
}

type RecentPublication = {
  id: string
  title: string | null
  filename: string
  category: string | null
  uploaded_at: string | null
}

const sampleQuestions = [
  'What is the safe processing time for applesauce?',
  'Can I safely dry herbs at home?',
  'Where can I find tested salsa recipes?',
  'How should I answer questions about low-sugar jam?',
]

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [recentPublications, setRecentPublications] = useState<RecentPublication[]>([])
  const [docCount, setDocCount] = useState<number>(0)
  const [pageCount, setPageCount] = useState<number>(0)
  const [quickQuestion, setQuickQuestion] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const user = data.session.user

      const [
        { data: profileData },
        { data: historyData },
        { data: recentPubs },
        { count: docs },
        { count: pages },
      ] = await Promise.all([
        supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
        supabase
          .from('chat_history')
          .select('id, question, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('documents')
          .select('id, title, filename, category, uploaded_at')
          .eq('is_active', true)
          .order('uploaded_at', { ascending: false })
          .limit(4),
        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('document_pages')
          .select('*', { count: 'exact', head: true }),
      ])

      setProfile(profileData)
      setHistory((historyData ?? []) as HistoryItem[])
      setRecentPublications((recentPubs ?? []) as RecentPublication[])
      setDocCount(docs ?? 0)
      setPageCount(pages ?? 0)
      setLoading(false)
    }

    loadDashboard()
  }, [supabase])

  function handleQuickQuestion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = quickQuestion.trim()
    if (!q) return
    router.push(`/chat?question=${encodeURIComponent(q)}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] p-6 text-primary">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#d8d1c7] bg-white p-5 shadow-sm">
          Loading MFP Publication Reference system...
        </div>
      </main>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-primary">
      <div className="mx-auto max-w-7xl space-y-6 px-3 py-5 sm:px-6 sm:py-8">

        {/* Hero */}
        <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
          <div className="bg-[#d73f09] px-5 py-3 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em]">
              Oregon State University Extension
            </p>
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                  Professional preservation reference system
                </p>
                <h1 className="mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl">
                  Welcome back, {firstName}.
                </h1>
                <p className="mt-3 text-base leading-7 text-secondary">
                  Search OSU Extension publications, review source citations, and support your community with evidence-based guidance.
                </p>

                <form onSubmit={handleQuickQuestion} className="mt-6 flex gap-2">
                  <input
                    value={quickQuestion}
                    onChange={(e) => setQuickQuestion(e.target.value)}
                    placeholder="Ask a preservation question…"
                    className="min-h-11 flex-1 rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#d73f09]"
                  />
                  <button
                    type="submit"
                    disabled={!quickQuestion.trim()}
                    className="rounded-xl bg-[#d73f09] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#b23408] disabled:opacity-40"
                  >
                    Ask
                  </button>
                </form>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/publications"
                    className="rounded-xl border border-[#d8d1c7] bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
                  >
                    Browse publications
                  </Link>
                  <Link
                    href="/community"
                    className="rounded-xl border border-[#d8d1c7] bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
                  >
                    Connect with MFPs
                  </Link>
                  {profile?.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="rounded-xl border border-[#d8d1c7] bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
                    >
                      Admin
                    </Link>
                  )}
                </div>
              </div>

              <aside className="shrink-0 rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-5 lg:w-64">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Knowledge base
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-3xl font-bold text-primary">{docCount}</p>
                    <p className="text-sm text-secondary">active publications</p>
                  </div>
                  <div className="border-t border-[#e8e1d8] pt-3">
                    <p className="text-3xl font-bold text-primary">{pageCount.toLocaleString()}</p>
                    <p className="text-sm text-secondary">indexed pages</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-[#ead9bf] bg-[#f7f0dd] p-3 text-xs leading-5 text-secondary">
                  <strong className="text-primary">Best practice:</strong> Review citations and source excerpts before making preservation recommendations.
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* Recent questions + Recently added publications */}
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-primary">Recent questions</h2>
              <Link
                href="/chat"
                className="rounded-xl bg-[#d73f09] px-3 py-2 text-xs font-semibold text-white hover:bg-[#b23408]"
              >
                New question
              </Link>
            </div>

            {history.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-4 text-sm text-secondary">
                No questions yet. Start by asking a preservation question.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#e5ded5]">
                {history.map((item) => (
                  <Link
                    key={item.id}
                    href={`/chat?question=${encodeURIComponent(item.question)}`}
                    className="block py-3 hover:bg-[#fcfaf7]"
                  >
                    <p className="line-clamp-2 text-sm font-medium text-primary">
                      {item.question}
                    </p>
                    <p className="mt-1 text-xs text-muted">{formatDate(item.created_at)}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-primary">Recently added</h2>
              <Link
                href="/publications"
                className="text-sm font-semibold text-[#d73f09] underline-offset-4 hover:underline"
              >
                View all →
              </Link>
            </div>

            {recentPublications.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-4 text-sm text-secondary">
                No publications yet.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#e5ded5]">
                {recentPublications.map((pub) => (
                  <div key={pub.id} className="py-3">
                    <p className="text-sm font-semibold text-primary line-clamp-1">
                      {pub.title || pub.filename}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {pub.category && (
                        <span className="rounded-full bg-[#f3f0ed] px-2 py-0.5 text-[11px] font-semibold text-secondary">
                          {pub.category}
                        </span>
                      )}
                      <span className="text-xs text-muted">{formatDate(pub.uploaded_at)}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Link
                        href={`/api/view-source?file=${encodeURIComponent(pub.filename)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#d73f09] underline-offset-4 hover:underline"
                      >
                        Open PDF
                      </Link>
                      <span className="text-xs text-muted">·</span>
                      <Link
                        href={`/chat?documentId=${pub.id}`}
                        className="text-xs font-semibold text-[#d73f09] underline-offset-4 hover:underline"
                      >
                        Ask about this
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sample questions + Professional network */}
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-primary">Common questions</h2>
            <p className="mt-1 text-sm text-secondary">Tap any question to ask it in chat.</p>
            <div className="mt-4 grid gap-2">
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
            <h2 className="text-xl font-bold text-primary">Professional network</h2>
            <p className="mt-2 text-sm leading-6 text-secondary">
              Your profile helps other Master Food Preservers find you by interests, specialties, and location.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/profile"
                className="rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] px-4 py-3 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
              >
                Update profile
              </Link>
              <Link
                href="/community"
                className="rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] px-4 py-3 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
              >
                Find MFPs
              </Link>
            </div>
          </section>
        </div>

      </div>
    </main>
  )
}
