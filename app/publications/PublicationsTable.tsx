'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

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
}

function formatDate(value?: string | null) {
  if (!value) return 'Not listed'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not listed'
  }

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

export default function PublicationsTable({
  documents,
}: PublicationsTableProps) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [savingFavoriteId, setSavingFavoriteId] = useState<string | null>(null)

  useEffect(() => {
    async function loadFavorites() {
      try {
        const response = await fetch('/api/favorites')

        if (!response.ok) {
          setLoadingFavorites(false)
          return
        }

        const data = await response.json()

        const ids =
          data.favorites?.map(
            (favorite: any) => favorite.document_id
          ) ?? []

        setFavoriteIds(ids)
      } catch (error) {
        console.error('Could not load favorites', error)
      } finally {
        setLoadingFavorites(false)
      }
    }

    loadFavorites()
  }, [])

  async function toggleFavorite(documentId: string) {
    try {
      setSavingFavoriteId(documentId)

      const isFavorite = favoriteIds.includes(documentId)

      const response = await fetch('/api/favorites', {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
        }),
      })

      if (!response.ok) {
        console.error('Favorite request failed')
        return
      }

      setFavoriteIds((prev) =>
        isFavorite
          ? prev.filter((id) => id !== documentId)
          : [...prev, documentId]
      )
    } catch (error) {
      console.error('Favorite toggle failed', error)
    } finally {
      setSavingFavoriteId(null)
    }
  }

  function isFavorite(documentId: string) {
    return favoriteIds.includes(documentId)
  }

  function favoriteButton(documentId: string) {
    const active = isFavorite(documentId)

    return (
      <button
        type="button"
        disabled={savingFavoriteId === documentId || loadingFavorites}
        onClick={() => toggleFavorite(documentId)}
        className={`inline-flex min-h-11 max-w-full items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition ${
          active
            ? 'border-yellow-300 bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            : 'border-gray-300 bg-white text-primary hover:bg-gray-100'
        }`}
      >
        {active ? '★ Saved' : '☆ Save'}
      </button>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">
              Publications
            </h2>

            <p className="text-sm text-secondary">
              {documents.length} active publication
              {documents.length === 1 ? '' : 's'}
            </p>
          </div>

          <Link
            href="/profile"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-gray-100"
          >
            View saved publications
          </Link>
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        {documents.map((document) => (
          <article
            key={document.id}
            className="min-w-0 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="min-w-0 space-y-3">
              <div>
                <div className="space-y-3">
                  <h3 className="break-words text-base font-bold leading-snug text-primary">
                    {getPublicationTitle(document)}
                  </h3>

                  <div>
                    {favoriteButton(document.id)}
                  </div>
                </div>

                <p className="mt-1 break-words text-xs leading-5 text-muted">
                  {document.filename}
                </p>
              </div>

              <dl className="space-y-2 text-sm">
                <div className="rounded-xl bg-gray-50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Category
                  </dt>

                  <dd className="mt-1 break-words font-medium text-primary">
                    {displayValue(document.category)}
                  </dd>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Version
                  </dt>

                  <dd className="mt-1 break-words font-medium text-primary">
                    {displayValue(document.version)}
                  </dd>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Date
                  </dt>

                  <dd className="mt-1 font-medium text-primary">
                    {formatDate(document.uploaded_at)}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={getPdfHref(document)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
                >
                  Open PDF
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">
                Publication
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">
                Category
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">
                Version
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">
                Date
              </th>

              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-muted">
                Save
              </th>

              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-muted">
                PDF
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {documents.map((document) => (
              <tr
                key={document.id}
                className="hover:bg-gray-50"
              >
                <td className="max-w-md px-4 py-4">
                  <div className="font-semibold text-primary">
                    {getPublicationTitle(document)}
                  </div>

                  <div className="mt-1 break-words text-xs text-muted">
                    {document.filename}
                  </div>
                </td>

                <td className="px-4 py-4 text-sm text-secondary">
                  {displayValue(document.category)}
                </td>

                <td className="px-4 py-4 text-sm text-secondary">
                  {displayValue(document.version)}
                </td>

                <td className="px-4 py-4 text-sm text-secondary">
                  {formatDate(document.uploaded_at)}
                </td>

                <td className="px-4 py-4 text-center">
                  {favoriteButton(document.id)}
                </td>

                <td className="px-4 py-4 text-right">
                  <Link
                    href={getPdfHref(document)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-gray-100"
                  >
                    Open PDF
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}