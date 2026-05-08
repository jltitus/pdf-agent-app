import Link from 'next/link'
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
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Publication Library</h1>
            <p className="mt-2 text-gray-600">
              View active MFP publications available in the agent. Click or tap a
              publication title to open the full PDF.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not load publications: {error.message}
            </div>
          )}

          {!documents || documents.length === 0 ? (
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-gray-600">No active publications found.</p>
            </section>
          ) : (
            <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
{!documents || documents.length === 0 ? (
  <section className="rounded-2xl border bg-white p-6 shadow-sm">
    <p className="text-gray-600">No active publications found.</p>
  </section>
) : (
  <PublicationsTable documents={documents as DocumentRow[]} />
)}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}