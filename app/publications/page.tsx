import HeaderBar from '../components/HeaderBar'
import { createClient } from '../../lib/supabase/server'
import PublicationsTable from './PublicationsTable'

type DocumentRow = {
  id: string
  title: string | null
  filename: string
  category?: string | null
  version?: string | null
  uploaded_at?: string | null
  is_active: boolean
}

export const dynamic = 'force-dynamic'

export default async function PublicationsPage() {
  const supabase = await createClient()

  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, title, filename, category, version, uploaded_at, is_active')
    .eq('is_active', true)
    .order('title', { ascending: true })

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
          <section className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Publication Library
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-primary sm:text-3xl">
              Active MFP Publications
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary sm:text-base">
              View active MFP publications available in the agent. Open the PDF
              to review the source publication directly.
            </p>
          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not load publications: {error.message}
            </div>
          )}

          {!documents || documents.length === 0 ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-secondary">No active publications found.</p>
            </section>
          ) : (
            <PublicationsTable documents={documents as DocumentRow[]} />
          )}
        </div>
      </main>
    </>
  )
}