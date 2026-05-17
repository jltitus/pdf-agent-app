'use client'

import { useEffect, useState } from 'react'
import HeaderBar from '../../components/HeaderBar'
import { createClient } from '../../../lib/supabase/client'

type Release = {
  id: string
  version: string
  title: string | null
  status: string
  deployed_at: string | null
  created_at: string
}

type Deployment = {
  id: string
  release_id: string | null
  environment: string
  deployed_at: string
}

type SmokeTest = {
  id: string
  deployment_id: string
  test_status: string
}

type Enhancement = {
  id: string
  status: string
  priority: string | null
}

type Issue = {
  id: string
  status: string
}

export default function AdminAnalyticsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState('')

  const [releases, setReleases] = useState<Release[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [smokeTests, setSmokeTests] = useState<SmokeTest[]>([])
  const [enhancements, setEnhancements] = useState<Enhancement[]>([])
  const [issues, setIssues] = useState<Issue[]>([])

  const cardClass =
    'rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-6'
  const statCardClass =
    'rounded-xl border border-gray-300 bg-white p-4 shadow-sm'
  const secondaryButton =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-100 disabled:opacity-60'

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.session.user.id)
        .single()

      if (profile?.role === 'admin' && profile?.is_active) {
        setIsAdmin(true)
        await loadData()
      }

      setLoading(false)
    }

    init()
  }, [supabase])

  async function loadData() {
    await Promise.all([
      loadReleases(),
      loadDeployments(),
      loadSmokeTests(),
      loadEnhancements(),
      loadIssues(),
    ])
  }

  async function loadReleases() {
    const { data, error } = await supabase
      .from('releases')
      .select('id, version, title, status, deployed_at, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(`Could not load releases: ${error.message}`)
      setReleases([])
      return
    }

    setReleases((data ?? []) as Release[])
  }

  async function loadDeployments() {
    const { data, error } = await supabase
      .from('deployment_history')
      .select('id, release_id, environment, deployed_at')
      .order('deployed_at', { ascending: false })

    if (error) {
      setMessage(`Could not load deployments: ${error.message}`)
      setDeployments([])
      return
    }

    setDeployments((data ?? []) as Deployment[])
  }

  async function loadSmokeTests() {
    const { data, error } = await supabase
      .from('deployment_smoke_tests')
      .select('id, deployment_id, test_status')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(`Could not load smoke tests: ${error.message}`)
      setSmokeTests([])
      return
    }

    setSmokeTests((data ?? []) as SmokeTest[])
  }

  async function loadEnhancements() {
    const { data, error } = await supabase
      .from('enhancement_requests')
      .select('id, status, priority')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(`Could not load enhancements: ${error.message}`)
      setEnhancements([])
      return
    }

    setEnhancements((data ?? []) as Enhancement[])
  }

  async function loadIssues() {
    const { data, error } = await supabase
      .from('issue_reports')
      .select('id, status')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(`Could not load issues: ${error.message}`)
      setIssues([])
      return
    }

    setIssues((data ?? []) as Issue[])
  }

  function percent(part: number, total: number) {
    if (!total) return '0%'
    return `${Math.round((part / total) * 100)}%`
  }

  function formatDateTime(value?: string | null) {
    if (!value) return '—'
    return new Date(value).toLocaleString()
  }

  const productionReleases = releases.filter((item) => item.status === 'production')
  const qaReleases = releases.filter((item) => item.status === 'qa')
  const archivedReleases = releases.filter((item) => item.status === 'archived')
  const plannedReleases = releases.filter((item) => item.status === 'planned')

  const productionDeployments = deployments.filter(
    (item) => item.environment === 'production'
  )
  const previewDeployments = deployments.filter(
    (item) => item.environment === 'preview'
  )
  const latestDeployment = deployments[0]

  const passedSmokeTests = smokeTests.filter((item) => item.test_status === 'pass')
  const failedSmokeTests = smokeTests.filter((item) => item.test_status === 'fail')
  const blockedSmokeTests = smokeTests.filter((item) => item.test_status === 'blocked')
  const pendingSmokeTests = smokeTests.filter((item) => item.test_status === 'pending')

  const openEnhancements = enhancements.filter((item) =>
    ['new', 'reviewed', 'planned', 'in_progress'].includes(item.status)
  )
  const highPriorityEnhancements = enhancements.filter(
    (item) => item.priority === 'high'
  )

  const openIssues = issues.filter((item) =>
    ['new', 'open', 'reviewed', 'enhancement_candidate'].includes(item.status)
  )
  const resolvedIssues = issues.filter((item) => item.status === 'resolved')

  const deploymentReadiness =
    smokeTests.length === 0
      ? 'No smoke tests recorded'
      : failedSmokeTests.length > 0
        ? 'Needs attention'
        : blockedSmokeTests.length > 0
          ? 'Blocked'
          : pendingSmokeTests.length > 0
            ? 'In progress'
            : 'Ready'

  const readinessClass =
    deploymentReadiness === 'Ready'
      ? 'bg-green-100 text-green-700'
      : deploymentReadiness === 'Needs attention'
        ? 'bg-red-100 text-red-700'
        : deploymentReadiness === 'Blocked'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-gray-100 text-secondary'

  if (loading) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8 text-primary">
          Loading...
        </main>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <HeaderBar />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8 text-primary">
          <h1 className="text-2xl font-bold text-primary">Access denied</h1>
          <p className="mt-2 text-secondary">
            You must be an admin to view analytics.
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 text-primary">
        <div className="mx-auto max-w-6xl space-y-6 px-3 py-5 sm:space-y-8 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary sm:text-3xl">
                Admin: Analytics
              </h1>
              <p className="mt-1 text-secondary">
                Operational reporting for releases, deployments, smoke tests,
                enhancements, and issue backlog.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href="/admin/releases" className={secondaryButton}>
                Releases
              </a>
              <a href="/admin" className={secondaryButton}>
                Back to admin
              </a>
            </div>
          </div>

          {message && (
            <div className="rounded-xl border border-gray-300 bg-white p-3 text-sm text-primary shadow-sm">
              {message}
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className={statCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Releases
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {releases.length}
              </p>
            </div>

            <div className={statCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Deployments
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {deployments.length}
              </p>
            </div>

            <div className={statCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Smoke pass rate
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {percent(passedSmokeTests.length, smokeTests.length)}
              </p>
            </div>

            <div className={statCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Readiness
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${readinessClass}`}
              >
                {deploymentReadiness}
              </span>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <section className={`${cardClass} space-y-4`}>
              <div>
                <h2 className="text-xl font-bold text-primary">
                  Release metrics
                </h2>
                <p className="text-sm text-secondary">
                  Version lifecycle and release status summary.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm text-secondary">Production</p>
                  <p className="text-2xl font-bold text-primary">
                    {productionReleases.length}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm text-secondary">QA</p>
                  <p className="text-2xl font-bold text-primary">
                    {qaReleases.length}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm text-secondary">Planned</p>
                  <p className="text-2xl font-bold text-primary">
                    {plannedReleases.length}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm text-secondary">Archived</p>
                  <p className="text-2xl font-bold text-primary">
                    {archivedReleases.length}
                  </p>
                </div>
              </div>
            </section>

            <section className={`${cardClass} space-y-4`}>
              <div>
                <h2 className="text-xl font-bold text-primary">
                  Deployment metrics
                </h2>
                <p className="text-sm text-secondary">
                  Environment activity and most recent deployment.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm text-secondary">Production</p>
                  <p className="text-2xl font-bold text-primary">
                    {productionDeployments.length}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm text-secondary">Preview</p>
                  <p className="text-2xl font-bold text-primary">
                    {previewDeployments.length}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-secondary">
                  Latest deployment
                </p>
                <p className="mt-1 text-sm text-primary">
                  {formatDateTime(latestDeployment?.deployed_at)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Environment: {latestDeployment?.environment ?? '—'}
                </p>
              </div>
            </section>
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-xl font-bold text-primary">
                Smoke test health
              </h2>
              <p className="text-sm text-secondary">
                Verification coverage and post-deployment readiness.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                ['Total', smokeTests.length],
                ['Pass', passedSmokeTests.length],
                ['Fail', failedSmokeTests.length],
                ['Blocked', blockedSmokeTests.length],
                ['Pending', pendingSmokeTests.length],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-gray-300 bg-gray-50 p-4"
                >
                  <p className="text-sm text-secondary">{label}</p>
                  <p className="text-2xl font-bold text-primary">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <section className={`${cardClass} space-y-4`}>
              <div>
                <h2 className="text-xl font-bold text-primary">
                  Enhancement backlog
                </h2>
                <p className="text-sm text-secondary">
                  Open enhancement work and priority signals.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm text-secondary">Open</p>
                  <p className="text-2xl font-bold text-primary">
                    {openEnhancements.length}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm text-secondary">High priority</p>
                  <p className="text-2xl font-bold text-primary">
                    {highPriorityEnhancements.length}
                  </p>
                </div>
              </div>
            </section>

            <section className={`${cardClass} space-y-4`}>
              <div>
                <h2 className="text-xl font-bold text-primary">
                  Issue backlog
                </h2>
                <p className="text-sm text-secondary">
                  User-reported issue status summary.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm text-secondary">Open</p>
                  <p className="text-2xl font-bold text-primary">
                    {openIssues.length}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm text-secondary">Resolved</p>
                  <p className="text-2xl font-bold text-primary">
                    {resolvedIssues.length}
                  </p>
                </div>
              </div>
            </section>
          </section>
        </div>
      </main>
    </>
  )
}