'use client'

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

export default function PublicationsTable({ documents }: PublicationsTableProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-bold text-primary">Publications</h2>
        <p className="text-sm text-secondary">
          {documents.length} active publication{documents.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid gap-3 lg:hidden">
        {documents.map((document) => (
          <article
            key={document.id}
            className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="space-y-3">
              <div>
                <h3 className="break-words text-base font-bold leading-snug text-primary">
                  {getPublicationTitle(document)}
                </h3>
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

              <Link
                href={getPdfHref(document)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
              >
                Open PDF
              </Link>
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
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-muted">
                PDF
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {documents.map((document) => (
              <tr key={document.id} className="hover:bg-gray-50">
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