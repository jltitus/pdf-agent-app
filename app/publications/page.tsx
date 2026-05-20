
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
    .select(
      'id, title, filename, category, version, uploaded_at, is_active'
    )
    .eq('is_active', true)
    .order('title', { ascending: true })

  const docIds = (documents ?? []).map((d) => d.id)
  const { data: pageRows } = docIds.length
    ? await supabase.from('document_pages').select('document_id').in('document_id', docIds)
    : { data: [] }

  const pageCounts: Record<string, number> = {}
  for (const row of pageRows ?? []) {
    pageCounts[row.document_id] = (pageCounts[row.document_id] ?? 0) + 1
  }

  return (
    <>
      

      <main className="min-h-screen bg-[#f7f4ef] text-primary">
        <div className="mx-auto max-w-7xl space-y-6 px-3 py-5 sm:px-6 sm:py-8">
          <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
            <div className="bg-[#d73f09] px-5 py-3 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">
                Oregon State University Extension
              </p>
            </div>

            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                  Preservation reference library
                </p>

                <h1 className="mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl">
                  OSU Extension preservation publications
                </h1>

                <p className="mt-5 max-w-3xl text-base leading-7 text-secondary sm:text-lg">
                  Browse current Oregon State University Extension Master Food
                  Preserver publications and open original source documents
                  directly.
                </p>
              </div>

              <aside className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-5">
                <h2 className="text-xl font-bold text-primary">
                  Current publication guidance
                </h2>

                <p className="mt-3 text-sm leading-6 text-secondary">
                  Publications in this system are updated as new OSU Extension
                  preservation guidance becomes available.
                </p>

                <div className="mt-5 rounded-xl border border-[#ead9bf] bg-[#f7f0dd] p-4 text-sm leading-6 text-secondary">
                  <strong className="text-primary">
                    Recommended workflow:
                  </strong>{' '}
                  Review the original publication PDF when confirming
                  preservation processes, recipes, or safety guidance.
                </div>
              </aside>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not load publications: {error.message}
            </div>
          )}

          {!documents || documents.length === 0 ? (
            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm">
              <p className="text-secondary">
                No active publications found.
              </p>
            </section>
          ) : (
            <PublicationsTable documents={documents as DocumentRow[]} pageCounts={pageCounts} />
          )}
        </div>
      </main>
    </>
  )
}