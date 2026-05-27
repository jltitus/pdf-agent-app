'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'

type DocumentRow = {
  id: string
  title: string
  filename: string
  category: string | null
  version: string | null
  publication_date: string | null
  document_notes: string | null
  approval_status: string | null
  is_active: boolean
  storage_path: string | null
  uploaded_at: string | null
  page_count?: number
  processing_status: string | null
  processing_progress: number | null
  processing_error: string | null
  processing_attempts: number | null
  processing_locked_until: string | null
  file_size_bytes: number | null
}

type EditFormState = {
  title: string
  category: string
  version: string
  publicationDate: string
  documentNotes: string
  approvalStatus: string
}

type ReplaceFormState = {
  documentId: string | null
  title: string
  category: string
  version: string
  publicationDate: string
  documentNotes: string
  approvalStatus: string
  file: File | null
}

const primaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-xl bg-[#d73f09] px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#b23408] disabled:bg-[#e8a08a] disabled:cursor-not-allowed'
const secondaryButton =
  'inline-flex min-h-9 items-center justify-center rounded-xl border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm hover:bg-[#f3f0ed] disabled:opacity-60'
const inputClass =
  'w-full min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary shadow-sm'
const labelClass = 'mb-1 block text-sm font-semibold text-primary'
const cardClass =
  'rounded-3xl border border-[#d8d1c7] bg-white p-4 shadow-sm sm:p-6'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function isProcessing(doc: DocumentRow) {
  const status = doc.processing_status
  const locked = doc.processing_locked_until ? new Date(doc.processing_locked_until).getTime() > Date.now() : false
  return (status === 'processing' || status === 'validating') && locked
}

function processingBadge(doc: DocumentRow) {
  const processed = (doc.page_count ?? 0) > 0
  if (isProcessing(doc)) return { label: 'Processing…', cls: 'bg-yellow-100 text-yellow-800' }
  if (doc.processing_status === 'failed') return { label: 'Failed', cls: 'bg-red-100 text-red-700' }
  if (doc.processing_status === 'encrypted') return { label: 'Encrypted', cls: 'bg-red-100 text-red-700' }
  if (doc.processing_status === 'invalid_pdf') return { label: 'Invalid PDF', cls: 'bg-red-100 text-red-700' }
  if (processed) return { label: 'Processed', cls: 'bg-green-100 text-green-700' }
  return { label: 'Not processed', cls: 'bg-gray-100 text-secondary' }
}

const CATEGORIES = [
  'Canning', 'Drying', 'Freezing', 'Fermentation', 'Jam & Jelly',
  'Pickling', 'Safety', 'Storage',
]

export default function AdminDocumentsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'processed' | 'not_processed'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>({ title: '', category: '', version: '', publicationDate: '', documentNotes: '', approvalStatus: 'active' })
  const [savingMetadataId, setSavingMetadataId] = useState<string | null>(null)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [replaceForm, setReplaceForm] = useState<ReplaceFormState>({ documentId: null, title: '', category: '', version: '', publicationDate: '', documentNotes: '', approvalStatus: 'active', file: null })
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActioning, setBulkActioning] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing'>('idle')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadVersion, setUploadVersion] = useState('')
  const [uploadDate, setUploadDate] = useState('')
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase
        .from('profiles').select('role, is_active').eq('id', data.session.user.id).single()
      if (profile?.role === 'admin' && profile?.is_active) {
        setIsAdmin(true)
        await loadDocuments()
      }
      setLoading(false)
    }
    init()
  }, [])

  // Poll while any document is processing
  useEffect(() => {
    const inProgress = documents.some((d) =>
      d.processing_status === 'pending' || d.processing_status === 'validating' || d.processing_status === 'processing'
    )
    if (!inProgress) return
    const interval = setInterval(loadDocuments, 5000)
    return () => clearInterval(interval)
  }, [documents])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function loadDocuments() {
    const { data: docs } = await supabase.from('documents').select('*').order('uploaded_at', { ascending: false })
    if (!docs) { setDocuments([]); return }
    const { data: pages } = await supabase.from('document_pages').select('document_id')
    const pageCounts: Record<string, number> = {}
    for (const page of pages ?? []) pageCounts[String(page.document_id)] = (pageCounts[String(page.document_id)] ?? 0) + 1
    setDocuments(docs.map((doc) => ({ ...doc, page_count: pageCounts[String(doc.id)] ?? 0 })) as DocumentRow[])
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile) { setMessage('Please choose a PDF file.'); return }
    if (uploadFile.type !== 'application/pdf') { setMessage('Only PDF files are allowed.'); return }
    setUploadStatus('uploading')
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMessage('You must be signed in.'); setUploadStatus('idle'); return }
    const safeFileName = uploadFile.name.replaceAll(' ', '-')
    const storagePath = `${user.id}/${Date.now()}-${safeFileName}`
    const { error: uploadError } = await supabase.storage.from('pdfs').upload(storagePath, uploadFile)
    if (uploadError) { setMessage(`Upload failed: ${uploadError.message}`); setUploadStatus('idle'); return }
    const { data: insertedDoc, error: insertError } = await supabase
      .from('documents')
      .insert({
        title: uploadTitle,
        filename: uploadFile.name,
        category: uploadCategory || null,
        version: uploadVersion || null,
        publication_date: uploadDate || null,
        document_notes: uploadNotes || null,
        is_active: true,
        storage_path: storagePath,
        uploaded_by: user.id,
      })
      .select('id')
      .single()
    if (insertError || !insertedDoc) { setMessage(`Document record failed: ${insertError?.message}`); setUploadStatus('idle'); return }
    setUploadTitle(''); setUploadCategory(''); setUploadVersion(''); setUploadDate(''); setUploadNotes(''); setUploadFile(null)
    setShowUploadForm(false)
    setUploadStatus('processing')
    await loadDocuments()
    await processDocument(insertedDoc.id)
    setUploadStatus('idle')
  }

  async function processDocument(documentId: string) {
    setProcessingId(documentId)
    setMessage('Processing started — watch progress in the document list below.')
    const token = await getToken()
    if (!token) { setMessage('You must be signed in.'); setProcessingId(null); return }
    try {
      const res = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentId }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) { setMessage(`Processing failed: ${result.error ?? 'Unknown error'}`); setProcessingId(null); return }
      setMessage(result.pages_processed ? `Processed successfully. Pages: ${result.pages_processed}.` : 'Processed successfully.')
      setProcessingId(null)
      await loadDocuments()
      fetch('/api/send-push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New publication added', body: 'A new publication is now available.', url: '/publications' }),
      }).catch(() => {})
    } catch (error: any) {
      setMessage(`Processing failed: ${error.message ?? 'Network error.'}`)
      setProcessingId(null)
    }
  }

  async function saveDocumentMetadata(documentId: string) {
    setSavingMetadataId(documentId)
    const token = await getToken()
    if (!token) { setSavingMetadataId(null); return }
    const res = await fetch('/api/update-document-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        documentId,
        title: editForm.title,
        category: editForm.category,
        version: editForm.version,
        publicationDate: editForm.publicationDate,
        documentNotes: editForm.documentNotes,
        approvalStatus: editForm.approvalStatus,
      }),
    })
    const result = await res.json().catch(() => ({}))
    setMessage(res.ok ? 'Document details updated.' : (result.error ?? 'Update failed.'))
    setSavingMetadataId(null)
    if (res.ok) { setEditingDocId(null); await loadDocuments() }
  }

  async function replaceDocument() {
    if (!replaceForm.documentId || !replaceForm.file) { setMessage('Choose a replacement PDF.'); return }
    if (replaceForm.file.type !== 'application/pdf') { setMessage('Only PDF files are allowed.'); return }
    if (!confirm('Replace this document? The old file will be archived and the new version processed for search.')) return
    setReplacingId(replaceForm.documentId)
    setMessage('Replacing…')
    const token = await getToken()
    if (!token) { setReplacingId(null); return }
    const formData = new FormData()
    formData.append('oldDocumentId', replaceForm.documentId)
    formData.append('title', replaceForm.title)
    formData.append('category', replaceForm.category)
    formData.append('version', replaceForm.version)
    formData.append('publicationDate', replaceForm.publicationDate)
    formData.append('documentNotes', replaceForm.documentNotes)
    formData.append('approvalStatus', replaceForm.approvalStatus)
    formData.append('file', replaceForm.file)
    const replaceRes = await fetch('/api/replace-document', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
    const replaceResult = await replaceRes.json().catch(() => ({}))
    if (!replaceRes.ok || !replaceResult.newDocumentId) { setMessage(replaceResult.error ?? 'Replacement failed.'); setReplacingId(null); return }
    const processRes = await fetch('/api/process-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ documentId: replaceResult.newDocumentId }),
    })
    const processResult = await processRes.json().catch(() => ({}))
    setMessage(processRes.ok ? (processResult.pages_processed ? `Replaced and processed. Pages: ${processResult.pages_processed}.` : 'Replaced and processed.') : `Replacement uploaded but processing failed: ${processResult.error ?? 'Unknown error.'}`)
    setReplacingId(null)
    setReplaceForm({ documentId: null, title: '', category: '', version: '', publicationDate: '', documentNotes: '', approvalStatus: 'active', file: null })
    await loadDocuments()
  }

  async function updateStatus(documentId: string, isActive: boolean) {
    setUpdatingId(documentId)
    setMessage(isActive ? 'Unarchiving…' : 'Archiving…')
    const token = await getToken()
    if (!token) { setUpdatingId(null); return }
    const res = await fetch('/api/update-document-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ documentId, isActive }),
    })
    const result = await res.json().catch(() => ({}))
    setMessage(res.ok ? (isActive ? 'Document unarchived.' : 'Document archived.') : (result.error ?? 'Status update failed.'))
    setUpdatingId(null)
    await loadDocuments()
  }

  async function deleteDocument(doc: DocumentRow) {
    if (!confirm(`Delete "${doc.title}"? This removes the PDF, page chunks, OpenAI files, and document record. Cannot be undone.`)) return
    setDeletingId(doc.id)
    setMessage('Deleting…')
    const token = await getToken()
    if (!token) { setDeletingId(null); return }
    const res = await fetch('/api/delete-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ documentId: doc.id }),
    })
    const result = await res.json().catch(() => ({}))
    setMessage(res.ok ? 'Document deleted.' : (result.error ?? 'Delete failed.'))
    setDeletingId(null)
    await loadDocuments()
  }

  async function bulkSetStatus(ids: string[], isActive: boolean) {
    setBulkActioning(true)
    setMessage(`${isActive ? 'Unarchiving' : 'Archiving'} ${ids.length} document(s)…`)
    const token = await getToken()
    if (!token) { setBulkActioning(false); return }
    for (const documentId of ids) {
      await fetch('/api/update-document-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentId, isActive }),
      })
    }
    setSelectedIds(new Set())
    setBulkActioning(false)
    setMessage(`${ids.length} document(s) ${isActive ? 'unarchived' : 'archived'}.`)
    await loadDocuments()
  }

  async function bulkReprocess(ids: string[]) {
    setBulkActioning(true)
    setMessage(`Reprocessing ${ids.length} document(s)…`)
    for (const documentId of ids) await processDocument(documentId)
    setSelectedIds(new Set())
    setBulkActioning(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((d) => d.id)))
    }
  }

  const filtered = documents.filter((doc) => {
    const s = search.trim().toLowerCase()
    const isProcessed = (doc.page_count ?? 0) > 0
    const matchesSearch =
      !s ||
      doc.title.toLowerCase().includes(s) ||
      doc.filename.toLowerCase().includes(s) ||
      (doc.category ?? '').toLowerCase().includes(s) ||
      (doc.version ?? '').toLowerCase().includes(s)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && doc.is_active) ||
      (statusFilter === 'archived' && !doc.is_active) ||
      (statusFilter === 'processed' && isProcessed) ||
      (statusFilter === 'not_processed' && !isProcessed)
    return matchesSearch && matchesStatus
  })

  const totalActive = documents.filter((d) => d.is_active).length
  const totalProcessed = documents.filter((d) => (d.page_count ?? 0) > 0).length
  const totalPages = documents.reduce((sum, d) => sum + (d.page_count ?? 0), 0)
  const totalNotProcessed = documents.filter((d) => d.is_active && (d.page_count ?? 0) === 0).length

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] px-4 py-10">
        <p className="text-center text-secondary">Loading…</p>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] px-4 py-10">
        <p className="text-center text-red-700 font-semibold">Admin access required.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#d73f09]">Admin</p>
            <h1 className="text-2xl font-bold text-primary">Documents</h1>
            <p className="mt-1 text-sm text-secondary">{documents.length} total · {totalActive} active</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin" className={secondaryButton}>← Dashboard</a>
            <button type="button" onClick={() => setShowUploadForm(!showUploadForm)} className={primaryButton}>
              {showUploadForm ? 'Cancel upload' : '+ Upload PDF'}
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm font-medium text-primary shadow-sm">
            {message}
          </div>
        )}

        {/* Health metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Active', value: totalActive, color: 'text-green-700' },
            { label: 'Processed', value: totalProcessed, color: 'text-[#d73f09]' },
            { label: 'Total pages', value: totalPages, color: 'text-primary' },
            { label: 'Needs processing', value: totalNotProcessed, color: totalNotProcessed > 0 ? 'text-red-700' : 'text-secondary' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#d8d1c7] bg-white p-4 shadow-sm text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-xs text-secondary">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Upload form */}
        {showUploadForm && (
          <div className={cardClass}>
            <h2 className="mb-4 text-base font-bold text-primary">Upload new PDF</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Title *</label>
                  <input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className={inputClass} required placeholder="Publication title" />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className={inputClass}>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Version</label>
                  <input value={uploadVersion} onChange={(e) => setUploadVersion(e.target.value)} className={inputClass} placeholder="e.g. 2024" />
                </div>
                <div>
                  <label className={labelClass}>Publication date</label>
                  <input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <input value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} className={inputClass} placeholder="Optional notes…" />
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f) }}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${isDragging ? 'border-[#d73f09] bg-[#fff8f6]' : 'border-[#d8d1c7] bg-[#fcfaf7]'}`}
              >
                {uploadFile ? (
                  <p className="font-semibold text-primary">{uploadFile.name} <button type="button" onClick={() => setUploadFile(null)} className="ml-2 text-xs text-red-600 underline">Remove</button></p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-secondary">Drag & drop a PDF here, or</p>
                    <label className="mt-2 inline-block cursor-pointer rounded-xl border border-[#d8d1c7] bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-[#f3f0ed]">
                      Browse file
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </>
                )}
              </div>
              <button type="submit" disabled={uploadStatus !== 'idle'} className={primaryButton}>
                {uploadStatus === 'uploading' ? 'Uploading…' : uploadStatus === 'processing' ? 'Processing…' : 'Upload & process'}
              </button>
            </form>
          </div>
        )}

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#d8d1c7] bg-white px-4 py-3 shadow-sm">
            <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
            <button type="button" onClick={() => bulkSetStatus([...selectedIds], true)} disabled={bulkActioning} className={secondaryButton}>Unarchive</button>
            <button type="button" onClick={() => bulkSetStatus([...selectedIds], false)} disabled={bulkActioning} className={secondaryButton}>Archive</button>
            <button type="button" onClick={() => bulkReprocess([...selectedIds])} disabled={bulkActioning} className={secondaryButton}>Reprocess</button>
            <button type="button" onClick={() => setSelectedIds(new Set())} className={secondaryButton}>Clear</button>
          </div>
        )}

        {/* Filter bar */}
        <div className={cardClass}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, filename, category…"
              className={`${inputClass} sm:flex-1`}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary shadow-sm">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="processed">Processed</option>
              <option value="not_processed">Not processed</option>
            </select>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-xs text-secondary">{filtered.length} of {documents.length} shown</p>
            {filtered.length > 0 && (
              <button type="button" onClick={toggleSelectAll} className="text-xs text-[#d73f09] underline-offset-2 hover:underline">
                {selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>
        </div>

        {/* Document list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className={`${cardClass} text-center text-secondary`}>No documents match your filters.</div>
          ) : filtered.map((doc) => {
            const badge = processingBadge(doc)
            const isExpanded = expandedId === doc.id
            const isEditing = editingDocId === doc.id
            const isReplacing = replaceForm.documentId === doc.id

            return (
              <div key={doc.id} className={`${cardClass} ${!doc.is_active ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc.id)}
                    onChange={() => toggleSelect(doc.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#d73f09]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                          {!doc.is_active && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-secondary">Archived</span>}
                          {doc.category && <span className="rounded-full bg-[#f3f0ed] px-2 py-0.5 text-xs font-semibold text-secondary">{doc.category}</span>}
                        </div>
                        <p className="font-semibold text-primary leading-snug">{doc.title}</p>
                        <p className="text-xs text-muted mt-0.5">{doc.filename}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-secondary">
                          <span>{doc.page_count ?? 0} pages</span>
                          {doc.version && <span>v{doc.version}</span>}
                          <span>Uploaded {formatDate(doc.uploaded_at)}</span>
                          {doc.file_size_bytes && <span>{formatBytes(doc.file_size_bytes)}</span>}
                        </div>
                        {isProcessing(doc) && (
                          <div className="mt-2">
                            <div className="h-1.5 w-full rounded-full bg-gray-100">
                              <div
                                className="h-1.5 rounded-full bg-[#d73f09] transition-all"
                                style={{ width: `${doc.processing_progress ?? 0}%` }}
                              />
                            </div>
                            <p className="mt-0.5 text-xs text-secondary">{doc.processing_progress ?? 0}% complete</p>
                          </div>
                        )}
                        {doc.processing_error && (
                          <p className="mt-1 text-xs text-red-600">Error: {doc.processing_error}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        <a
                          href={`/api/view-source?file=${encodeURIComponent(doc.filename)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={secondaryButton}
                        >
                          View PDF
                        </a>
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : doc.id)} className={secondaryButton}>
                          {isExpanded ? 'Collapse' : 'Actions'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded actions */}
                    {isExpanded && (
                      <div className="mt-4 space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => processDocument(doc.id)}
                            disabled={processingId === doc.id || isProcessing(doc)}
                            className={secondaryButton}
                          >
                            {processingId === doc.id ? 'Processing…' : 'Reprocess'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) { setEditingDocId(null) } else {
                                setEditingDocId(doc.id)
                                setEditForm({
                                  title: doc.title ?? '',
                                  category: doc.category ?? '',
                                  version: doc.version ?? '',
                                  publicationDate: doc.publication_date ?? '',
                                  documentNotes: doc.document_notes ?? '',
                                  approvalStatus: doc.approval_status ?? (doc.is_active ? 'active' : 'archived'),
                                })
                                setReplaceForm((prev) => ({ ...prev, documentId: null }))
                              }
                            }}
                            className={secondaryButton}
                          >
                            {isEditing ? 'Cancel edit' : 'Edit metadata'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isReplacing) {
                                setReplaceForm({ documentId: null, title: '', category: '', version: '', publicationDate: '', documentNotes: '', approvalStatus: 'active', file: null })
                              } else {
                                setReplaceForm({ documentId: doc.id, title: doc.title ?? '', category: doc.category ?? '', version: doc.version ?? '', publicationDate: doc.publication_date ?? '', documentNotes: doc.document_notes ?? '', approvalStatus: 'active', file: null })
                                setEditingDocId(null)
                              }
                            }}
                            className={secondaryButton}
                          >
                            {isReplacing ? 'Cancel replace' : 'Replace PDF'}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(doc.id, !doc.is_active)}
                            disabled={updatingId === doc.id}
                            className={secondaryButton}
                          >
                            {updatingId === doc.id ? '…' : doc.is_active ? 'Archive' : 'Unarchive'}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDocument(doc)}
                            disabled={deletingId === doc.id}
                            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            {deletingId === doc.id ? '…' : 'Delete'}
                          </button>
                        </div>

                        {/* Edit metadata form */}
                        {isEditing && (
                          <div className="rounded-2xl bg-[#fcfaf7] p-4 space-y-3">
                            <p className="text-sm font-bold text-primary">Edit metadata</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className={labelClass}>Title</label>
                                <input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Category</label>
                                <select value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))} className={inputClass}>
                                  <option value="">None</option>
                                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className={labelClass}>Version</label>
                                <input value={editForm.version} onChange={(e) => setEditForm((p) => ({ ...p, version: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Publication date</label>
                                <input type="date" value={editForm.publicationDate} onChange={(e) => setEditForm((p) => ({ ...p, publicationDate: e.target.value }))} className={inputClass} />
                              </div>
                            </div>
                            <div>
                              <label className={labelClass}>Notes</label>
                              <input value={editForm.documentNotes} onChange={(e) => setEditForm((p) => ({ ...p, documentNotes: e.target.value }))} className={inputClass} />
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => saveDocumentMetadata(doc.id)} disabled={savingMetadataId === doc.id} className={primaryButton}>
                                {savingMetadataId === doc.id ? 'Saving…' : 'Save changes'}
                              </button>
                              <button type="button" onClick={() => setEditingDocId(null)} className={secondaryButton}>Cancel</button>
                            </div>
                          </div>
                        )}

                        {/* Replace PDF form */}
                        {isReplacing && (
                          <div className="rounded-2xl bg-[#fcfaf7] p-4 space-y-3">
                            <p className="text-sm font-bold text-primary">Replace PDF</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className={labelClass}>Title</label>
                                <input value={replaceForm.title} onChange={(e) => setReplaceForm((p) => ({ ...p, title: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Version</label>
                                <input value={replaceForm.version} onChange={(e) => setReplaceForm((p) => ({ ...p, version: e.target.value }))} className={inputClass} placeholder="New version number" />
                              </div>
                            </div>
                            <div>
                              <label className={labelClass}>New PDF file</label>
                              <input type="file" accept="application/pdf" onChange={(e) => setReplaceForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))} className="block w-full text-sm text-primary" />
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={replaceDocument} disabled={replacingId === doc.id} className={primaryButton}>
                                {replacingId === doc.id ? 'Replacing…' : 'Replace document'}
                              </button>
                              <button type="button" onClick={() => setReplaceForm((p) => ({ ...p, documentId: null }))} className={secondaryButton}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
