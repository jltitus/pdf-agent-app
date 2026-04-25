'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

export default function RequestAccessPage() {
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function submitRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('Submitting request...')

    const { error } = await supabase.from('access_requests').insert({
      full_name: fullName,
      email,
      reason,
      status: 'pending',
    })

    if (error) {
      setMessage(`Request failed: ${error.message}`)
      return
    }

    setSubmitted(true)
    setMessage('Request submitted. You’ll be contacted if access is approved.')
    setFullName('')
    setEmail('')
    setReason('')
  }

  return (
    <main className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Request Access</h1>
          <p className="text-sm text-gray-600 mt-2">
            Request access to the PDF Agent. Access is manually approved.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 text-sm">
              {message}
            </div>

            <Link href="/login" className="text-sm underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submitRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Why are you requesting access?
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full min-h-28 rounded-lg border px-3 py-2"
                placeholder="Optional"
              />
            </div>

            {message && <p className="text-sm text-gray-600">{message}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-black text-white py-2"
            >
              Submit request
            </button>

            <Link href="/login" className="block text-center text-sm underline">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}