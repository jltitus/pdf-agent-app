'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import HeaderBar from '../components/HeaderBar'

type DocumentRow = {
  id: string
  title: string
  filename: string
  category?: string | null
  version?: string | null
  is_active: boolean
  storage_path?: string | null
  vector_store_id?: string | null
  uploaded_at?: string | null
  page_count?: number
}

type AccessRequest = {
  id: string
  full_name: string
  email: string
  reason?: string | null
  status: string
  created_at: string
}

type FeedbackItem = {
  id: string
  feedback_type: string
  question: string | null
  answer: string | null
  created_at: string
}

type NoAnswerItem = {
  id: string
  question: string
  answer: string
  category?: string | null
  answer_mode?: string | null
  evidence_strength?: {
    label?: string
    description?: string
  } | null
  created_at: string
}
type UserAnalytics = {
  totalQuestions: number
  uniqueUsers: number
  modeCounts: Record<string, number>
  categoryCounts: Record<string, number>
  recentActivity: {
    id: string
    user_id: string
    question: string
    answer_mode?: string | null
    category?: string | null
    created_at: string
  }[]
}

export default function AdminPage() {
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics>({
  totalQuestions: 0,
  uniqueUsers: 0,
  modeCounts: {},
  categoryCounts: {},
  recentActivity: [],
})
  const supabase = createClient()
const [noAnswerItems, setNoAnswerItems] = useState<NoAnswerItem[]>([])
const [contentGaps, setContentGaps] = useState<
  {
    question: string
    count: number
    category?: string | null
    answer_mode?: string | null
  }[]
>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState('')

  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
const [feedbackFilter, setFeedbackFilter] = useState<
  'all' | 'helpful' | 'not_helpful' | 'missing_source'
>('all')

const [feedbackCounts, setFeedbackCounts] = useState({
  helpful: 0,
  not_helpful: 0,
  missing_source: 0,
})

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [version, setVersion] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)

  const [approvedUserInfo, setApprovedUserInfo] = useState<{
    email: string
    message: string
  } | null>(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.session.user.id)
        .single()

      if (profile?.role === 'admin' && profile?.is_active) {
        setIsAdmin(true)
        await loadData()
      }

      setLoading(false)
    }

    init()
  }, [supabase])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

async function loadData() {
  await loadDocuments()
  await loadAccessRequests()
  await loadFeedback()
  await loadNoAnswerItems()
  await loadUserAnalytics()
}
async function loadNoAnswerItems() {
  const { data } = await supabase
    .from('chat_history')
    .select('id, question, answer, category, answer_mode, evidence_strength, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const items = ((data ?? []) as NoAnswerItem[]).filter(
    (item) => item.evidence_strength?.label === 'Not found'

  
  )
const grouped: Record<string, any> = {}

items.forEach((item) => {
  const key = item.question.trim().toLowerCase()

  if (!grouped[key]) {
    grouped[key] = {
      question: item.question,
      count: 0,
      category: item.category,
      answer_mode: item.answer_mode,
    }
  }

  grouped[key].count += 1
})

const sorted = Object.values(grouped)
  .sort((a, b) => b.count - a.count)
  .slice(0, 10)

setContentGaps(sorted)
  setNoAnswerItems(items)
}
  async function loadDocuments() {
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false })

    if (docsError || !docs) {
      setDocuments([])
      return
    }

    const { data: pages } = await supabase
      .from('document_pages')
      .select('document_id')

    const pageCounts: Record<string, number> = {}

    for (const page of pages ?? []) {
      const documentId = String(page.document_id)
      pageCounts[documentId] = (pageCounts[documentId] ?? 0) + 1
    }

    const enrichedDocs = docs.map((doc) => ({
      ...doc,
      page_count: pageCounts[String(doc.id)] ?? 0,
    }))

    setDocuments(enrichedDocs)
  }

  async function loadAccessRequests() {
    const token = await getToken()

    if (!token) return

    const response = await fetch('/api/access-requests', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const result = await response.json()

    if (!response.ok) {
      setMessage(`Could not load access requests: ${result.error}`)
      return
    }

    setAccessRequests(result.requests ?? [])
  }

  async function loadFeedback() {
    const { data: feedbackData, error } = await supabase
      .from('chat_feedback')
      .select('id, feedback_type, question, answer, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !feedbackData) {
      setFeedback([])
      setFeedbackCounts({
        helpful: 0,
        not_helpful: 0,
        missing_source: 0,
      })
      return
    }

    const feedbackItems = feedbackData as FeedbackItem[]

    setFeedback(feedbackItems)

    setFeedbackCounts({
      helpful: feedbackItems.filter((item) => item.feedback_type === 'helpful').length,
      not_helpful: feedbackItems.filter((item) => item.feedback_type === 'not_helpful').length,
      missing_source: feedbackItems.filter((item) => item.feedback_type === 'missing_source').length,
    })
  }
async function loadUserAnalytics() {
  const { data } = await supabase
    .from('chat_history')
    .select('id, user_id, question, answer_mode, category, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = data ?? []

  const uniqueUserIds = new Set(rows.map((row) => row.user_id).filter(Boolean))

  const modeCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}

  rows.forEach((row) => {
    const mode = row.answer_mode || 'general'
    const cat = row.category || 'Uncategorized'

    modeCounts[mode] = (modeCounts[mode] ?? 0) + 1
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
  })

  setUserAnalytics({
    totalQuestions: rows.length,
    uniqueUsers: uniqueUserIds.size,
    modeCounts,
    categoryCounts,
    recentActivity: rows.slice(0, 10),
  })
}
  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('Uploading...')
    setApprovedUserInfo(null)

    if (!file) {
      setMessage('Please choose a PDF file.')
      return
    }

    if (file.type !== 'application/pdf') {
      setMessage('Only PDF files are allowed.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('You must be signed in.')
      return
    }

    const safeFileName = file.name.replaceAll(' ', '-')
    const storagePath = `${user.id}/${Date.now()}-${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(storagePath, file)

    if (uploadError) {
      setMessage(`Upload failed: ${uploadError.message}`)
      return
    }

    const { error: insertError } = await supabase.from('documents').insert({
      title,
      filename: file.name,
      category,
      version,
      is_active: true,
      storage_path: storagePath,
      uploaded_by: user.id,
    })

    if (insertError) {
      setMessage(`Document record failed: ${insertError.message}`)
      return
    }

    setTitle('')
    setCategory('')
    setVersion('')
    setFile(null)
    setMessage('PDF uploaded successfully.')
    await loadDocuments()
  }

  async function processDocument(documentId: string) {
    setProcessingId(documentId)
    setMessage('Processing document for AI search...')
    setApprovedUserInfo(null)

    try {
      const token = await getToken()

      if (!token) {
        setMessage('You must be signed in.')
        setProcessingId(null)
        return
      }

      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(`Processing failed: ${result.error ?? 'Unknown processing error.'}`)
        setProcessingId(null)
        return
      }

      setMessage(
        result.pages_processed
          ? `Document processed successfully. Pages processed: ${result.pages_processed}.`
          : 'Document processed successfully for AI search.'
      )

      setProcessingId(null)
      await loadDocuments()
    } catch (error: any) {
      setMessage(`Processing failed: ${error.message ?? 'Network or server error.'}`)
      setProcessingId(null)
    }
  }

  async function updateDocumentStatus(documentId: string, isActive: boolean) {
    setUpdatingId(documentId)
    setMessage(isActive ? 'Unarchiving document...' : 'Archiving document...')
    setApprovedUserInfo(null)

    const token = await getToken()

    if (!token) {
      setMessage('You must be signed in.')
      setUpdatingId(null)
      return
    }

    const response = await fetch('/api/update-document-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ documentId, isActive }),
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(`Status update failed: ${result.error ?? 'Unknown status error.'}`)
      setUpdatingId(null)
      return
    }

    setMessage(isActive ? 'Document unarchived.' : 'Document archived.')
    setUpdatingId(null)
    await loadDocuments()
  }

  async function deleteDocument(documentId: string, documentTitle: string) {
    const confirmed = window.confirm(
      `Delete "${documentTitle}"? This will remove the PDF, page chunks, OpenAI files, and document record. This cannot be undone.`
    )

    if (!confirmed) return

    setDeletingId(documentId)
    setMessage('Deleting document...')
    setApprovedUserInfo(null)

    try {
      const token = await getToken()

      if (!token) {
        setMessage('You must be signed in.')
        setDeletingId(null)
        return
      }

      const response = await fetch('/api/delete-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(`Delete failed: ${result.error ?? 'Unknown delete error.'}`)
        setDeletingId(null)
        return
      }

      setMessage('Document deleted.')
      setDeletingId(null)
      await loadDocuments()
    } catch (error: any) {
      setMessage(`Delete failed: ${error.message ?? 'Network or server error.'}`)
      setDeletingId(null)
    }
  }

  async function approveAccessRequest(requestId: string) {
    setApprovingId(requestId)
    setMessage('Approving access request...')
    setApprovedUserInfo(null)

    try {
      const token = await getToken()

      if (!token) {
        setMessage('You must be signed in.')
        setApprovingId(null)
        return
      }

      const response = await fetch('/api/approve-access-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(`Approval failed: ${result.error ?? 'Unknown approval error.'}`)
        setApprovingId(null)
        return
      }

      setApprovedUserInfo({
        email: result.email,
        message:
          result.message ??
          'Invitation email sent. User will set their password from the email link.',
      })

      setMessage('Access request approved. Invitation email sent.')
      setApprovingId(null)
      await loadAccessRequests()
    } catch (error: any) {
      setMessage(`Approval failed: ${error.message ?? 'Network or server error.'}`)
      setApprovingId(null)
    }
  }

  async function declineRequest(requestId: string) {
    const confirmDecline = window.confirm(
      'Are you sure you want to decline this access request?'
    )

    if (!confirmDecline) return

    setDecliningId(requestId)
    setMessage('Declining request...')
    setApprovedUserInfo(null)

    try {
      const token = await getToken()

      if (!token) {
        setMessage('You must be signed in.')
        setDecliningId(null)
        return
      }

      const res = await fetch('/api/decline-access-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
      })

      const result = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessage(result.error ?? 'Decline failed.')
        setDecliningId(null)
        return
      }

      setMessage('Access request declined.')
      setDecliningId(null)
      await loadData()
    } catch (error: any) {
      setMessage(`Decline failed: ${error.message ?? 'Network or server error.'}`)
      setDecliningId(null)
    }
  }
async function saveTrustedAnswer(item: NoAnswerItem) {
  setMessage('Saving trusted answer...')

  try {
    const token = await getToken()

    if (!token) {
      setMessage('You must be signed in.')
      return
    }

    const res = await fetch('/api/trusted-answers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: item.question,
        answer: item.answer,
        category: item.category,
        answerMode: item.answer_mode,
        sources: [],
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      setMessage(result.error ?? 'Failed to save trusted answer.')
      return
    }

    setMessage('Trusted answer saved.')
  } catch (error: any) {
    setMessage(error.message ?? 'Failed to save trusted answer.')
  }
}
  if (loading) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen p-8">Loading...</main>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen p-8">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p>You must be an admin to manage this app.</p>
        </main>
      </>
    )
  }

  const totalDocs = documents.length
  const activeDocs = documents.filter((doc) => doc.is_active).length
  const archivedDocs = documents.filter((doc) => !doc.is_active).length
  const totalPages = documents.reduce((sum, doc) => sum + (doc.page_count ?? 0), 0)
  const pendingRequests = accessRequests.filter((request) => request.status === 'pending')
const filteredFeedback =
  feedbackFilter === 'all'
    ? feedback
    : feedback.filter((item) => item.feedback_type === feedbackFilter)

function exportFeedbackCSV() {
  if (feedback.length === 0) return

  const headers = ['Question', 'Answer', 'Feedback Type', 'Date']

  const rows = feedback.map((item) => [
    item.question ?? '',
    item.answer ?? '',
    item.feedback_type,
    new Date(item.created_at).toLocaleString(),
  ])

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'feedback.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
  return (
    <>
      <HeaderBar />

      <main className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Admin: Manage PDF Agent</h1>
            <p className="text-gray-600">
              Upload, process, archive, delete, approve or decline access requests, and review tester feedback.
            </p>
          </div>

          {message && (
            <div className="rounded-lg border p-3 text-sm">
              {message}
            </div>
          )}

          {approvedUserInfo && (
            <section className="rounded-2xl border p-5 space-y-3">
              <h2 className="text-xl font-bold">Approved User Invitation</h2>
              <p className="text-sm text-gray-600">
                The user has been approved and should receive an email invitation to set their password.
              </p>
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <p>
                  <strong>Email:</strong> {approvedUserInfo.email}
                </p>
                <p>
                  <strong>Status:</strong> {approvedUserInfo.message}
                </p>
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="rounded-2xl border p-4">
              <p className="text-sm text-gray-600">Total documents</p>
              <p className="text-2xl font-bold">{totalDocs}</p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold">{activeDocs}</p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-gray-600">Archived</p>
              <p className="text-2xl font-bold">{archivedDocs}</p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-gray-600">Processed pages</p>
              <p className="text-2xl font-bold">{totalPages}</p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-gray-600">Pending requests</p>
              <p className="text-2xl font-bold">{pendingRequests.length}</p>
            </div>
          </section>

          <section className="rounded-2xl border p-6 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Access Requests</h2>
              <p className="text-sm text-gray-600">
                Approve requesters to send an invite email, or decline requests that should not receive access.
              </p>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="text-sm text-gray-600">No pending access requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold">{request.full_name}</p>
                        <p className="text-sm text-gray-600">{request.email}</p>
                        <p className="text-sm">
                          <strong>Reason:</strong> {request.reason || 'None provided'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Requested: {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => approveAccessRequest(request.id)}
                          disabled={
                            approvingId === request.id ||
                            decliningId === request.id
                          }
                          className="rounded-lg border px-3 py-2 text-sm"
                        >
                          {approvingId === request.id ? 'Approving...' : 'Approve'}
                        </button>

                        <button
                          type="button"
                          onClick={() => declineRequest(request.id)}
                          disabled={
                            approvingId === request.id ||
                            decliningId === request.id
                          }
                          className="rounded-lg border px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                        >
                          {decliningId === request.id ? 'Declining...' : 'Decline'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

<section className="rounded-2xl border p-6 space-y-4">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
    <div>
      <h2 className="text-2xl font-bold">Feedback Dashboard</h2>
      <p className="text-sm text-gray-600">
        Review tester feedback to identify helpful answers, weak answers, and source issues.
      </p>
    </div>

    <div className="flex gap-2 flex-wrap">
      <select
        value={feedbackFilter}
        onChange={(e) =>
          setFeedbackFilter(
            e.target.value as 'all' | 'helpful' | 'not_helpful' | 'missing_source'
          )
        }
        className="rounded-lg border px-3 py-2 text-sm"
      >
        <option value="all">All</option>
        <option value="helpful">Helpful</option>
        <option value="not_helpful">Not helpful</option>
        <option value="missing_source">Missing source</option>
      </select>

      <button
        type="button"
        onClick={exportFeedbackCSV}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
      >
        Export CSV
      </button>
    </div>
  </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-gray-600">Helpful</p>
                <p className="text-2xl font-bold">{feedbackCounts.helpful}</p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-sm text-gray-600">Not helpful</p>
                <p className="text-2xl font-bold">{feedbackCounts.not_helpful}</p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-sm text-gray-600">Missing source</p>
                <p className="text-2xl font-bold">{feedbackCounts.missing_source}</p>
              </div>
            </div>

            {filteredFeedback.length === 0 ? (
              <p className="text-sm text-gray-600">No feedback submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {filteredFeedback.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4">
                    <p className="text-sm font-semibold uppercase">
                      {item.feedback_type.replaceAll('_', ' ')}
                    </p>

                    <p className="mt-2 text-sm">
                      <strong>Question:</strong> {item.question || 'No question saved'}
                    </p>

                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      <strong>Answer:</strong> {item.answer || 'No answer saved'}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
<section className="rounded-2xl border p-6 space-y-4">
  <div>
    <h2 className="text-2xl font-bold">No Answer / Not Found Questions</h2>
    <p className="text-sm text-gray-600">
      These are questions where the agent could not find supported content in the selected publications.
    </p>
  </div>

  {noAnswerItems.length === 0 ? (
    <p className="text-sm text-gray-600">No not-found questions yet.</p>
  ) : (
    <div className="space-y-3">
      {noAnswerItems.map((item) => (
        <div key={item.id} className="rounded-lg border p-4">
          <p className="text-sm font-semibold">
            {item.question}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Mode: {item.answer_mode || 'general'} 
            {item.category ? ` • Category: ${item.category}` : ''}
          </p>

          <p className="mt-2 line-clamp-3 text-sm text-gray-600">
            {item.answer}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            {new Date(item.created_at).toLocaleString()}
          </p>
          <div className="mt-3">
  <button
    type="button"
    onClick={() => saveTrustedAnswer(item)}
    className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
  >
    Save as trusted
  </button>
</div>
        </div>
        
      ))}
    </div>
  )}
</section>

<section className="rounded-2xl border p-6 space-y-4">
  <div>
    <h2 className="text-2xl font-bold">Top Content Gaps</h2>
    <p className="text-sm text-gray-600">
      Most frequently asked questions that could not be answered.
    </p>
  </div>

  {contentGaps.length === 0 ? (
    <p className="text-sm text-gray-600">No content gaps yet.</p>
  ) : (
    <div className="space-y-3">
      {contentGaps.map((gap, index) => (
        <div key={index} className="rounded-lg border p-4">
          <p className="font-semibold text-sm">{gap.question}</p>

          <p className="mt-1 text-sm text-gray-600">
            Asked {gap.count} time{gap.count > 1 ? 's' : ''}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Mode: {gap.answer_mode || 'general'}
            {gap.category ? ` • Category: ${gap.category}` : ''}
          </p>
        </div>
      ))}
    </div>
  )}
</section>
<section className="rounded-2xl border p-6 space-y-4">
  <div>
    <h2 className="text-2xl font-bold">User Analytics</h2>
    <p className="text-sm text-gray-600">
      See how testers are using the app and what kinds of questions they ask.
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div className="rounded-2xl border p-4">
      <p className="text-sm text-gray-600">Questions asked</p>
      <p className="text-2xl font-bold">{userAnalytics.totalQuestions}</p>
    </div>

    <div className="rounded-2xl border p-4">
      <p className="text-sm text-gray-600">Unique users</p>
      <p className="text-2xl font-bold">{userAnalytics.uniqueUsers}</p>
    </div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="rounded-2xl border p-4">
      <h3 className="font-bold">Answer modes</h3>

      {Object.keys(userAnalytics.modeCounts).length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">No mode usage yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {Object.entries(userAnalytics.modeCounts).map(([mode, count]) => (
            <div key={mode} className="flex justify-between text-sm">
              <span>{mode}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="rounded-2xl border p-4">
      <h3 className="font-bold">Categories</h3>

      {Object.keys(userAnalytics.categoryCounts).length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">No category usage yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {Object.entries(userAnalytics.categoryCounts).map(([cat, count]) => (
            <div key={cat} className="flex justify-between text-sm">
              <span>{cat}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>

  <div className="rounded-2xl border p-4">
    <h3 className="font-bold">Recent Activity</h3>

    {userAnalytics.recentActivity.length === 0 ? (
      <p className="mt-2 text-sm text-gray-600">No recent activity yet.</p>
    ) : (
      <div className="mt-3 space-y-3">
        {userAnalytics.recentActivity.map((item) => (
          <div key={item.id} className="rounded-lg border p-3">
            <p className="text-sm font-semibold">{item.question}</p>
            <p className="mt-1 text-xs text-gray-500">
              Mode: {item.answer_mode || 'general'}
              {item.category ? ` • Category: ${item.category}` : ''}
              {' • '}
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    )}
  </div>
</section>
          <form onSubmit={handleUpload} className="rounded-2xl border p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-1">Upload a PDF</h2>
              <p className="text-sm text-gray-600">
                Upload first, then process it for page-aware AI search.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Document title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Example: Food safety, Canning, Freezing, Recipes"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Version</label>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Example: 2026, v1, current"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">PDF file</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full"
                required
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-black text-white px-4 py-2"
            >
              Upload PDF
            </button>
          </form>

          <section className="space-y-3">
            <div>
              <h2 className="text-2xl font-bold">Uploaded documents</h2>
              <p className="text-sm text-gray-600">
                Processed documents are split into page-level files for better source citations.
              </p>
            </div>

            {documents.length === 0 ? (
              <p>No documents uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const isProcessed = (doc.page_count ?? 0) > 0
                  const uploadedDate = doc.uploaded_at
                    ? new Date(doc.uploaded_at).toLocaleString()
                    : 'Unknown'

                  return (
                    <div
                      key={doc.id}
                      className={`rounded-2xl border p-5 ${
                        doc.is_active ? '' : 'opacity-60'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold text-lg">{doc.title}</p>
                            <p className="text-sm text-gray-600">{doc.filename}</p>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border px-2 py-1">
                              {doc.is_active ? 'Active' : 'Archived'}
                            </span>

                            <span className="rounded-full border px-2 py-1">
                              {isProcessed ? 'Processed' : 'Not processed'}
                            </span>

                            <span className="rounded-full border px-2 py-1">
                              Pages: {doc.page_count ?? 0}
                            </span>
                          </div>

                          <div className="text-sm space-y-1">
                            <p>
                              <strong>Category:</strong> {doc.category || 'None'}
                            </p>
                            <p>
                              <strong>Version:</strong> {doc.version || 'None'}
                            </p>
                            <p>
                              <strong>Uploaded:</strong> {uploadedDate}
                            </p>
                            <p>
                              <strong>Vector store:</strong>{' '}
                              {doc.vector_store_id ? 'Connected' : 'Not connected'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => updateDocumentStatus(doc.id, !doc.is_active)}
                            disabled={updatingId === doc.id || deletingId === doc.id}
                            className="rounded-lg border px-3 py-2 text-sm"
                          >
                            {updatingId === doc.id
                              ? 'Updating...'
                              : doc.is_active
                                ? 'Archive'
                                : 'Unarchive'}
                          </button>

                          <button
                            onClick={() => processDocument(doc.id)}
                            disabled={processingId === doc.id || deletingId === doc.id}
                            className="rounded-lg border px-3 py-2 text-sm"
                          >
                            {processingId === doc.id
                              ? 'Processing...'
                              : isProcessed
                                ? 'Reprocess'
                                : 'Process for AI Search'}
                          </button>

                          <button
                            onClick={() => deleteDocument(doc.id, doc.title)}
                            disabled={deletingId === doc.id}
                            className="rounded-lg border px-3 py-2 text-sm text-red-700"
                          >
                            {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}