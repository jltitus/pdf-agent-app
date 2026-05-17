'use client'

import { useEffect, useMemo, useState } from 'react'
import HeaderBar from '../../components/HeaderBar'
import { createClient } from '../../../lib/supabase/client'

type IssueStatus = 'new' | 'open' | 'reviewed' | 'resolved' | 'enhancement_candidate'

type IssueReport = {
  id: string
  user_email?: string | null
  issue_type: string
  description: string
  related_question?: string | null
  status: IssueStatus | string
  created_at: string
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary'
const secondaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-100 disabled:opacity-60'
const primaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-gray-800 disabled:bg-gray-700 disabled:cursor-not-allowed'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function normalizeIssueStatus(status?: string | null): IssueStatus {
  return status === 'open' ? 'new' : ((status || 'new') as IssueStatus)
}

function getIssueStatusDisplay(status?: string | null) {
  const normalized = normalizeIssueStatus(status)
  if (normalized === 'enhancement_candidate') return 'Enhancement candidate'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function getIssueStatusClass(status?: string | null) {
  const normalized = normalizeIssueStatus(status)
  if (normalized === 'new') return 'bg-red-100 text-red-700'
  if (normalized === 'reviewed') return 'bg-yellow-100 text-yellow-800'
  if (normalized === 'enhancement_candidate') return 'bg-blue-100 text-blue-700'
  if (normalized === 'resolved') return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-secondary'
}

export default function AdminIssuesReviewPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState('')
  const [issueReports, setIssueReports] = useState<IssueReport[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'reviewed' | 'resolved' | 'enhancement_candidate'>('all')
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user

      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin' && profile?.is_active) {
        setIsAdmin(true)
        await loadIssueReports()
      }

      setLoading(false)
    }

    init()
  }, [supabase])

  async function loadIssueReports() {
    setMessage('')

    const { data, error } = await supabase
      .from('issue_reports')
      .select('id, user_email, issue_type, description, related_question, status, created_at')
      .order('created_at', { ascending: false })
      .limit(250)

    if (error) {
      setMessage(`Could not load issue reports: ${error.message}`)
      setIssueReports([])
      return
    }

    setIssueReports((data ?? []) as IssueReport[])
  }

  async function updateIssueStatus(item: IssueReport, status: Exclude<IssueStatus, 'open'>) {
    setUpdatingIssueId(item.id)
    setMessage(`Updating issue to ${getIssueStatusDisplay(status)}...`)

    const { error } = await supabase
      .from('issue_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', item.id)

    if (error) {
      setMessage(`Issue update failed: ${error.message}`)
      setUpdatingIssueId(null)
      return
    }

    setMessage(`Issue marked ${getIssueStatusDisplay(status)}.`)
    setUpdatingIssueId(null)
    await loadIssueReports()
  }

  const counts = useMemo(() => {
    return {
      total: issueReports.length,
      new: issueReports.filter((item) => normalizeIssueStatus(item.status) === 'new').length,
      reviewed: issueReports.filter((item) => normalizeIssueStatus(item.status) === 'reviewed').length,
      enhancement_candidate: issueReports.filter((item) => normalizeIssueStatus(item.status) === 'enhancement_candidate').length,
      resolved: issueReports.filter((item) => normalizeIssueStatus(item.status) === 'resolved').length,
    }
  }, [issueReports])

  const filteredIssueReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return issueReports.filter((item) => {
      const normalizedStatus = normalizeIssueStatus(item.status)
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter
      const matchesSearch =
        !normalizedSearch ||
        item.issue_type.toLowerCase().includes(normalizedSearch) ||
        item.description.toLowerCase().includes(normalizedSearch) ||
        (item.related_question ?? '').toLowerCase().includes(normalizedSearch) ||
        (item.user_email ?? '').toLowerCase().includes(normalizedSearch) ||
        normalizedStatus.toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesSearch
    })
  }, [issueReports, search, statusFilter])

  if (loading) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6 text-primary">
          Loading issue review...
        </main>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6 text-primary">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-secondary">You must be an admin to review issues.</p>
        </main>
      </>
    )
  }

  return (
    <>
      <HeaderBar />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 text-primary">
        <div className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
          <section className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <a href="/admin" className="text-sm font-semibold text-blue-700 hover:underline">
                  ← Back to admin
                </a>
                <h1 className="mt-2 text-2xl font-bold leading-tight text-primary sm:text-3xl">
                  Detailed Issue Review
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary sm:text-base">
                  Review tester-reported problems, source issues, and enhancement candidates. Status changes update the same issue records shown on the main admin dashboard.
                </p>
              </div>

              <button type="button" onClick={loadIssueReports} className={secondaryButton}>
                Refresh
              </button>
            </div>
          </section>

          {message && (
            <div className="rounded-xl border border-gray-300 bg-white p-3 text-sm text-primary shadow-sm">
              {message}
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ['Total', counts.total],
              ['New', counts.new],
              ['Reviewed', counts.reviewed],
              ['Enhancements', counts.enhancement_candidate],
              ['Resolved', counts.resolved],
            ].map(([label, value]) => (
              <button
                key={String(label)}
                type="button"
                onClick={() => {
                  if (label === 'Total') setStatusFilter('all')
                  if (label === 'New') setStatusFilter('new')
                  if (label === 'Reviewed') setStatusFilter('reviewed')
                  if (label === 'Enhancements') setStatusFilter('enhancement_candidate')
                  if (label === 'Resolved') setStatusFilter('resolved')
                }}
                className="rounded-2xl border border-gray-300 bg-white p-4 text-left shadow-sm hover:bg-gray-50"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
              </button>
            ))}
          </section>

          <section className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_240px_auto] lg:items-end">
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">Search issues</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search issue type, user, question, or description..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className={inputClass}>
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="enhancement_candidate">Enhancement candidate</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
                className={secondaryButton}
              >
                Clear filters
              </button>
            </div>

            <p className="mt-3 text-sm text-secondary">
              Showing <strong>{filteredIssueReports.length}</strong> of <strong>{issueReports.length}</strong> issue records.
            </p>
          </section>

          {filteredIssueReports.length === 0 ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-6 text-sm text-secondary shadow-sm">
              No issues match the current search/filter.
            </section>
          ) : (
            <section className="grid gap-4">
              {filteredIssueReports.map((item) => (
                <article key={item.id} className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-primary">{item.issue_type}</h2>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getIssueStatusClass(item.status)}`}>
                          {getIssueStatusDisplay(item.status)}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-muted">
                        {item.user_email || 'Unknown user'} • {formatDate(item.created_at)}
                      </p>

                      {item.related_question && (
                        <section className="mt-4 rounded-xl bg-gray-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Related question</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-primary">
                            {item.related_question}
                          </p>
                        </section>
                      )}

                      <section className="mt-3 rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Description</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-primary">
                          {item.description}
                        </p>
                      </section>
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-60 lg:grid-cols-1">
                      {normalizeIssueStatus(item.status) !== 'reviewed' && (
                        <button
                          type="button"
                          onClick={() => updateIssueStatus(item, 'reviewed')}
                          disabled={updatingIssueId === item.id}
                          className={secondaryButton}
                        >
                          Mark reviewed
                        </button>
                      )}

                      {normalizeIssueStatus(item.status) !== 'enhancement_candidate' && (
                        <button
                          type="button"
                          onClick={() => updateIssueStatus(item, 'enhancement_candidate')}
                          disabled={updatingIssueId === item.id}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                        >
                          Enhancement
                        </button>
                      )}

                      {normalizeIssueStatus(item.status) !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => updateIssueStatus(item, 'resolved')}
                          disabled={updatingIssueId === item.id}
                          className={primaryButton}
                        >
                          Resolve
                        </button>
                      )}

                      {normalizeIssueStatus(item.status) !== 'new' && (
                        <button
                          type="button"
                          onClick={() => updateIssueStatus(item, 'new')}
                          disabled={updatingIssueId === item.id}
                          className={secondaryButton}
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </>
  )
}
