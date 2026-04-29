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
  approved_at?: string | null
  last_invited_at?: string | null
  invite_count?: number | null
  profile_is_active?: boolean | null
  profile_role?: string | null
  last_activity_at?: string | null
  last_question?: string | null
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

type TrustedAnswer = {
  id: string
  question: string
  answer: string
  category?: string | null
  answer_mode?: string | null
  is_active: boolean
  created_at: string
}

type IssueReport = {
  id: string
  user_email?: string | null
  issue_type: string
  description: string
  related_question?: string | null
  status: string
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
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState('')

  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [documentSearch, setDocumentSearch] = useState('')
  const [documentStatusFilter, setDocumentStatusFilter] = useState<
    'all' | 'active' | 'archived' | 'processed' | 'not_processed'
  >('all')

  const [documentHealthView, setDocumentHealthView] = useState<
    'recent' | 'not_processed' | 'zero_pages'
  >('recent')

  const [documentHealth, setDocumentHealth] = useState({
    total: 0,
    active: 0,
    archived: 0,
    notProcessed: 0,
    zeroPages: 0,
    recent: [] as DocumentRow[],
  })

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

  const [noAnswerItems, setNoAnswerItems] = useState<NoAnswerItem[]>([])
  const [contentGaps, setContentGaps] = useState<
    {
      question: string
      count: number
      category?: string | null
      answer_mode?: string | null
    }[]
  >([])

  const [trustedAnswers, setTrustedAnswers] = useState<TrustedAnswer[]>([])
  const [issueReports, setIssueReports] = useState<IssueReport[]>([])
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null)
  const [editingTrustedId, setEditingTrustedId] = useState<string | null>(null)
  const [trustedEditQuestion, setTrustedEditQuestion] = useState('')
  const [trustedEditAnswer, setTrustedEditAnswer] = useState('')

  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics>({
    totalQuestions: 0,
    uniqueUsers: 0,
    modeCounts: {},
    categoryCounts: {},
    recentActivity: [],
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
  const [sendingInvite, setSendingInvite] = useState(false)
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null)
  const [updatingUserEmail, setUpdatingUserEmail] = useState<string | null>(null)
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteEmailWarning, setInviteEmailWarning] = useState('')
  const [userInviteSearch, setUserInviteSearch] = useState('')
  const [userInviteStatusFilter, setUserInviteStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'declined'
  >('all')
  const [activeTab, setActiveTab] = useState<
    'overview' | 'access' | 'documents' | 'feedback' | 'trusted'
  >('overview')

  const [approvedUserInfo, setApprovedUserInfo] = useState<{
    email: string
    message: string
  } | null>(null)

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary'
  const labelClass = 'mb-1 block text-sm font-semibold text-primary'
  const secondaryButton =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-100 disabled:opacity-60'
  const smallSecondaryButton =
    'rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-gray-100 disabled:opacity-60'
  const primaryButton =
    'rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60'
  const cardClass = 'rounded-2xl border border-gray-300 bg-white p-6 shadow-sm'
  const subCardClass = 'rounded-xl border border-gray-300 bg-gray-50 p-4'

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
    await loadTrustedAnswers()
    await loadIssueReports()
  }

  async function loadDocuments() {
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false })

    if (docsError || !docs) {
      setDocuments([])
      setDocumentHealth({
        total: 0,
        active: 0,
        archived: 0,
        notProcessed: 0,
        zeroPages: 0,
        recent: [],
      })
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

    const total = enrichedDocs.length
    const active = enrichedDocs.filter((d) => d.is_active).length
    const archived = enrichedDocs.filter((d) => !d.is_active).length
    const notProcessed = enrichedDocs.filter(
      (d) => !d.page_count || d.page_count === 0
    ).length

    const recent = [...enrichedDocs]
      .sort(
        (a, b) =>
          new Date(b.uploaded_at ?? 0).getTime() -
          new Date(a.uploaded_at ?? 0).getTime()
      )
      .slice(0, 5)

    setDocumentHealth({
      total,
      active,
      archived,
      notProcessed,
      zeroPages: notProcessed,
      recent,
    })
  }

  async function loadAccessRequests() {
    const token = await getToken()
    if (!token) return

    const response = await fetch('/api/access-requests', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
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
      .limit(50)

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

  async function loadNoAnswerItems() {
    const { data } = await supabase
      .from('chat_history')
      .select('id, question, answer, category, answer_mode, evidence_strength, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    const items = ((data ?? []) as NoAnswerItem[]).filter(
      (item) => item.evidence_strength?.label === 'Not found'
    )

    const grouped: Record<
      string,
      {
        question: string
        count: number
        category?: string | null
        answer_mode?: string | null
      }
    > = {}

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

  async function loadTrustedAnswers() {
    const { data, error } = await supabase
      .from('trusted_answers')
      .select('id, question, answer, category, answer_mode, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error || !data) {
      setTrustedAnswers([])
      return
    }

    setTrustedAnswers(data as TrustedAnswer[])
  }

  async function loadIssueReports() {
    const { data, error } = await supabase
      .from('issue_reports')
      .select('id, user_email, issue_type, description, related_question, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !data) {
      setIssueReports([])
      return
    }

    setIssueReports(data as IssueReport[])
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

  async function sendDirectInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSendingInvite(true)
    setMessage('Sending invite...')
    setApprovedUserInfo(null)

    try {
      const trimmedEmail = inviteEmail.trim().toLowerCase()
      setInviteEmailWarning('')

      if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        setInviteEmailWarning('Please enter a valid email address before sending an invite.')
        setMessage('Please enter a valid email address before sending an invite.')
        setSendingInvite(false)
        return
      }

      if (
        trimmedEmail.includes('enter_') ||
        trimmedEmail.includes('placeholder') ||
        trimmedEmail.includes('example.com')
      ) {
        setInviteEmailWarning('Please replace the placeholder with a real email address.')
        setMessage('Please replace the placeholder with a real email address.')
        setSendingInvite(false)
        return
      }

      const token = await getToken()

      if (!token) {
        setMessage('You must be signed in.')
        setSendingInvite(false)
        return
      }

      const res = await fetch('/api/send-user-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: inviteFullName,
          email: trimmedEmail,
        }),
      })

      const result = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessage(result.error ?? 'Invite failed.')
        setSendingInvite(false)
        return
      }

      setInviteFullName('')
      setInviteEmail('')
      setInviteEmailWarning('')
      setApprovedUserInfo({
        email: result.email,
        message: result.message ?? 'Invite sent.',
      })
      setMessage(result.message ?? 'Invite sent.')
      setSendingInvite(false)
      await loadData()
    } catch (error: any) {
      setMessage(`Invite failed: ${error.message ?? 'Network or server error.'}`)
      setSendingInvite(false)
    }
  }

  async function resendInvite(request: AccessRequest) {
    setResendingInviteId(request.id)
    setMessage('Resending invite...')
    setApprovedUserInfo(null)

    try {
      const token = await getToken()

      if (!token) {
        setMessage('You must be signed in.')
        setResendingInviteId(null)
        return
      }

      const res = await fetch('/api/resend-user-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: request.id }),
      })

      const result = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessage(result.error ?? 'Resend invite failed.')
        setResendingInviteId(null)
        return
      }

      setApprovedUserInfo({
        email: result.email,
        message: result.message ?? 'Invite resent.',
      })
      setMessage(result.message ?? 'Invite resent.')
      setResendingInviteId(null)
      await loadData()
    } catch (error: any) {
      setMessage(`Resend invite failed: ${error.message ?? 'Network or server error.'}`)
      setResendingInviteId(null)
    }
  }

  async function updateUserStatus(request: AccessRequest, isActive: boolean) {
    const action = isActive ? 'reactivate' : 'deactivate'
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${request.full_name || request.email}?`
    )

    if (!confirmed) return

    setUpdatingUserEmail(request.email)
    setMessage(isActive ? 'Reactivating user...' : 'Deactivating user...')

    try {
      const token = await getToken()

      if (!token) {
        setMessage('You must be signed in.')
        setUpdatingUserEmail(null)
        return
      }

      const res = await fetch('/api/update-user-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: request.email,
          isActive,
        }),
      })

      const result = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessage(result.error ?? 'User status update failed.')
        setUpdatingUserEmail(null)
        return
      }

      setMessage(result.message ?? (isActive ? 'User reactivated.' : 'User deactivated.'))
      setUpdatingUserEmail(null)
      await loadData()
    } catch (error: any) {
      setMessage(`User status update failed: ${error.message ?? 'Network or server error.'}`)
      setUpdatingUserEmail(null)
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
      await loadTrustedAnswers()
    } catch (error: any) {
      setMessage(error.message ?? 'Failed to save trusted answer.')
    }
  }

  function startEditTrustedAnswer(item: TrustedAnswer) {
    setEditingTrustedId(item.id)
    setTrustedEditQuestion(item.question)
    setTrustedEditAnswer(item.answer)
  }

  function cancelEditTrustedAnswer() {
    setEditingTrustedId(null)
    setTrustedEditQuestion('')
    setTrustedEditAnswer('')
  }

  async function updateTrustedAnswer(item: TrustedAnswer) {
    setMessage('Updating trusted answer...')

    const { error } = await supabase
      .from('trusted_answers')
      .update({
        question: trustedEditQuestion,
        answer: trustedEditAnswer,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (error) {
      setMessage(`Update failed: ${error.message}`)
      return
    }

    setMessage('Trusted answer updated.')
    cancelEditTrustedAnswer()
    await loadTrustedAnswers()
  }

  async function toggleTrustedAnswer(item: TrustedAnswer) {
    setMessage(item.is_active ? 'Deactivating trusted answer...' : 'Activating trusted answer...')

    const { error } = await supabase
      .from('trusted_answers')
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (error) {
      setMessage(`Status update failed: ${error.message}`)
      return
    }

    setMessage(item.is_active ? 'Trusted answer deactivated.' : 'Trusted answer activated.')
    await loadTrustedAnswers()
  }

  async function deleteTrustedAnswer(item: TrustedAnswer) {
    const confirmed = window.confirm(
      `Delete trusted answer for: "${item.question}"? This cannot be undone.`
    )

    if (!confirmed) return

    setMessage('Deleting trusted answer...')

    const { error } = await supabase
      .from('trusted_answers')
      .delete()
      .eq('id', item.id)

    if (error) {
      setMessage(`Delete failed: ${error.message}`)
      return
    }

    setMessage('Trusted answer deleted.')
    await loadTrustedAnswers()
  }

  async function updateIssueStatus(
    item: IssueReport,
    status: 'open' | 'reviewed' | 'resolved'
  ) {
    setUpdatingIssueId(item.id)
    setMessage(`Updating issue to ${status}...`)

    const { error } = await supabase
      .from('issue_reports')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (error) {
      setMessage(`Issue update failed: ${error.message}`)
      setUpdatingIssueId(null)
      return
    }

    setMessage(`Issue marked ${status}.`)
    setUpdatingIssueId(null)
    await loadIssueReports()
  }

  const filteredFeedback =
    feedbackFilter === 'all'
      ? feedback
      : feedback.filter((item) => item.feedback_type === feedbackFilter)

  const pendingRequests = accessRequests.filter((request) => request.status === 'pending')
  const approvedRequests = accessRequests.filter((request) => request.status === 'approved')

  const filteredInviteDirectory = accessRequests.filter((request) => {
    const search = userInviteSearch.trim().toLowerCase()

    const matchesSearch =
      !search ||
      request.full_name.toLowerCase().includes(search) ||
      request.email.toLowerCase().includes(search) ||
      (request.reason ?? '').toLowerCase().includes(search)

    const matchesStatus =
      userInviteStatusFilter === 'all' || request.status === userInviteStatusFilter

    return matchesSearch && matchesStatus
  })

  const openIssues = issueReports.filter((issue) => issue.status === 'open')
  const reviewedIssues = issueReports.filter((issue) => issue.status === 'reviewed')
  const resolvedIssues = issueReports.filter((issue) => issue.status === 'resolved')

  const problemFeedback = feedback.filter(
    (item) => item.feedback_type === 'not_helpful' || item.feedback_type === 'missing_source'
  )

  const topProblemQuestions = Object.values(
    problemFeedback.reduce(
      (
        acc: Record<string, { question: string; count: number; types: Set<string> }>,
        item
      ) => {
        const questionText = item.question || 'No question saved'
        const key = questionText.trim().toLowerCase()

        if (!acc[key]) {
          acc[key] = {
            question: questionText,
            count: 0,
            types: new Set<string>(),
          }
        }

        acc[key].count += 1
        acc[key].types.add(item.feedback_type.replaceAll('_', ' '))
        return acc
      },
      {}
    )
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const issueTypeCounts = Object.entries(
    issueReports.reduce((acc: Record<string, number>, item) => {
      acc[item.issue_type] = (acc[item.issue_type] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  const totalPages = documents.reduce((sum, doc) => sum + (doc.page_count ?? 0), 0)

  const filteredDocumentsForAdmin = documents.filter((doc) => {
    const search = documentSearch.trim().toLowerCase()
    const isProcessed = (doc.page_count ?? 0) > 0

    const matchesSearch =
      !search ||
      doc.title.toLowerCase().includes(search) ||
      doc.filename.toLowerCase().includes(search) ||
      (doc.category ?? '').toLowerCase().includes(search) ||
      (doc.version ?? '').toLowerCase().includes(search)

    const matchesStatus =
      documentStatusFilter === 'all' ||
      (documentStatusFilter === 'active' && doc.is_active) ||
      (documentStatusFilter === 'archived' && !doc.is_active) ||
      (documentStatusFilter === 'processed' && isProcessed) ||
      (documentStatusFilter === 'not_processed' && !isProcessed)

    return matchesSearch && matchesStatus
  })

  const documentHealthDocs = (() => {
    const sorted = [...documents].sort(
      (a, b) =>
        new Date(b.uploaded_at ?? 0).getTime() -
        new Date(a.uploaded_at ?? 0).getTime()
    )

    if (documentHealthView === 'not_processed') {
      return sorted.filter((doc) => !doc.page_count || doc.page_count === 0)
    }

    if (documentHealthView === 'zero_pages') {
      return sorted.filter((doc) => !doc.page_count || doc.page_count === 0)
    }

    return sorted.slice(0, 15)
  })()

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

  if (loading) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8 text-primary">
          Loading...
        </main>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8 text-primary">
          <h1 className="text-2xl font-bold text-primary">Access denied</h1>
          <p className="mt-2 text-secondary">You must be an admin to manage this app.</p>
        </main>
      </>
    )
  }

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 text-primary">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Admin: Manage PDF Agent</h1>
            <p className="mt-1 text-secondary">
              Upload, process, archive, delete, approve or decline access requests, and review tester feedback.
            </p>
          </div>

          {message && (
            <div className="rounded-xl border border-gray-300 bg-white p-3 text-sm text-primary shadow-sm">
              {message}
            </div>
          )}

          {approvedUserInfo && (
            <section className={`${cardClass} space-y-3`}>
              <h2 className="text-xl font-bold text-primary">Approved User Invitation</h2>
              <p className="text-sm text-secondary">
                The user has been approved and should receive an email invitation to set their password.
              </p>
              <div className="space-y-1 rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-primary">
                <p><strong>Email:</strong> {approvedUserInfo.email}</p>
                <p><strong>Status:</strong> {approvedUserInfo.message}</p>
              </div>
            </section>
          )}

          <div className="sticky top-[150px] z-40 rounded-2xl border border-gray-300 bg-white/95 p-2 shadow-sm backdrop-blur">
            <div className="flex gap-2 overflow-x-auto">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'access', label: `Access & Invites${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
                { key: 'documents', label: 'Documents' },
                { key: 'feedback', label: `Feedback & Issues${openIssues.length > 0 ? ` (${openIssues.length})` : ''}` },
                { key: 'trusted', label: 'Trusted Answers' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${
                    activeTab === tab.key
  ? 'bg-black !text-white'
  : 'border border-gray-300 bg-white text-primary hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'overview' && (
            <>
              <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                {[
                  ['Total documents', documentHealth.total, 'normal'],
                  ['Active', documentHealth.active, 'normal'],
                  ['Archived', documentHealth.archived, 'normal'],
                  ['Processed pages', totalPages, 'normal'],
                  ['Pending requests', pendingRequests.length, 'warning'],
                  ['Approved users', approvedRequests.length, 'success'],
                  ['Open issues', openIssues.length, 'danger'],
                ].map(([label, value, type]) => {
                  const hasValue = Number(value) > 0

                  return (
                    <div
                      key={label}
                      className={`rounded-xl border px-3 py-2 text-center shadow-sm ${
                        type === 'warning' && hasValue
                          ? 'border-yellow-300 bg-yellow-50'
                          : type === 'danger' && hasValue
                            ? 'border-red-300 bg-red-50'
                            : type === 'success' && hasValue
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-300 bg-white'
                      }`}
                    >
                      <p className="text-[11px] font-medium leading-tight text-secondary">
                        {label}
                      </p>
                      <p
                        className={`text-xl font-bold leading-tight ${
                          type === 'warning' && hasValue
                            ? 'text-yellow-800'
                            : type === 'danger' && hasValue
                              ? 'text-red-700'
                              : type === 'success' && hasValue
                                ? 'text-green-700'
                                : 'text-primary'
                        }`}
                      >
                        {value}
                      </p>
                    </div>
                  )
                })}
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <section className={`${cardClass} space-y-4`}>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">User Analytics</h2>
                    <p className="text-sm text-secondary">See how testers are using the app.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-gray-300 p-4">
                      <p className="text-sm text-secondary">Questions asked</p>
                      <p className="text-2xl font-bold text-primary">{userAnalytics.totalQuestions}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-300 p-4">
                      <p className="text-sm text-secondary">Unique users</p>
                      <p className="text-2xl font-bold text-primary">{userAnalytics.uniqueUsers}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-300 p-4">
                      <h3 className="font-bold text-primary">Answer modes</h3>
                      <div className="mt-3 space-y-2">
                        {Object.entries(userAnalytics.modeCounts).map(([mode, count]) => (
                          <div key={mode} className="flex justify-between text-sm text-primary">
                            <span>{mode}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-300 p-4">
                      <h3 className="font-bold text-primary">Categories</h3>
                      <div className="mt-3 space-y-2">
                        {Object.entries(userAnalytics.categoryCounts).map(([cat, count]) => (
                          <div key={cat} className="flex justify-between text-sm text-primary">
                            <span>{cat}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className={`${cardClass} space-y-4`}>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">Document Health</h2>
                    <p className="text-sm text-secondary">Overview of document processing and readiness.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-300 p-4">
                      <p className="text-xs font-medium text-muted">Not processed</p>
                      <p className="text-xl font-bold text-red-700">{documentHealth.notProcessed}</p>
                    </div>
                    <div className="rounded-lg border border-gray-300 p-4">
                      <p className="text-xs font-medium text-muted">Zero pages</p>
                      <p className="text-xl font-bold text-red-700">{documentHealth.zeroPages}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      ['recent', 'Recent uploads'],
                      ['not_processed', 'Not processed'],
                      ['zero_pages', 'Zero pages'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDocumentHealthView(key as any)}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                          documentHealthView === key
                            ? 'bg-black !text-white'
                            : 'border-gray-300 bg-white text-primary hover:bg-gray-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <h3 className="text-sm font-semibold text-primary">
                        {documentHealthView === 'recent'
                          ? 'Recent uploads'
                          : documentHealthView === 'not_processed'
                            ? 'Not processed documents'
                            : 'Zero-page documents'}
                      </h3>

                      <p className="text-xs font-medium text-muted">
                        Showing {documentHealthDocs.length} document
                        {documentHealthDocs.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    {documentHealthDocs.length === 0 ? (
                      <p className="rounded-lg border border-gray-300 p-3 text-sm text-muted">
                        No documents found for this view.
                      </p>
                    ) : (
                      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                        {documentHealthDocs.map((doc) => {
                          const isProcessed = (doc.page_count ?? 0) > 0

                          return (
                            <div key={doc.id} className="rounded-lg border border-gray-300 p-3">
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-primary">{doc.title || doc.filename}</p>
                                  <p className="text-xs text-muted">{doc.filename}</p>
                                  <p className="mt-1 text-xs text-muted">
                                    Pages: {doc.page_count || 0} • {isProcessed ? 'Processed' : 'Not processed'} •{' '}
                                    {doc.is_active ? 'Active' : 'Archived'}
                                  </p>
                                  <p className="text-xs text-muted">
                                    {doc.uploaded_at
                                      ? new Date(doc.uploaded_at).toLocaleString()
                                      : 'Unknown upload date'}
                                  </p>
                                </div>

                                {!isProcessed && (
                                  <button
                                    type="button"
                                    onClick={() => processDocument(doc.id)}
                                    disabled={processingId === doc.id || deletingId === doc.id}
                                    className={smallSecondaryButton}
                                  >
                                    {processingId === doc.id ? 'Processing...' : 'Process'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <p className="mt-3 text-xs text-muted">
                      Use the Uploaded documents search below to manage all documents.
                    </p>
                  </div>
                </section>
              </section>
            </>
          )}

          {activeTab === 'access' && (
            <section className={`${cardClass} space-y-6`}>
              <div>
                <h2 className="text-2xl font-bold text-primary">Access & Invites</h2>
                <p className="text-sm text-secondary">
                  Approve access requests, send direct invites, or resend setup links.
                </p>
              </div>

              <form onSubmit={sendDirectInvite} className={`${subCardClass} space-y-3`}>
                <div>
                  <h3 className="font-semibold text-primary">Send direct invite</h3>
                  <p className="text-sm text-secondary">
                    Use this when you want to invite someone without asking them to complete the request form first.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <div>
                    <label className={labelClass}>Full name</label>
                    <input
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value)
                        setInviteEmailWarning('')
                      }}
                      className={`${inputClass} ${inviteEmailWarning ? 'border-red-300 bg-red-50' : ''}`}
                      required
                    />
                    {inviteEmailWarning && (
                      <p className="mt-1 text-xs font-medium text-red-700">{inviteEmailWarning}</p>
                    )}
                  </div>

                  <button type="submit" disabled={sendingInvite} className={primaryButton}>
                    {sendingInvite ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </form>

              <div>
                <h3 className="font-semibold text-primary">Pending access requests</h3>

                {pendingRequests.length === 0 ? (
                  <p className="mt-2 text-sm text-secondary">No pending access requests.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-gray-300">
                    <table className="w-full text-sm text-primary">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-left">Name</th>
                          <th className="p-3 text-left">Email</th>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRequests.map((request) => (
                          <tr key={request.id} className="border-t border-gray-300">
                            <td className="p-3">{request.full_name}</td>
                            <td className="p-3">{request.email}</td>
                            <td className="p-3 text-xs text-muted">
                              {new Date(request.created_at).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => approveAccessRequest(request.id)}
                                  disabled={approvingId === request.id || decliningId === request.id}
                                  className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  {approvingId === request.id ? 'Approving...' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => declineRequest(request.id)}
                                  disabled={approvingId === request.id || decliningId === request.id}
                                  className={smallSecondaryButton}
                                >
                                  {decliningId === request.id ? 'Declining...' : 'Decline'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-semibold text-primary">Users & Invites Directory</h3>
                    <p className="text-sm text-secondary">
                      Search everyone who has requested access or been invited.
                    </p>
                  </div>

                  <div className="grid w-full gap-2 md:max-w-xl md:grid-cols-[1fr_170px]">
                    <input
                      value={userInviteSearch}
                      onChange={(e) => setUserInviteSearch(e.target.value)}
                      placeholder="Search name, email, or reason..."
                      className={inputClass}
                    />

                    <select
                      value={userInviteStatusFilter}
                      onChange={(e) =>
                        setUserInviteStatusFilter(
                          e.target.value as 'all' | 'pending' | 'approved' | 'declined'
                        )
                      }
                      className={inputClass}
                    >
                      <option value="all">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {[
                    ['Total records', accessRequests.length],
                    ['Pending', pendingRequests.length],
                    ['Approved', approvedRequests.length],
                    ['Showing', filteredInviteDirectory.length],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-gray-300 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-muted">{label}</p>
                      <p className="text-xl font-bold text-primary">{value}</p>
                    </div>
                  ))}
                </div>

                {accessRequests.length === 0 ? (
                  <p className="mt-2 text-sm text-secondary">No users or invites yet.</p>
                ) : filteredInviteDirectory.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-gray-300 p-3 text-sm text-secondary">
                    No users or invites match your search/filter.
                  </p>
                ) : (
                  <div className="mt-3 max-h-[420px] overflow-y-auto rounded-lg border border-gray-300">
                    <table className="w-full text-sm text-primary">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr>
                          <th className="p-3 text-left">Name</th>
                          <th className="p-3 text-left">Email</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-left">User</th>
                          <th className="p-3 text-left">Approved</th>
                          <th className="p-3 text-left">Last invited</th>
                          <th className="p-3 text-left">Last activity</th>
                          <th className="p-3 text-left">Invites</th>
                          <th className="p-3 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInviteDirectory.map((request) => (
                          <tr key={request.id} className="border-t border-gray-300 align-top">
                            <td className="p-3">
                              <p className="font-semibold text-primary">{request.full_name}</p>
                              {request.reason && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted">
                                  {request.reason}
                                </p>
                              )}
                            </td>
                            <td className="p-3 text-xs text-secondary">{request.email}</td>
                            <td className="p-3">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  request.status === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : request.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-secondary'
                                }`}
                              >
                                {request.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  request.profile_is_active === false
                                    ? 'bg-red-100 text-red-700'
                                    : request.profile_is_active === true
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-secondary'
                                }`}
                              >
                                {request.profile_is_active === false
                                  ? 'inactive'
                                  : request.profile_is_active === true
                                    ? request.profile_role || 'active'
                                    : 'no profile'}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-muted">
                              {request.approved_at
                                ? new Date(request.approved_at).toLocaleString()
                                : '—'}
                            </td>
                            <td className="p-3 text-xs text-muted">
                              {request.last_invited_at
                                ? new Date(request.last_invited_at).toLocaleString()
                                : 'Not tracked'}
                            </td>
                            <td className="p-3 text-xs text-muted">
                              {request.last_activity_at
                                ? new Date(request.last_activity_at).toLocaleString()
                                : 'No activity'}
                              {request.last_question && (
                                <p className="mt-1 line-clamp-2 max-w-[220px] text-secondary">
                                  {request.last_question}
                                </p>
                              )}
                            </td>
                            <td className="p-3 text-xs text-muted">
                              {request.invite_count ?? 0}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-2">
                                {request.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => approveAccessRequest(request.id)}
                                      disabled={approvingId === request.id || decliningId === request.id}
                                      className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                    >
                                      {approvingId === request.id ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => declineRequest(request.id)}
                                      disabled={approvingId === request.id || decliningId === request.id}
                                      className={smallSecondaryButton}
                                    >
                                      {decliningId === request.id ? 'Declining...' : 'Decline'}
                                    </button>
                                  </>
                                )}

                                {request.status === 'approved' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => resendInvite(request)}
                                      disabled={resendingInviteId === request.id}
                                      className={smallSecondaryButton}
                                    >
                                      {resendingInviteId === request.id ? 'Resending...' : 'Resend'}
                                    </button>

                                    {request.profile_is_active === false ? (
                                      <button
                                        type="button"
                                        onClick={() => updateUserStatus(request, true)}
                                        disabled={updatingUserEmail === request.email}
                                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                                      >
                                        {updatingUserEmail === request.email ? 'Updating...' : 'Reactivate'}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => updateUserStatus(request, false)}
                                        disabled={updatingUserEmail === request.email}
                                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                                      >
                                        {updatingUserEmail === request.email ? 'Updating...' : 'Deactivate'}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'feedback' && (
            <>
              <section className={`${cardClass} space-y-5`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">Feedback Insights</h2>
                    <p className="text-sm text-secondary">
                      Spot weak answers, missing sources, issue trends, and repeated content gaps.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <select
                      value={feedbackFilter}
                      onChange={(e) =>
                        setFeedbackFilter(
                          e.target.value as 'all' | 'helpful' | 'not_helpful' | 'missing_source'
                        )
                      }
                      className={inputClass}
                    >
                      <option value="all">All feedback</option>
                      <option value="helpful">Helpful</option>
                      <option value="not_helpful">Not helpful</option>
                      <option value="missing_source">Missing source</option>
                    </select>

                    <button type="button" onClick={exportFeedbackCSV} className={secondaryButton}>
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                  {[
                    ['Helpful', feedbackCounts.helpful, 'green'],
                    ['Not helpful', feedbackCounts.not_helpful, 'red'],
                    ['Missing source', feedbackCounts.missing_source, 'yellow'],
                    ['Open issues', openIssues.length, 'red'],
                    ['Reviewed', reviewedIssues.length, 'yellow'],
                    ['Resolved', resolvedIssues.length, 'green'],
                  ].map(([label, value, color]) => (
                    <div
                      key={label}
                      className={`rounded-xl border p-3 ${
                        color === 'green'
                          ? 'border-green-300 bg-green-50'
                          : color === 'red'
                            ? 'border-red-300 bg-red-50'
                            : 'border-yellow-300 bg-yellow-50'
                      }`}
                    >
                      <p className="text-xs font-medium text-secondary">{label}</p>
                      <p
                        className={`text-2xl font-bold ${
                          color === 'green'
                            ? 'text-green-700'
                            : color === 'red'
                              ? 'text-red-700'
                              : 'text-yellow-800'
                        }`}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className={subCardClass}>
                    <h3 className="font-semibold text-primary">Top problem questions</h3>
                    <p className="text-xs text-secondary">
                      Questions marked not helpful or missing source most often.
                    </p>

                    {topProblemQuestions.length === 0 ? (
                      <p className="mt-3 text-sm text-secondary">No problem questions yet.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {topProblemQuestions.map((item, index) => (
                          <div key={`${item.question}-${index}`} className="rounded-lg border border-gray-300 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="line-clamp-2 text-sm font-semibold text-primary">{item.question}</p>
                              <span className="shrink-0 rounded-full border border-gray-300 px-2 py-1 text-xs text-secondary">
                                {item.count}x
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              {Array.from(item.types).join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className={subCardClass}>
                    <h3 className="font-semibold text-primary">Most common issue types</h3>
                    <p className="text-xs text-secondary">
                      Issue report categories submitted by testers.
                    </p>

                    {issueTypeCounts.length === 0 ? (
                      <p className="mt-3 text-sm text-secondary">No issue types yet.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {issueTypeCounts.map(([issueType, count]) => (
                          <div key={issueType} className="flex items-center justify-between rounded-lg border border-gray-300 bg-white p-3 text-sm text-primary">
                            <span>{issueType}</span>
                            <span className="rounded-full border border-gray-300 px-2 py-1 text-xs text-secondary">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <section className={subCardClass}>
                  <h3 className="font-semibold text-primary">Recent feedback</h3>
                  <p className="text-xs text-secondary">Filtered list for quick review and export.</p>

                  {filteredFeedback.length === 0 ? (
                    <p className="mt-3 text-sm text-secondary">No feedback submitted yet.</p>
                  ) : (
                    <div className="mt-3 divide-y divide-gray-300 rounded-lg border border-gray-300 bg-white">
                      {filteredFeedback.map((item) => (
                        <div key={item.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-primary">
                              {item.question || 'No question saved'}
                            </p>
                            {item.answer && (
                              <p className="mt-1 line-clamp-2 text-xs text-muted">
                                {item.answer}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted">
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>
                          <span className="w-fit rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-secondary">
                            {item.feedback_type.replaceAll('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </section>

              <section className={`${cardClass} space-y-4`}>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">Issue Reports</h2>
                    <p className="text-sm text-secondary">
                      Review tester-reported problems, questions, and source concerns.
                    </p>
                  </div>

                  <span className="w-fit rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-semibold text-secondary">
                    {openIssues.length} open
                  </span>
                </div>

                {issueReports.length === 0 ? (
                  <p className="text-sm text-secondary">No issue reports submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {issueReports.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-300 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-primary">{item.issue_type}</p>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  item.status === 'open'
                                    ? 'bg-red-100 text-red-700'
                                    : item.status === 'reviewed'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-muted">
                              {item.user_email || 'Unknown user'} • {new Date(item.created_at).toLocaleString()}
                            </p>

                            {item.related_question && (
                              <p className="mt-3 text-sm text-primary">
                                <strong>Related question:</strong> {item.related_question}
                              </p>
                            )}

                            <p className="mt-2 whitespace-pre-wrap text-sm text-primary">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            {item.status !== 'reviewed' && (
                              <button
                                type="button"
                                onClick={() => updateIssueStatus(item, 'reviewed')}
                                disabled={updatingIssueId === item.id}
                                className={smallSecondaryButton}
                              >
                                Mark reviewed
                              </button>
                            )}

                            {item.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => updateIssueStatus(item, 'resolved')}
                                disabled={updatingIssueId === item.id}
                                className={smallSecondaryButton}
                              >
                                Mark resolved
                              </button>
                            )}

                            {item.status !== 'open' && (
                              <button
                                type="button"
                                onClick={() => updateIssueStatus(item, 'open')}
                                disabled={updatingIssueId === item.id}
                                className={smallSecondaryButton}
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={`${cardClass} space-y-4`}>
                <div>
                  <h2 className="text-2xl font-bold text-primary">Content Gaps</h2>
                  <p className="text-sm text-secondary">
                    Questions the agent could not answer and frequently requested topics.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className="font-semibold text-primary">Top repeated gaps</h3>
                    {contentGaps.length === 0 ? (
                      <p className="mt-2 text-sm text-secondary">No gaps yet.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {contentGaps.map((gap, index) => (
                          <div key={index} className="rounded-lg border border-gray-300 p-3">
                            <div className="flex justify-between gap-3">
                              <p className="text-sm font-semibold text-primary">{gap.question}</p>
                              <span className="text-xs text-muted">{gap.count}x</span>
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              Mode: {gap.answer_mode || 'general'}
                              {gap.category ? ` • Category: ${gap.category}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-primary">Latest not found</h3>
                    {noAnswerItems.length === 0 ? (
                      <p className="mt-2 text-sm text-secondary">No not-found questions yet.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {noAnswerItems.slice(0, 8).map((item) => (
                          <div key={item.id} className="rounded-lg border border-gray-300 p-3">
                            <p className="text-sm font-semibold text-primary">{item.question}</p>
                            <p className="mt-1 text-xs text-muted">
                              Mode: {item.answer_mode || 'general'}
                              {item.category ? ` • Category: ${item.category}` : ''}
                              {' • '}
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                            <button
                              type="button"
                              onClick={() => saveTrustedAnswer(item)}
                              className={`mt-2 ${smallSecondaryButton}`}
                            >
                              Save as trusted
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'documents' && (
            <>
              <section className={`${cardClass} space-y-4`}>
                <div>
                  <h2 className="text-2xl font-bold text-primary">Upload PDF</h2>
                  <p className="text-sm text-secondary">
                    Add active publications for the agent to search.
                  </p>
                </div>

                <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Example: Drying Fruits and Vegetables"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Category</label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Example: Food safety, Canning, Freezing"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Version</label>
                    <input
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="Example: 2026, v1, current"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>PDF file</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary"
                      required
                    />
                  </div>

                  <button type="submit" className={primaryButton}>
                    Upload PDF
                  </button>
                </form>
              </section>

              <section className={`${cardClass} space-y-4`}>
                <div>
                  <h2 className="text-2xl font-bold text-primary">Uploaded documents</h2>
                  <p className="text-sm text-secondary">
                    Processed documents are split into page-level files for better source citations.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <input
                    value={documentSearch}
                    onChange={(e) => setDocumentSearch(e.target.value)}
                    placeholder="Search title, filename, category, or version..."
                    className={inputClass}
                  />

                  <select
                    value={documentStatusFilter}
                    onChange={(e) =>
                      setDocumentStatusFilter(
                        e.target.value as 'all' | 'active' | 'archived' | 'processed' | 'not_processed'
                      )
                    }
                    className={inputClass}
                  >
                    <option value="all">All documents</option>
                    <option value="active">Active only</option>
                    <option value="archived">Archived only</option>
                    <option value="processed">Processed only</option>
                    <option value="not_processed">Not processed only</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 text-sm text-secondary md:flex-row md:items-center md:justify-between">
                  <p>
                    Showing <strong>{filteredDocumentsForAdmin.length}</strong> of{' '}
                    <strong>{documents.length}</strong> uploaded documents
                  </p>

                  {(documentSearch || documentStatusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentSearch('')
                        setDocumentStatusFilter('all')
                      }}
                      className={smallSecondaryButton}
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {filteredDocumentsForAdmin.length === 0 ? (
                  <p className="rounded-lg border border-gray-300 p-3 text-sm text-secondary">
                    No documents match your search/filter.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredDocumentsForAdmin.map((doc) => {
                      const isProcessed = (doc.page_count ?? 0) > 0

                      return (
                        <div key={doc.id} className="rounded-xl border border-gray-300 bg-white p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-semibold text-primary">{doc.title || doc.filename}</p>
                              <p className="mt-1 text-xs text-muted">{doc.filename}</p>
                              <p className="mt-1 text-xs text-muted">
                                Category: {doc.category || 'Uncategorized'} • Version: {doc.version || '—'}
                              </p>
                              <p className="mt-1 text-xs text-muted">
                                Pages: {doc.page_count || 0} • {isProcessed ? 'Processed' : 'Not processed'} •{' '}
                                {doc.is_active ? 'Active' : 'Archived'}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {!isProcessed && (
                                <button
                                  type="button"
                                  onClick={() => processDocument(doc.id)}
                                  disabled={processingId === doc.id || deletingId === doc.id}
                                  className={smallSecondaryButton}
                                >
                                  {processingId === doc.id ? 'Processing...' : 'Process'}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => updateDocumentStatus(doc.id, !doc.is_active)}
                                disabled={updatingId === doc.id || deletingId === doc.id}
                                className={smallSecondaryButton}
                              >
                                {updatingId === doc.id
                                  ? 'Updating...'
                                  : doc.is_active
                                    ? 'Archive'
                                    : 'Unarchive'}
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteDocument(doc.id, doc.title || doc.filename)}
                                disabled={deletingId === doc.id}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
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
            </>
          )}

          {activeTab === 'trusted' && (
            <section className={`${cardClass} space-y-4`}>
              <div>
                <h2 className="text-2xl font-bold text-primary">Trusted Answers</h2>
                <p className="text-sm text-secondary">
                  Manage administrator-approved answers reused by chat before calling AI search.
                </p>
              </div>

              {trustedAnswers.length === 0 ? (
                <p className="text-sm text-secondary">No trusted answers saved yet.</p>
              ) : (
                <div className="space-y-3">
                  {trustedAnswers.map((item) => (
                    <div key={item.id} className="space-y-3 rounded-lg border border-gray-300 p-4">
                      {editingTrustedId === item.id ? (
                        <>
                          <div>
                            <label className={labelClass}>Trusted question</label>
                            <input
                              value={trustedEditQuestion}
                              onChange={(e) => setTrustedEditQuestion(e.target.value)}
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Trusted answer</label>
                            <textarea
                              value={trustedEditAnswer}
                              onChange={(e) => setTrustedEditAnswer(e.target.value)}
                              className="min-h-[160px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary"
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => updateTrustedAnswer(item)}
                              className={primaryButton}
                            >
                              Save changes
                            </button>

                            <button
                              type="button"
                              onClick={cancelEditTrustedAnswer}
                              className={secondaryButton}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-semibold text-primary">{item.question}</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">
                                {item.answer}
                              </p>
                              <p className="mt-2 text-xs text-muted">
                                Mode: {item.answer_mode || 'general'}
                                {item.category ? ` • Category: ${item.category}` : ''}
                                {' • '}
                                {new Date(item.created_at).toLocaleString()}
                              </p>
                            </div>

                            <span
                              className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                                item.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-secondary'
                              }`}
                            >
                              {item.is_active ? 'active' : 'inactive'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 border-t border-gray-300 pt-3">
                            <button
                              type="button"
                              onClick={() => startEditTrustedAnswer(item)}
                              className={smallSecondaryButton}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleTrustedAnswer(item)}
                              className={smallSecondaryButton}
                            >
                              {item.is_active ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteTrustedAnswer(item)}
                              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </>
  )
}