'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

function UpdatePasswordContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('Checking your password reset link...')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
  async function prepareSession() {
    setMessage('Checking your password reset link...')

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

    // Give Supabase a few tries to finish establishing the recovery session
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
      'This password link is missing a valid session. Please request a new password reset link and open it in the same browser.'
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

    await supabase.auth.signOut()
    setMessage('Password updated. Redirecting to login...')

    setTimeout(() => router.push('/login'), 1200)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Set New Password</h1>

        {message && (
          <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
            {message}
          </div>
        )}

        <form onSubmit={updatePassword} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            className="w-full rounded-lg border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!sessionReady || loading}
          />

          <input
            type="password"
            placeholder="Confirm new password"
            className="w-full rounded-lg border px-3 py-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={!sessionReady || loading}
          />

          <button
            type="submit"
            disabled={!sessionReady || loading}
            className="w-full rounded-lg bg-black py-2 text-white disabled:opacity-60"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>

        {!sessionReady && (
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Request a new password link
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
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-8">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            Checking password reset link...
          </div>
        </main>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  )
}