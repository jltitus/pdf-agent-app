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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-8 text-primary">
      <div className="w-full max-w-lg rounded-2xl border border-gray-300 bg-white p-6 shadow-sm space-y-5">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-primary">Request Access</h1>
          <p className="mt-2 text-sm text-secondary">
            Request access to the MFP Publication Agent. Access is manually approved.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm text-primary">
              {message}
            </div>

            <Link href="/login" className="text-sm font-medium underline text-primary">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submitRequest} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-primary">
                Full name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-primary"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-primary">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-primary"
                required
              />
            </div>

            {/* Reason */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-primary">
                Why are you requesting access?
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full min-h-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-primary"
                placeholder="Optional"
              />
            </div>

            {/* Message */}
            {message && (
              <p className="text-sm text-secondary">
                {message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-lg bg-black py-2 font-semibold text-white shadow-sm"
            >
              Submit request
            </button>

            {/* Back */}
            <Link
              href="/login"
              className="block text-center text-sm font-medium underline text-primary"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}