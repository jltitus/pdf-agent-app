'use client'

import { useEffect, useState } from 'react'
import HeaderBar from '../../components/HeaderBar'
import { createClient } from '../../../lib/supabase/client'

type ReleaseStatus = 'planned' | 'development' | 'qa' | 'production' | 'archived'

type Release = {
  id: string
  version: string
  title: string | null
  description: string | null
  status: ReleaseStatus
  planned_release_date: string | null
  deployed_at: string | null
  created_at: string
  updated_at: string
}

type DeploymentHistory = {
  id: string
  release_id: string | null
  environment: string
  deployment_notes: string | null
  deployed_at: string
  releases?: {
    version?: string | null
    title?: string | null
    status?: string | null
  } | null
}

const statusOptions: ReleaseStatus[] = [
  'planned',
  'development',
  'qa',
  'production',
  'archived',
]

export default function AdminReleasesPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState('')

  const [releases, setReleases] = useState<Release[]>([])
  const [deployments, setDeployments] = useState<DeploymentHistory[]>([])

  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ReleaseStatus>('planned')
  const [plannedReleaseDate, setPlannedReleaseDate] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deploymentReleaseId, setDeploymentReleaseId] = useState('')
  const [deploymentEnvironment, setDeploymentEnvironment] = useState('production')
  const [deploymentNotes, setDeploymentNotes] = useState('')
  const [loggingDeployment, setLoggingDeployment] = useState(false)

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'Not set'

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary'
  const labelClass = 'mb-1 block text-sm font-semibold text-primary'
  const primaryButton =
    'rounded-lg bg-black px-4 py-2 text-sm font-semibold !text-white shadow-sm disabled:bg-gray-700 disabled:cursor-not-allowed'
  const secondaryButton =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-100 disabled:opacity-60'
  const smallButton =
    'rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-gray-100 disabled:opacity-60'
  const cardClass =
    'rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-6'

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

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function loadData() {
    await Promise.all([loadReleases(), loadDeployments()])
  }

  async function loadReleases() {
    const token = await getToken()

    if (!token) return

    const response = await fetch('/api/releases', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(result.error ?? 'Could not load releases.')
      return
    }

    setReleases(result.releases ?? [])
  }

  async function loadDeployments() {
    const token = await getToken()

    if (!token) return

    const response = await fetch('/api/deployment-history', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(result.error ?? 'Could not load deployment history.')
      return
    }

    setDeployments(result.deployments ?? [])
  }

  function resetReleaseForm() {
    setEditingId(null)
    setVersion('')
    setTitle('')
    setDescription('')
    setStatus('planned')
    setPlannedReleaseDate('')
  }

  function startEditRelease(release: Release) {
    setEditingId(release.id)
    setVersion(release.version)
    setTitle(release.title ?? '')
    setDescription(release.description ?? '')
    setStatus(release.status)
    setPlannedReleaseDate(
      release.planned_release_date
        ? release.planned_release_date.slice(0, 10)
        : ''
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveRelease(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage(editingId ? 'Updating release...' : 'Creating release...')

    try {
      const token = await getToken()

      if (!token) {
        setMessage('You must be signed in.')
        setSaving(false)
        return
      }

      const response = await fetch('/api/releases', {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          releaseId: editingId,
          version,
          title,
          description,
          status,
          plannedReleaseDate: plannedReleaseDate || null,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Release save failed.')
        setSaving(false)
        return
      }

      setMessage(editingId ? 'Release updated.' : 'Release created.')
      resetReleaseForm()
      setSaving(false)
      await loadReleases()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Release save failed.')
      setSaving(false)
    }
  }

  async function logDeployment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoggingDeployment(true)
    setMessage('Logging deployment...')

    try {
      const token = await getToken()

      if (!token) {
        setMessage('You must be signed in.')
        setLoggingDeployment(false)
        return
      }

      const response = await fetch('/api/deployment-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          releaseId: deploymentReleaseId,
          environment: deploymentEnvironment,
          deploymentNotes,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Deployment log failed.')
        setLoggingDeployment(false)
        return
      }

      setMessage('Deployment logged and release marked production.')
      setDeploymentReleaseId('')
      setDeploymentEnvironment('production')
      setDeploymentNotes('')
      setLoggingDeployment(false)
      await loadData()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Deployment log failed.')
      setLoggingDeployment(false)
    }
  }

  function formatDate(value?: string | null) {
    if (!value) return '—'
    return new Date(value).toLocaleDateString()
  }

  function formatDateTime(value?: string | null) {
    if (!value) return '—'
    return new Date(value).toLocaleString()
  }

  function getStatusClass(value: string) {
    if (value === 'production') return 'bg-green-100 text-green-700'
    if (value === 'qa') return 'bg-blue-100 text-blue-700'
    if (value === 'development') return 'bg-yellow-100 text-yellow-800'
    if (value === 'archived') return 'bg-gray-100 text-secondary'
    return 'bg-purple-100 text-purple-700'
  }

  const productionRelease = releases.find((release) => release.status === 'production')
  const plannedReleases = releases.filter((release) => release.status !== 'archived')
  const qaReleases = releases.filter((release) => release.status === 'qa')

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
            You must be an admin to manage releases.
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
                Admin: Releases
              </h1>
              <p className="mt-1 text-secondary">
                Plan app versions, track release status, and record production deployments.
              </p>
            </div>

            <a href="/admin" className={secondaryButton}>
              Back to admin
            </a>
          </div>

          {message && (
            <div className="rounded-xl border border-gray-300 bg-white p-3 text-sm text-primary shadow-sm">
              {message}
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                App version
              </p>
              <p className="mt-1 text-xl font-bold text-primary">{appVersion}</p>
            </div>

            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Production
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {productionRelease?.version ?? 'Not set'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Active releases
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {plannedReleases.length}
              </p>
            </div>

            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                QA releases
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {qaReleases.length}
              </p>
            </div>
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-xl font-bold text-primary">
                {editingId ? 'Edit release' : 'Create release'}
              </h2>
              <p className="text-sm text-secondary">
                Use releases to group enhancements, fixes, and production communication.
              </p>
            </div>

            <form onSubmit={saveRelease} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Version</label>
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="Example: 1.8.0"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReleaseStatus)}
                  className={inputClass}
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Release Management"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Planned release date</label>
                <input
                  type="date"
                  value={plannedReleaseDate}
                  onChange={(e) => setPlannedReleaseDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this release."
                  className="min-h-[96px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary"
                />
              </div>

              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button type="submit" disabled={saving} className={primaryButton}>
                  {saving ? 'Saving...' : editingId ? 'Save release' : 'Create release'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetReleaseForm}
                    disabled={saving}
                    className={secondaryButton}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-xl font-bold text-primary">Release list</h2>
              <p className="text-sm text-secondary">
                Current and planned app versions.
              </p>
            </div>

            {releases.length === 0 ? (
              <p className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm text-secondary">
                No releases yet. Create your first release above.
              </p>
            ) : (
              <div className="grid gap-3">
                {releases.map((release) => (
                  <article
                    key={release.id}
                    className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-primary">
                            v{release.version}
                          </h3>

                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClass(
                              release.status
                            )}`}
                          >
                            {release.status}
                          </span>
                        </div>

                        <p className="mt-1 font-semibold text-secondary">
                          {release.title || 'Untitled release'}
                        </p>

                        {release.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">
                            {release.description}
                          </p>
                        )}

                        <div className="mt-3 grid gap-1 text-xs text-muted md:grid-cols-3">
                          <p>
                            <strong>Planned:</strong>{' '}
                            {formatDate(release.planned_release_date)}
                          </p>
                          <p>
                            <strong>Deployed:</strong>{' '}
                            {formatDate(release.deployed_at)}
                          </p>
                          <p>
                            <strong>Updated:</strong>{' '}
                            {formatDate(release.updated_at)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => startEditRelease(release)}
                        className={smallButton}
                      >
                        Edit
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-xl font-bold text-primary">Log deployment</h2>
              <p className="text-sm text-secondary">
                Record a production deployment after Vercel is confirmed.
              </p>
            </div>

            <form onSubmit={logDeployment} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Release</label>
                <select
                  value={deploymentReleaseId}
                  onChange={(e) => setDeploymentReleaseId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select release</option>
                  {releases.map((release) => (
                    <option key={release.id} value={release.id}>
                      v{release.version} — {release.title || release.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Environment</label>
                <select
                  value={deploymentEnvironment}
                  onChange={(e) => setDeploymentEnvironment(e.target.value)}
                  className={inputClass}
                >
                  <option value="production">production</option>
                  <option value="preview">preview</option>
                  <option value="local">local</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Deployment notes</label>
                <textarea
                  value={deploymentNotes}
                  onChange={(e) => setDeploymentNotes(e.target.value)}
                  placeholder="Example: Vercel deployed successfully. Smoke test passed on admin releases page."
                  className="min-h-[96px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loggingDeployment}
                  className={primaryButton}
                >
                  {loggingDeployment ? 'Logging...' : 'Log deployment'}
                </button>
              </div>
            </form>
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-xl font-bold text-primary">Deployment history</h2>
              <p className="text-sm text-secondary">
                Production and preview release history.
              </p>
            </div>

            {deployments.length === 0 ? (
              <p className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm text-secondary">
                No deployments logged yet.
              </p>
            ) : (
              <div className="grid gap-3">
                {deployments.map((deployment) => (
                  <article
                    key={deployment.id}
                    className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-primary">
                            v{deployment.releases?.version || 'Unknown release'}
                          </h3>
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                            {deployment.environment}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-secondary">
                          {deployment.releases?.title || 'No release title'}
                        </p>

                        {deployment.deployment_notes && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">
                            {deployment.deployment_notes}
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-muted">
                        {formatDateTime(deployment.deployed_at)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}