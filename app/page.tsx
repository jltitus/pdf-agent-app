'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import LogoutButton from './logout-button'

type Profile = {
  full_name?: string | null
  role?: string | null
  is_active?: boolean | null
}

const sampleQuestions = [
  'What is the safe processing time for applesauce?',
  'Can I safely dry herbs at home?',
  'Where can I find tested salsa recipes?',
  'How should I answer questions about low-sugar jam?',
]

const workflowSteps = [
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
]

export default function HomePage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const user = data.session.user

      setEmail(user.email ?? null)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      setLoading(false)
    }

    loadUser()
  }, [supabase])

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-[#d8d1c7] bg-white p-5 shadow-sm">
            <p className="text-sm text-secondary">
              Loading MFP Volunteer Resource Hub...
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-primary">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
        <header className="rounded-3xl border border-[#d8d1c7] bg-white shadow-sm overflow-hidden">
          <div className="relative h-[220px] sm:h-[280px] lg:h-[340px]">
            <img
              src="/canning-banner.jpg"
              alt="Preserved foods in jars"
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/10" />

            <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-xl bg-white/90 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
                    Oregon State University Extension
                  </p>

                  <h1 className="mt-1 text-2xl font-bold text-primary sm:text-3xl lg:text-4xl">
                    MFP Volunteer Resource Hub
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary sm:text-base">
                    Trusted preservation guidance and publication retrieval for
                    Oregon Master Food Preservers.
                  </p>
                </div>

                <div className="hidden sm:block">
                  <LogoutButton />
                </div>
              </div>

              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">
                  Professional preservation reference system
                </p>

                <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                  Find trusted preservation answers faster.
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/90 sm:text-lg">
                  Search current OSU Extension Master Food Preserver
                  publications, review source citations, and support the
                  communities you serve with evidence-based preservation
                  guidance.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-[#d8d1c7] bg-[#fcfaf7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">
                Signed in as {profile?.full_name || email}
              </p>

              <p className="mt-1 text-sm text-secondary">
                Current OSU publication guidance and grounded preservation
                retrieval.
              </p>
            </div>

            <div className="grid gap-3 sm:flex">
              <Link
                href="/chat"
                className="rounded-xl bg-[#d73f09] px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#b23408]"
              >
                Ask a question
              </Link>

              <Link
                href="/publications"
                className="rounded-xl border border-[#d8d1c7] bg-white px-5 py-3 text-center text-sm font-semibold text-primary hover:bg-[#f7f4ef]"
              >
                Browse publications
              </Link>

              <div className="sm:hidden">
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
              Preservation reference workflow
            </p>

            <h2 className="mt-3 text-3xl font-bold text-primary">
              Built to support real preservation questions.
            </h2>

            <div className="mt-6 grid gap-4">
              {workflowSteps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-5"
                >
                  <h3 className="text-lg font-bold text-primary">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-secondary">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
              Current OSU guidance
            </p>

            <h2 className="mt-3 text-3xl font-bold text-primary">
              Trusted publication access.
            </h2>

            <p className="mt-4 text-sm leading-7 text-secondary">
              This system contains digital copies of OSU Extension Master Food
              Preserver publications. New and updated publications are added as
              guidance evolves.
            </p>

            <div className="mt-5 rounded-2xl border border-[#ead9bf] bg-[#f7f0dd] p-4">
              <p className="text-sm leading-6 text-secondary">
                <strong className="text-primary">Best practice:</strong>{' '}
                Review citations and source excerpts before providing
                preservation recommendations.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-[#d8d1c7] bg-[#f7f4ef] p-4">
              <p className="text-sm leading-6 text-secondary">
                Your profile also helps other Oregon Master Food Preservers
                connect with you based on shared interests and preservation
                specialties.
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-6 rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
                Common preservation questions
              </p>

              <h2 className="mt-2 text-3xl font-bold text-primary">
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

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {sampleQuestions.map((question) => (
              <Link
                key={question}
                href={`/chat?question=${encodeURIComponent(question)}`}
                className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-5 text-sm font-semibold text-primary transition hover:bg-[#f3f0ed]"
              >
                {question}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}