'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

function UpdatePasswordContent() {
  const hasPreparedSession = useRef(false)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('Checking your session...')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    async function prepareSession() {
      if (hasPreparedSession.current) return
      hasPreparedSession.current = true

      setMessage('Checking your session...')

      const existingSession = await supabase.auth.getSession()

      if (existingSession.data.session) {
        setMessage('')
        setSessionReady(true)
        return
      }

      const code = searchParams.get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          setMessage(
            'This password link is expired or invalid. Please request a new password reset link.'
          )
          setSessionReady(false)
          return
        }
      }

      for (let attempt = 0; attempt < 10; attempt++) {
        const { data } = await supabase.auth.getSession()

        if (data.session) {
          setMessage('')
          setSessionReady(true)
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      setMessage(
        'Please log in first using your temporary password, then create your permanent password.'
      )
      setSessionReady(false)
    }

    prepareSession()
  }, [searchParams, supabase.auth])

  async function updatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    setMessage('Updating password...')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id)
    }

    setMessage('Password updated. Redirecting to dashboard...')

    setTimeout(() => router.push('/dashboard'), 1000)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] p-6 text-primary">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-[#d8d1c7] bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
            Account security
          </p>
          <h1 className="mt-2 text-2xl font-bold text-primary">
            Create your permanent password
          </h1>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Enter a new password below. After this, you will use your new
            password to sign in.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-3 text-sm text-secondary">
            {message}
          </div>
        )}

        <form onSubmit={updatePassword} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            className="w-full rounded-2xl border border-[#d8d1c7] bg-white px-3 py-3 text-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!sessionReady || loading}
          />

          <input
            type="password"
            placeholder="Confirm new password"
            className="w-full rounded-2xl border border-[#d8d1c7] bg-white px-3 py-3 text-primary"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={!sessionReady || loading}
          />

          <button
            type="submit"
            disabled={!sessionReady || loading}
            className="w-full rounded-2xl bg-[#d73f09] py-3 font-semibold !text-white shadow-sm hover:bg-[#b23408] disabled:bg-[#9b3518] disabled:!text-white disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>

        {!sessionReady && (
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full rounded-2xl border border-[#d8d1c7] px-3 py-3 text-sm font-semibold text-primary hover:bg-[#fcfaf7]"
          >
            Go to login
          </button>
        )}
      </div>
    </main>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] p-8">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            Checking session...
          </div>
        </main>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  )
}