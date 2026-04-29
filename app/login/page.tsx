'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 px-6 py-10 text-primary">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-gray-300 bg-white shadow-sm md:grid-cols-[1fr_420px]">
          
          {/* LEFT PANEL */}
          <section className="hidden bg-gradient-to-br from-blue-100 via-blue-50 to-green-100 p-10 md:flex md:flex-col md:justify-between text-primary">
            <div>
              <div className="flex items-center gap-4">
                <img
                  src="/jar-logosm.png"
                  alt="MFP Publication Agent logo"
                  className="h-14 w-14 object-contain"
                />

                <div>
                  <h1 className="text-3xl font-bold text-primary">
                    MFP Publication Agent
                  </h1>
                  <p className="text-sm font-semibold tracking-wide text-secondary">
                    MASTER FOOD PRESERVERS
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-5">
                <div className="rounded-2xl border border-gray-300 bg-white/70 p-5">
                  <div className="flex gap-4">
                    <img src="/ask-agent.png" alt="" className="h-10 w-10" />
                    <div>
                      <h2 className="font-bold text-primary">Ask grounded questions</h2>
                      <p className="mt-1 text-sm text-secondary">
                        Search active MFP publications and get answers with source support.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-300 bg-white/70 p-5">
                  <div className="flex gap-4">
                    <img src="/questions.png" alt="" className="h-10 w-10" />
                    <div>
                      <h2 className="font-bold text-primary">Review sources</h2>
                      <p className="mt-1 text-sm text-secondary">
                        Verify cited documents and pages before relying on an answer.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-300 bg-white/70 p-5">
                  <div className="flex gap-4">
                    <img src="/info.png" alt="" className="h-10 w-10" />
                    <div>
                      <h2 className="font-bold text-primary">Designed for MFP learning</h2>
                      <p className="mt-1 text-sm text-secondary">
                        Use the agent to explore publication content, recipes, safety guidance, and process questions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-secondary">
              Answers are limited to uploaded active publications and should be verified against sources.
            </p>
          </section>

          {/* RIGHT PANEL */}
          <section className="p-8 md:p-10 text-primary">
            <div className="mb-8 flex items-center gap-3 md:hidden">
              <img
                src="/jar-logosm.png"
                alt="MFP Publication Agent logo"
                className="h-12 w-12 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  MFP Publication Agent
                </h1>
                <p className="text-xs font-semibold tracking-wide text-secondary">
                  MASTER FOOD PRESERVERS
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-primary">Sign in</h2>
              <p className="mt-2 text-sm text-secondary">
                Access the MFP Publication Agent.
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-primary"
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-primary"
                  required
                />
              </div>

              {message && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-black py-3 font-semibold text-white shadow-sm disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 text-center text-sm">
              <Link href="/forgot-password" className="font-medium underline text-primary">
                Forgot password?
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-300 bg-gray-50 p-4 text-center text-sm text-primary">
              Need access?{' '}
              <Link href="/request-access" className="font-semibold underline text-primary">
                Request an account
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link href="/help" className="text-sm underline text-primary">
                Tester guide
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}