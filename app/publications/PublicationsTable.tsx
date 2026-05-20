'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'

type DocumentRow = {
  id: string
  title: string | null
  filename: string
  category?: string | null
  version?: string | null
  uploaded_at?: string | null
  is_active: boolean
}

type PublicationsTableProps = {
  documents: DocumentRow[]
  pageCounts?: Record<string, number>
}

function formatDate(value?: string | null) {
  if (!value) return 'Not listed'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not listed'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function displayValue(value?: string | null) {
  return value && value.trim().length > 0 ? value : 'Not listed'
}

function getPublicationTitle(document: DocumentRow) {
  return document.title || document.filename || 'Untitled publication'
}

function getPdfHref(document: DocumentRow) {
  return `/api/view-source?file=${encodeURIComponent(document.filename)}`
}

function isNew(uploadedAt?: string | null) {
  if (!uploadedAt) return false
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 60)
  return new Date(uploadedAt) >= cutoff
}

export default function PublicationsTable({ documents, pageCounts }: PublicationsTableProps) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [savingFavoriteId, setSavingFavoriteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [savedOnly, setSavedOnly] = useState(false)
  const [sort, setSort] = useState<'title_asc' | 'title_desc' | 'recent'>('title_asc')
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list')

  useEffect(() => {
    async function loadFavorites() {
      try {
        const response = await fetch('/api/favorites')
        if (!response.ok) return

        const data = await response.json()
        const ids = data.favorites?.map((favorite: any) => favorite.document_id) ?? []
        setFavoriteIds(ids)
      } catch (error) {
        console.error('Could not load favorites', error)
      } finally {
        setLoadingFavorites(false)
      }
    }

    loadFavorites()
  }, [])

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        documents
          .map((document) => document.category)
          .filter((value): value is string => Boolean(value && value.trim()))
      )
    ).sort()
  }, [documents])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const doc of documents) {
      if (doc.category) {
        counts[doc.category] = (counts[doc.category] ?? 0) + 1
      }
    }
    return counts
  }, [documents])

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const filtered = documents.filter((document) => {
      const matchesSearch =
        !normalizedSearch ||
        getPublicationTitle(document).toLowerCase().includes(normalizedSearch) ||
        document.filename.toLowerCase().includes(normalizedSearch) ||
        (document.category ?? '').toLowerCase().includes(normalizedSearch) ||
        (document.version ?? '').toLowerCase().includes(normalizedSearch)

      const matchesCategory =
        categoryFilter === 'all' || document.category === categoryFilter

      const matchesSaved = !savedOnly || favoriteIds.includes(document.id)

      return matchesSearch && matchesCategory && matchesSaved
    })

    return [...filtered].sort((a, b) => {
      if (sort === 'title_desc') {
        return getPublicationTitle(b).localeCompare(getPublicationTitle(a))
      }
      if (sort === 'recent') {
        const dateA = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0
        const dateB = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0
        return dateB - dateA
      }
      return getPublicationTitle(a).localeCompare(getPublicationTitle(b))
    })
  }, [documents, search, categoryFilter, savedOnly, favoriteIds, sort])

  const groupedDocuments = useMemo(() => {
    const groups: Record<string, DocumentRow[]> = {}
    for (const doc of filteredDocuments) {
      const key = doc.category ?? 'Uncategorized'
      if (!groups[key]) groups[key] = []
      groups[key].push(doc)
    }
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === 'Uncategorized') return 1
        if (b === 'Uncategorized') return -1
        return a.localeCompare(b)
      })
      .map(([category, docs]) => ({ category, documents: docs }))
  }, [filteredDocuments])

  async function toggleFavorite(documentId: string) {
    try {
      setSavingFavoriteId(documentId)

      const isFavorite = favoriteIds.includes(documentId)

      const response = await fetch('/api/favorites', {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })

      if (!response.ok) return

      setFavoriteIds((prev) =>
        isFavorite ? prev.filter((id) => id !== documentId) : [...prev, documentId]
      )
    } catch (error) {
      console.error('Favorite toggle failed', error)
    } finally {
      setSavingFavoriteId(null)
    }
  }

  function favoriteButton(documentId: string) {
    const active = favoriteIds.includes(documentId)

    return (
      <button
        type="button"
        disabled={savingFavoriteId === documentId || loadingFavorites}
        onClick={() => toggleFavorite(documentId)}
        className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
          active
            ? 'border-yellow-300 bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            : 'border-[#d8d1c7] bg-white text-primary hover:bg-[#f3f0ed]'
        }`}
      >
        {active ? '★ Saved' : '☆ Save'}
      </button>
    )
  }

  function mobileCardHeader(document: DocumentRow, hideCategory = false) {
    return (
      <div className="border-b border-[#e8e1d8] bg-[#fcfaf7] px-5 py-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {!hideCategory && document.category && (
              <span className="rounded-full bg-[#f3f0ed] px-2.5 py-1 text-xs font-semibold text-secondary">
                {document.category}
              </span>
            )}
            {isNew(document.uploaded_at) && (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                New
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold leading-snug text-primary">
            {getPublicationTitle(document)}
          </h3>
          <p className="break-words text-xs leading-5 text-muted">{document.filename}</p>
        </div>
      </div>
    )
  }

  function mobileCardBody(document: DocumentRow) {
    const pageCount = pageCounts?.[document.id]
    return (
      <div className="space-y-4 px-5 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#f7f4ef] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Version</p>
            <p className="mt-1 text-sm font-semibold text-primary">{displayValue(document.version)}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f4ef] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Updated</p>
            <p className="mt-1 text-sm font-semibold text-primary">{formatDate(document.uploaded_at)}</p>
          </div>
          {pageCount && (
            <div className="rounded-2xl bg-[#f7f4ef] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Pages</p>
              <p className="mt-1 text-sm font-semibold text-primary">{pageCount}</p>
            </div>
          )}
        </div>
        <div className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Link
              href={getPdfHref(document)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#d73f09] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#b23408]"
            >
              Open publication PDF
            </Link>
            {favoriteButton(document.id)}
          </div>
          <Link
            href={`/chat?documentId=${document.id}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-[#f3f0ed]"
          >
            Ask about this publication →
          </Link>
        </div>
      </div>
    )
  }

  const tableHead = (
    <thead className="bg-[#fcfaf7]">
      <tr>
        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em] text-muted">Publication</th>
        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em] text-muted">Category</th>
        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em] text-muted">Version</th>
        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.16em] text-muted">Updated</th>
        <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-muted">Save</th>
        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[0.16em] text-muted">PDF</th>
      </tr>
    </thead>
  )

  function tableRow(document: DocumentRow) {
    const pageCount = pageCounts?.[document.id]
    return (
      <tr key={document.id} className="transition hover:bg-[#fcfaf7]">
        <td className="max-w-md px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#5f8a63]" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-primary">{getPublicationTitle(document)}</span>
                {isNew(document.uploaded_at) && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                    New
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="break-words">{document.filename}</span>
                {pageCount && <span>{pageCount} pages</span>}
              </div>
            </div>
          </div>
        </td>
        <td className="w-40 px-5 py-5">
          <span className="inline-block whitespace-nowrap rounded-full bg-[#f3f0ed] px-3 py-1 text-xs font-semibold text-secondary">
            {displayValue(document.category)}
          </span>
        </td>
        <td className="px-5 py-5 text-sm font-medium text-secondary">{displayValue(document.version)}</td>
        <td className="px-5 py-5 text-sm font-medium text-secondary">{formatDate(document.uploaded_at)}</td>
        <td className="px-5 py-5 text-center">{favoriteButton(document.id)}</td>
        <td className="px-5 py-5 text-right">
          <div className="flex flex-col items-end gap-2">
            <Link
              href={getPdfHref(document)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#d73f09] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#b23408]"
            >
              Open PDF
            </Link>
            <Link
              href={`/chat?documentId=${document.id}`}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d8d1c7] bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-[#f3f0ed]"
            >
              Ask about this →
            </Link>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <section className="space-y-5">
      <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
              Active reference library
            </p>

            <h2 className="mt-2 text-2xl font-bold text-primary">
              Current publications
            </h2>

            <p className="mt-2 text-sm leading-6 text-secondary">
              Showing <strong>{filteredDocuments.length}</strong> of{' '}
              <strong>{documents.length}</strong> active publication
              {documents.length === 1 ? '' : 's'}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex overflow-hidden rounded-xl border border-[#d8d1c7]">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  viewMode === 'list'
                    ? 'bg-[#d73f09] text-white'
                    : 'bg-white text-primary hover:bg-[#f3f0ed]'
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`border-l border-[#d8d1c7] px-4 py-2 text-sm font-semibold transition ${
                  viewMode === 'grouped'
                    ? 'bg-[#d73f09] text-white'
                    : 'bg-white text-primary hover:bg-[#f3f0ed]'
                }`}
              >
                By topic
              </button>
            </div>

            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8d1c7] bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-[#f3f0ed]"
            >
              View saved
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_200px_180px_auto_auto] lg:items-end">
          <div>
            <label className="mb-1 block text-sm font-semibold text-primary">
              Search publications
            </label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, filename, category, or version..."
              className="w-full rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm text-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-primary">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm text-primary"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category} ({categoryCounts[category] ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-primary">
              Sort by
            </label>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="w-full rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm text-primary"
            >
              <option value="title_asc">Title A→Z</option>
              <option value="title_desc">Title Z→A</option>
              <option value="recent">Recently added</option>
            </select>
          </div>

          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] px-4 py-3 text-sm font-semibold text-primary">
            <input
              type="checkbox"
              checked={savedOnly}
              onChange={(event) => setSavedOnly(event.target.checked)}
              className="h-4 w-4"
            />
            Saved only
          </label>

          <button
            type="button"
            onClick={() => {
              setSearch('')
              setCategoryFilter('all')
              setSavedOnly(false)
              setSort('title_asc')
            }}
            className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-[#f3f0ed]"
          >
            Clear
          </button>
        </div>
      </section>

      {filteredDocuments.length === 0 ? (
        <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-primary">No publications found</h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Try clearing filters or searching by publication title, topic, category, or filename.
          </p>
        </section>
      ) : viewMode === 'list' ? (
        <>
          {/* Mobile flat list */}
          <div className="grid gap-4 lg:hidden">
            {filteredDocuments.map((document) => (
              <article key={document.id} className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
                {mobileCardHeader(document)}
                {mobileCardBody(document)}
              </article>
            ))}
          </div>

          {/* Desktop flat table */}
          <div className="hidden overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-[#e8e1d8]">
              {tableHead}
              <tbody className="divide-y divide-[#f0ebe4]">
                {filteredDocuments.map((document) => tableRow(document))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Mobile grouped by topic */}
          <div className="space-y-8 lg:hidden">
            {groupedDocuments.map(({ category, documents: groupDocs }) => (
              <div key={category}>
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-base font-bold text-primary">{category}</h3>
                  <span className="rounded-full bg-[#f3f0ed] px-2.5 py-1 text-xs font-semibold text-secondary">
                    {groupDocs.length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {groupDocs.map((document) => (
                    <article key={document.id} className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
                      {mobileCardHeader(document, true)}
                      {mobileCardBody(document)}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop grouped table */}
          <div className="hidden overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-[#e8e1d8]">
              {tableHead}
              <tbody className="divide-y divide-[#f0ebe4]">
                {groupedDocuments.map(({ category, documents: groupDocs }) => (
                  <React.Fragment key={category}>
                    <tr className="bg-[#f7f4ef]">
                      <td colSpan={6} className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-primary">{category}</span>
                          <span className="rounded-full bg-[#e8e1d8] px-2 py-0.5 text-xs font-semibold text-secondary">
                            {groupDocs.length}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {groupDocs.map((document) => tableRow(document))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}