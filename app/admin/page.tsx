'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

type DocumentRow = {
  id: string
  title: string
  filename: string
  category?: string | null
  version?: string | null
  is_active: boolean
  storage_path?: string | null
  openai_file_id?: string | null
  vector_store_id?: string | null
  uploaded_at?: string | null
  page_count?: number
}

export default function AdminPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [version, setVersion] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const user = data.session.user

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin' && profile?.is_active) {
        setIsAdmin(true)
        await loadDocuments()
      }

      setLoading(false)
    }

    checkAdmin()
  }, [supabase])

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
      pageCounts[page.document_id] = (pageCounts[page.document_id] ?? 0) + 1
    }

    setDocuments(
      docs.map((doc) => ({
        ...doc,
        page_count: pageCounts[doc.id] ?? 0,
      }))
    )
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('Uploading...')

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

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

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

      let result: any = {}

      try {
        result = await response.json()
      } catch {
        result = {}
      }

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

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

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

    const result = await response.json()

    if (!response.ok) {
      setMessage(`Status update failed: ${result.error}`)
      setUpdatingId(null)
      return
    }

    setMessage(isActive ? 'Document unarchived.' : 'Document archived.')
    setUpdatingId(null)
    await loadDocuments()
  }

  async function deleteDocument(documentId: string, documentTitle: string) {
    const confirmed = window.confirm(
      `Delete "${documentTitle}"? This will remove the PDF, page chunks, and document record. This cannot be undone.`
    )

    if (!confirmed) return

    setDeletingId(documentId)
    setMessage('Deleting document...')

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

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

      let result: any = {}

      try {
        result = await response.json()
      } catch {
        result = {}
      }

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

  if (loading) {
    return <main className="min-h-screen p-8">Loading...</main>
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p>You must be an admin to upload PDFs.</p>
      </main>
    )
  }

  const totalDocs = documents.length
  const activeDocs = documents.filter((doc) => doc.is_active).length
  const archivedDocs = documents.filter((doc) => !doc.is_active).length
  const totalPages = documents.reduce((sum, doc) => sum + (doc.page_count ?? 0), 0)

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Admin: Manage PDFs</h1>
          <p className="text-gray-600">
            Upload, process, archive, delete, and review PDFs in the agent knowledge base.
          </p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

          {message && (
            <div className="rounded-lg border p-3 text-sm">
              {message}
            </div>
          )}

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
  )
}