'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type DocumentRow = {
  id: string
  title: string | null
  filename: string
  category?: string | null
  version?: string | null
  uploaded_at?: string | null
  is_active: boolean
}

type SortOption =
  | 'title-asc'
  | 'title-desc'
  | 'category-asc'
  | 'uploaded-desc'
  | 'uploaded-asc'

export default function PublicationsTable({
  documents,
}: {
  documents: DocumentRow[]
}) {
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sortOption, setSortOption] = useState<SortOption>('title-asc')

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        documents.map((doc) => doc.category || 'Uncategorized')
      )
    )

    return ['All', ...uniqueCategories.sort()]
  }, [documents])

  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = [...documents]

    if (categoryFilter !== 'All') {
      filtered = filtered.filter(
        (doc) => (doc.category || 'Uncategorized') === categoryFilter
      )
    }

    filtered.sort((a, b) => {
      const titleA = a.title || a.filename
      const titleB = b.title || b.filename
      const categoryA = a.category || 'Uncategorized'
      const categoryB = b.category || 'Uncategorized'
      const uploadedA = a.uploaded_at
        ? new Date(a.uploaded_at).getTime()
        : 0
      const uploadedB = b.uploaded_at
        ? new Date(b.uploaded_at).getTime()
        : 0

      switch (sortOption) {
        case 'title-desc':
          return titleB.localeCompare(titleA)
        case 'category-asc':
          return categoryA.localeCompare(categoryB)
        case 'uploaded-desc':
          return uploadedB - uploadedA
        case 'uploaded-asc':
          return uploadedA - uploadedB
        case 'title-asc':
        default:
          return titleA.localeCompare(titleB)
      }
    })

    return filtered
  }, [documents, categoryFilter, sortOption])

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Filter by category
            </label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Sort by
            </label>
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as SortOption)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="category-asc">Category A-Z</option>
              <option value="uploaded-desc">Newest uploaded</option>
              <option value="uploaded-asc">Oldest uploaded</option>
            </select>
          </div>

          <div className="flex items-end text-sm text-gray-600">
            Showing {filteredAndSortedDocuments.length} of {documents.length}{' '}
            publications
          </div>
        </div>
      </div>

      {filteredAndSortedDocuments.length === 0 ? (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-gray-600">
            No publications match the selected filters.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Publication</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Version</th>
                  <th className="p-3 text-left">Uploaded</th>
                </tr>
              </thead>

              <tbody>
                {filteredAndSortedDocuments.map((doc) => {
                  const pdfUrl = `/api/view-source?file=${encodeURIComponent(
                    doc.filename
                  )}`

                  return (
                    <tr key={doc.id} className="border-t align-top">
                      <td className="p-3">
                        <Link
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          {doc.title || doc.filename}
                        </Link>

                        <p className="mt-1 text-xs text-gray-500">
                          {doc.filename}
                        </p>
                      </td>

                      <td className="p-3 text-gray-600">
                        {doc.category || 'Uncategorized'}
                      </td>

                      <td className="p-3 text-gray-600">
                        {doc.version || 'Not listed'}
                      </td>

                      <td className="p-3 text-gray-600">
                        {doc.uploaded_at
                          ? new Date(doc.uploaded_at).toLocaleDateString()
                          : 'Unknown'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  )
}