'use client'

import { useState } from 'react'
import Link from 'next/link'
import HeaderBar from '../components/HeaderBar'
import { createClient } from '../../lib/supabase/client'

export default function ReportIssuePage() {
  const supabase = createClient()

  const [issueType, setIssueType] = useState('Incorrect answer')
  const [description, setDescription] = useState('')
  const [relatedQuestion, setRelatedQuestion] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitIssue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data } = await supabase.auth.getSession()
    const user = data.session?.user

    if (!user) {
      setMessage('You must be signed in to report an issue.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('issue_reports').insert({
      user_id: user.id,
      user_email: user.email,
      issue_type: issueType,
      description,
      related_question: relatedQuestion || null,
      status: 'open',
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const notificationResponse = await fetch('/api/send-issue-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issueType,
        description,
        relatedQuestion,
        userEmail: user.email,
      }),
    })

    if (!notificationResponse.ok) {
      const notificationResult = await notificationResponse.json().catch(() => ({}))
      setMessage(
        `Issue saved, but email notification failed: ${
          notificationResult.error || 'Unknown email error'
        }`
      )
      setLoading(false)
      return
    }

    setIssueType('Incorrect answer')
    setDescription('')
    setRelatedQuestion('')
    setMessage('Issue submitted. Thank you for helping improve the agent.')
    setLoading(false)
  }

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <section className="rounded-3xl border bg-white p-8 shadow-sm">
            <div className="flex items-center gap-4">
              <img
                src="/jar-logosm.png"
                alt="MFP Publication Agent logo"
                className="h-14 w-14 object-contain"
              />

              <div>
                <h1 className="text-3xl font-bold">Report an Issue</h1>
                <p className="text-sm tracking-wide text-gray-600">
                  MFP PUBLICATION AGENT
                </p>
              </div>
            </div>

            <p className="mt-6 text-sm leading-6 text-gray-600">
              Use this form to report confusing answers, missing sources, source problems,
              or anything that does not seem right.
            </p>

            <form onSubmit={submitIssue} className="mt-8 space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Issue type
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full rounded-lg border px-3 py-3"
                >
                  <option>Incorrect answer</option>
                  <option>Missing source</option>
                  <option>Wrong source or page</option>
                  <option>Could not find expected information</option>
                  <option>Login or access issue</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Related question, if applicable
                </label>
                <input
                  value={relatedQuestion}
                  onChange={(e) => setRelatedQuestion(e.target.value)}
                  className="w-full rounded-lg border px-3 py-3"
                  placeholder="Paste the question you asked, if relevant"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  What happened?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[160px] w-full rounded-lg border px-3 py-3"
                  placeholder="Describe what seemed wrong, missing, confusing, or unexpected."
                  required
                />
              </div>

              {message && (
                <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                  {message}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit issue'}
                </button>

                <Link
                  href="/help"
                  className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Back to help
                </Link>
              </div>
            </form>
          </section>
        </div>
      </main>
    </>
  )
}