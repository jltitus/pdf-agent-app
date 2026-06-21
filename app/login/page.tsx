'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(true)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const savedEmail = window.localStorage.getItem('mfp_saved_email')

    if (savedEmail) {
      setEmail(savedEmail)
      setRememberEmail(true)
    }
  }, [])

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (rememberEmail) {
      window.localStorage.setItem('mfp_saved_email', email)
    } else {
      window.localStorage.removeItem('mfp_saved_email')
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Login failed.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('must_change_password')
      .eq('id', user.id)
      .single()

    await fetch('/api/track-user-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activityType: 'login',
      }),
    })

    if (profile?.must_change_password) {
      router.push('/update-password')
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-4 py-8 text-primary sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm md:grid-cols-[1fr_420px]">
          <section className="hidden bg-[#fcfaf7] p-10 text-primary md:flex md:flex-col md:justify-between">
            <div>
              <div className="border-b border-[#d8d1c7] pb-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                  Oregon State University Extension
                </p>

                <div className="mt-4 flex items-center gap-4">
                  <img
                    src="/jar-logosm.png"
                    alt="MFP Volunteer Resource Hub logo"
                    className="h-14 w-14 object-contain"
                  />

                  <div>
                    <h1 className="text-3xl font-bold text-primary">
                      MFP Volunteer Resource Hub
                    </h1>

                    <p className="text-sm font-semibold tracking-wide text-secondary">
                      MASTER FOOD PRESERVERS
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-[#d8d1c7] bg-white p-5">
                  <h2 className="font-bold text-primary">
                    Search trusted publications
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-secondary">
                    Find answers, recipes, and safety guidance from active OSU
                    Extension Master Food Preserver publications.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#d8d1c7] bg-white p-5">
                  <h2 className="font-bold text-primary">
                    Review source evidence
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-secondary">
                    Verify cited documents, pages, and excerpts before relying on
                    an answer.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#d8d1c7] bg-white p-5">
                  <h2 className="font-bold text-primary">
                    Support Oregon communities
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-secondary">
                    Use current preservation guidance to support the people and
                    communities served by Master Food Preservers.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs leading-5 text-secondary">
              Answers are limited to uploaded active publications and should be
              verified against source documents.
            </p>
          </section>

          <section className="p-8 text-primary md:p-10">
            <div className="mb-8 flex items-center gap-3 md:hidden">
              <img
                src="/jar-logosm.png"
                alt="MFP Volunteer Resource Hub logo"
                className="h-12 w-12 object-contain"
              />

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d73f09]">
                  OSU Extension
                </p>

                <h1 className="text-2xl font-bold text-primary">
                  MFP Volunteer Resource Hub
                </h1>

                <p className="text-xs font-semibold tracking-wide text-secondary">
                  MASTER FOOD PRESERVERS
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                Secure access
              </p>

              <h2 className="mt-2 text-3xl font-bold text-primary">
                Sign in
              </h2>

              <p className="mt-2 text-sm leading-6 text-secondary">
                Access the OSU Master Food Preserver volunteer resource hub.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#d8d1c7] bg-white px-3 py-3 text-primary"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[#d8d1c7] bg-white px-3 py-3 text-primary"
                  autoComplete="current-password"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="h-4 w-4"
                />

                Remember my email on this device
              </label>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                If you received a temporary password from an admin, sign in using
                that password first. You will then be asked to create your own
                permanent password.
              </div>

              {message && (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#d73f09] py-3 font-semibold !text-white shadow-sm hover:bg-[#b23408] disabled:bg-[#9b3518] disabled:!text-white disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 text-center text-sm">
              <Link
                href="/forgot-password"
                className="font-medium underline text-primary"
              >
                Forgot password?
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-4 text-center text-sm text-primary">
              Need access?{' '}
              <Link
                href="/request-access"
                className="font-semibold underline text-primary"
              >
                Request an account
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}