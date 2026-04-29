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
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [userInviteSearch, setUserInviteSearch] = useState('')
  const [userInviteStatusFilter, setUserInviteStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'declined'
  >('all')

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
    const zeroPages = notProcessed

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
      zeroPages,
      recent,
    })
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
          email: inviteEmail,
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
        body: JSON.stringify({
          requestId: request.id,
        }),
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
      `Delete trusted answer for: \"${item.question}\"? This cannot be undone.`
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

  async function updateIssueStatus(item: IssueReport, status: 'open' | 'reviewed' | 'resolved') {
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
  const filteredApprovedRequests = approvedRequests.filter((request) => {
    const search = userInviteSearch.trim().toLowerCase()

    if (!search) return true

    return (
      request.full_name.toLowerCase().includes(search) ||
      request.email.toLowerCase().includes(search)
    )
  })

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
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
          Loading...
        </main>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p>You must be an admin to manage this app.</p>
        </main>
      </>
    )
  }

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Admin: Manage PDF Agent</h1>
            <p className="text-gray-600">
              Upload, process, archive, delete, approve or decline access requests, and review tester feedback.
            </p>
          </div>

          {message && (
            <div className="rounded-xl border bg-white p-3 text-sm shadow-sm">
              {message}
            </div>
          )}

          {approvedUserInfo && (
            <section className="rounded-2xl border bg-white p-5 space-y-3 shadow-sm">
              <h2 className="text-xl font-bold">Approved User Invitation</h2>
              <p className="text-sm text-gray-600">
                The user has been approved and should receive an email invitation to set their password.
              </p>
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <p><strong>Email:</strong> {approvedUserInfo.email}</p>
                <p><strong>Status:</strong> {approvedUserInfo.message}</p>
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {[
              ['Total documents', documentHealth.total],
              ['Active', documentHealth.active],
              ['Archived', documentHealth.archived],
              ['Processed pages', totalPages],
              ['Pending requests', pendingRequests.length],
              ['Open issues', openIssues.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-600">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border bg-white p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold">Access & Invites</h2>
              <p className="text-sm text-gray-600">
                Approve access requests, send direct invites, or resend setup links.
              </p>
            </div>

            <form onSubmit={sendDirectInvite} className="rounded-2xl border bg-gray-50 p-4 space-y-3">
              <div>
                <h3 className="font-semibold">Send direct invite</h3>
                <p className="text-sm text-gray-600">
                  Use this when you want to invite someone without asking them to complete the request form first.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div>
                  <label className="mb-1 block text-sm font-medium">Full name</label>
                  <input
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {sendingInvite ? 'Sending...' : 'Send invite'}
                </button>
              </div>
            </form>

            <div>
              <h3 className="font-semibold">Pending access requests</h3>

              {pendingRequests.length === 0 ? (
                <p className="mt-2 text-sm text-gray-600">No pending access requests.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
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
                        <tr key={request.id} className="border-t">
                          <td className="p-3">{request.full_name}</td>
                          <td className="p-3">{request.email}</td>
                          <td className="p-3 text-xs">
                            {new Date(request.created_at).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => approveAccessRequest(request.id)}
                                disabled={approvingId === request.id || decliningId === request.id}
                                className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                              >
                                {approvingId === request.id ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                onClick={() => declineRequest(request.id)}
                                disabled={approvingId === request.id || decliningId === request.id}
                                className="rounded border px-3 py-1 text-xs disabled:opacity-50"
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
                  <h3 className="font-semibold">Users & Invites Directory</h3>
                  <p className="text-sm text-gray-600">
                    Search everyone who has requested access or been invited. Review status, invite history, and resend setup instructions.
                  </p>
                </div>

                <div className="grid w-full gap-2 md:max-w-xl md:grid-cols-[1fr_170px]">
                  <input
                    value={userInviteSearch}
                    onChange={(e) => setUserInviteSearch(e.target.value)}
                    placeholder="Search name, email, or reason..."
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />

                  <select
                    value={userInviteStatusFilter}
                    onChange={(e) =>
                      setUserInviteStatusFilter(
                        e.target.value as 'all' | 'pending' | 'approved' | 'declined'
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Total records</p>
                  <p className="text-xl font-bold">{accessRequests.length}</p>
                </div>
                <div className="rounded-xl border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-xl font-bold">{pendingRequests.length}</p>
                </div>
                <div className="rounded-xl border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Approved</p>
                  <p className="text-xl font-bold">{approvedRequests.length}</p>
                </div>
                <div className="rounded-xl border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Showing</p>
                  <p className="text-xl font-bold">{filteredInviteDirectory.length}</p>
                </div>
              </div>

              {accessRequests.length === 0 ? (
                <p className="mt-2 text-sm text-gray-600">No users or invites yet.</p>
              ) : filteredInviteDirectory.length === 0 ? (
                <p className="mt-3 rounded-lg border p-3 text-sm text-gray-600">
                  No users or invites match your search/filter.
                </p>
              ) : (
                <div className="mt-3 max-h-[420px] overflow-y-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Approved</th>
                        <th className="p-3 text-left">Last invited</th>
                        <th className="p-3 text-left">Invites</th>
                        <th className="p-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInviteDirectory.map((request) => (
                        <tr key={request.id} className="border-t align-top">
                          <td className="p-3">
                            <p className="font-medium">{request.full_name}</p>
                            {request.reason && (
                              <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                {request.reason}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-xs text-gray-600">{request.email}</td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                request.status === 'approved'
                                  ? 'bg-green-100 text-green-700'
                                  : request.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {request.status}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-gray-500">
                            {request.approved_at
                              ? new Date(request.approved_at).toLocaleString()
                              : '—'}
                          </td>
                          <td className="p-3 text-xs text-gray-500">
                            {request.last_invited_at
                              ? new Date(request.last_invited_at).toLocaleString()
                              : 'Not tracked'}
                          </td>
                          <td className="p-3 text-xs text-gray-500">
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
                                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                                  >
                                    {approvingId === request.id ? 'Approving...' : 'Approve'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => declineRequest(request.id)}
                                    disabled={approvingId === request.id || decliningId === request.id}
                                    className="rounded border px-3 py-1 text-xs disabled:opacity-50"
                                  >
                                    {decliningId === request.id ? 'Declining...' : 'Decline'}
                                  </button>
                                </>
                              )}

                              {request.status === 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => resendInvite(request)}
                                  disabled={resendingInviteId === request.id}
                                  className="rounded-lg border px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                                >
                                  {resendingInviteId === request.id ? 'Resending...' : 'Resend'}
                                </button>
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

          <section className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Feedback Dashboard</h2>
                <p className="text-sm text-gray-600">
                  Review tester feedback to identify helpful answers, weak answers, and source issues.
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
              <div className="rounded-lg border divide-y">
                {filteredFeedback.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 p-3">
                    <div>
                      <p className="text-sm font-medium">
                        {item.question || 'No question saved'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                      {item.feedback_type.replaceAll('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Issue Reports</h2>
                <p className="text-sm text-gray-600">
                  Review tester-reported problems, questions, and source concerns.
                </p>
              </div>

              <span className="w-fit rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-600">
                {openIssues.length} open
              </span>
            </div>

            {issueReports.length === 0 ? (
              <p className="text-sm text-gray-600">No issue reports submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {issueReports.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{item.issue_type}</p>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
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

                        <p className="mt-1 text-xs text-gray-500">
                          {item.user_email || 'Unknown user'} •{' '}
                          {new Date(item.created_at).toLocaleString()}
                        </p>

                        {item.related_question && (
                          <p className="mt-3 text-sm">
                            <strong>Related question:</strong> {item.related_question}
                          </p>
                        )}

                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {item.status !== 'reviewed' && (
                          <button
                            type="button"
                            onClick={() => updateIssueStatus(item, 'reviewed')}
                            disabled={updatingIssueId === item.id}
                            className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-50"
                          >
                            Mark reviewed
                          </button>
                        )}

                        {item.status !== 'resolved' && (
                          <button
                            type="button"
                            onClick={() => updateIssueStatus(item, 'resolved')}
                            disabled={updatingIssueId === item.id}
                            className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-50"
                          >
                            Mark resolved
                          </button>
                        )}

                        {item.status !== 'open' && (
                          <button
                            type="button"
                            onClick={() => updateIssueStatus(item, 'open')}
                            disabled={updatingIssueId === item.id}
                            className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-50"
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

          <section className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold">Content Gaps</h2>
              <p className="text-sm text-gray-600">
                Questions the agent could not answer and frequently requested topics.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="font-semibold">Top repeated gaps</h3>
                {contentGaps.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-600">No gaps yet.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {contentGaps.map((gap, index) => (
                      <div key={index} className="rounded-lg border p-3">
                        <div className="flex justify-between gap-3">
                          <p className="text-sm font-semibold">{gap.question}</p>
                          <span className="text-xs text-gray-500">{gap.count}x</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Mode: {gap.answer_mode || 'general'}
                          {gap.category ? ` • Category: ${gap.category}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold">Latest not found</h3>
                {noAnswerItems.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-600">No not-found questions yet.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {noAnswerItems.slice(0, 8).map((item) => (
                      <div key={item.id} className="rounded-lg border p-3">
                        <p className="text-sm font-semibold">{item.question}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Mode: {item.answer_mode || 'general'}
                          {item.category ? ` • Category: ${item.category}` : ''}
                          {' • '}
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                        <button
                          type="button"
                          onClick={() => saveTrustedAnswer(item)}
                          className="mt-2 rounded-lg border px-3 py-1 text-xs hover:bg-gray-50"
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

          <section className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold">User Analytics</h2>
                <p className="text-sm text-gray-600">
                  See how testers are using the app.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border p-4">
                  <p className="text-sm text-gray-600">Questions asked</p>
                  <p className="text-2xl font-bold">{userAnalytics.totalQuestions}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm text-gray-600">Unique users</p>
                  <p className="text-2xl font-bold">{userAnalytics.uniqueUsers}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <h3 className="font-bold">Answer modes</h3>
                  <div className="mt-3 space-y-2">
                    {Object.entries(userAnalytics.modeCounts).map(([mode, count]) => (
                      <div key={mode} className="flex justify-between text-sm">
                        <span>{mode}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <h3 className="font-bold">Categories</h3>
                  <div className="mt-3 space-y-2">
                    {Object.entries(userAnalytics.categoryCounts).map(([cat, count]) => (
                      <div key={cat} className="flex justify-between text-sm">
                        <span>{cat}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold">Document Health</h2>
                <p className="text-sm text-gray-600">
                  Overview of document processing and readiness.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-gray-500">Not processed</p>
                  <p className="text-xl font-bold text-red-600">
                    {documentHealth.notProcessed}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-gray-500">Zero pages</p>
                  <p className="text-xl font-bold text-red-600">
                    {documentHealth.zeroPages}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDocumentHealthView('recent')}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    documentHealthView === 'recent'
                      ? 'bg-black text-white'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  Recent uploads
                </button>

                <button
                  type="button"
                  onClick={() => setDocumentHealthView('not_processed')}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    documentHealthView === 'not_processed'
                      ? 'bg-black text-white'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  Not processed
                </button>

                <button
                  type="button"
                  onClick={() => setDocumentHealthView('zero_pages')}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    documentHealthView === 'zero_pages'
                      ? 'bg-black text-white'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  Zero pages
                </button>
              </div>

              <div>
                <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-sm font-semibold">
                    {documentHealthView === 'recent'
                      ? 'Recent uploads'
                      : documentHealthView === 'not_processed'
                        ? 'Not processed documents'
                        : 'Zero-page documents'}
                  </h3>

                  <p className="text-xs text-gray-500">
                    Showing {documentHealthDocs.length} document
                    {documentHealthDocs.length === 1 ? '' : 's'}
                  </p>
                </div>

                {documentHealthDocs.length === 0 ? (
                  <p className="rounded-lg border p-3 text-sm text-gray-500">
                    No documents found for this view.
                  </p>
                ) : (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {documentHealthDocs.map((doc) => {
                      const isProcessed = (doc.page_count ?? 0) > 0

                      return (
                        <div key={doc.id} className="rounded-lg border p-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-medium">{doc.title || doc.filename}</p>
                              <p className="text-xs text-gray-500">{doc.filename}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                Pages: {doc.page_count || 0} •{' '}
                                {isProcessed ? 'Processed' : 'Not processed'} •{' '}
                                {doc.is_active ? 'Active' : 'Archived'}
                              </p>
                              <p className="text-xs text-gray-500">
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
                                className="w-fit rounded-lg border px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-50"
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

                <p className="mt-3 text-xs text-gray-500">
                  Use the Uploaded documents search below to manage all documents.
                </p>
              </div>
            </section>
          </section>

          <section className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold">Trusted Answers</h2>
              <p className="text-sm text-gray-600">
                Manage administrator-approved answers reused by chat before calling AI search.
              </p>
            </div>

            {trustedAnswers.length === 0 ? (
              <p className="text-sm text-gray-600">No trusted answers saved yet.</p>
            ) : (
              <div className="space-y-3">
                {trustedAnswers.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4 space-y-3">
                    {editingTrustedId === item.id ? (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Trusted question
                          </label>
                          <input
                            value={trustedEditQuestion}
                            onChange={(e) => setTrustedEditQuestion(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Trusted answer
                          </label>
                          <textarea
                            value={trustedEditAnswer}
                            onChange={(e) => setTrustedEditAnswer(e.target.value)}
                            className="min-h-[160px] w-full rounded-lg border px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateTrustedAnswer(item)}
                            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            Save changes
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditTrustedAnswer}
                            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-sm">{item.question}</p>
                              <span
                                className={`rounded px-2 py-1 text-xs ${
                                  item.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {item.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-gray-500">
                              Mode: {item.answer_mode || 'general'}
                              {item.category ? ` • Category: ${item.category}` : ''}
                              {' • '}
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleTrustedAnswer(item)}
                              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              {item.is_active ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => startEditTrustedAnswer(item)}
                              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteTrustedAnswer(item)}
                              className="rounded-lg border px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <p className="line-clamp-3 text-sm text-gray-600">
                          {item.answer}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <form onSubmit={handleUpload} className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="text-xl font-bold mb-1">Upload a PDF</h2>
                <p className="text-sm text-gray-600">
                  Upload first, then process it for page-aware AI search.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Document title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Category</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Example: Food safety, Canning, Freezing"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Version</label>
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="Example: 2026, v1, current"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">PDF file</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full"
                  required
                />
              </div>

              <button type="submit" className="rounded-lg bg-black px-4 py-2 text-white">
                Upload PDF
              </button>
            </form>

            <section className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold">Uploaded documents</h2>
                <p className="text-sm text-gray-600">
                  Processed documents are split into page-level files for better source citations.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <input
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                  placeholder="Search title, filename, category, or version..."
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />

                <select
                  value={documentStatusFilter}
                  onChange={(e) =>
                    setDocumentStatusFilter(
                      e.target.value as 'all' | 'active' | 'archived' | 'processed' | 'not_processed'
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="all">All documents</option>
                  <option value="active">Active only</option>
                  <option value="archived">Archived only</option>
                  <option value="processed">Processed only</option>
                  <option value="not_processed">Not processed only</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
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
                    className="w-fit rounded-lg border px-3 py-1 text-xs hover:bg-gray-50"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {documents.length === 0 ? (
                <p>No documents uploaded yet.</p>
              ) : filteredDocumentsForAdmin.length === 0 ? (
                <p className="rounded-lg border p-4 text-sm text-gray-600">
                  No documents match your current search or filter.
                </p>
              ) : (
                <div className="max-h-[650px] space-y-3 overflow-y-auto pr-1">
                  {filteredDocumentsForAdmin.map((doc) => {
                    const isProcessed = (doc.page_count ?? 0) > 0
                    const uploadedDate = doc.uploaded_at
                      ? new Date(doc.uploaded_at).toLocaleString()
                      : 'Unknown'

                    return (
                      <div
                        key={doc.id}
                        className={`rounded-2xl border p-4 ${doc.is_active ? '' : 'opacity-60'}`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div>
                              <p className="font-semibold">{doc.title}</p>
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

                            <p className="text-xs text-gray-500">
                              Category: {doc.category || 'None'} • Version: {doc.version || 'None'} • Uploaded: {uploadedDate}
                            </p>
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
                                  : 'Process'}
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
          </section>
        </div>
      </main>
    </>
  )
}
