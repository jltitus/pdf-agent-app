'use client'

import { useEffect, useState } from 'react'
import HeaderBar from '../../components/HeaderBar'
import { createClient } from '../../../lib/supabase/client'

type ReleaseStatus = 'planned' | 'development' | 'qa' | 'production' | 'archived'
type SmokeStatus = 'pending' | 'pass' | 'fail' | 'blocked'

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

type SmokeTest = {
  id: string
  deployment_id: string
  route_path: string
  test_status: SmokeStatus
  notes: string | null
  tested_by: string | null
  tested_at: string | null
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

type EnhancementRequest = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string | null
  category: string | null
  release_status: string | null
  created_at: string
}

type IssueReport = {
  id: string
  issue_type: string
  description: string
  related_question: string | null
  status: string
  user_email: string | null
  created_at: string
}

type ReleaseItem = {
  id: string
  release_id: string
  enhancement_request_id: string | null
  issue_report_id: string | null
  item_type: 'enhancement' | 'issue'
  created_at: string
  enhancement_requests?: EnhancementRequest | null
  issue_reports?: IssueReport | null
}

const statusOptions: ReleaseStatus[] = [
  'planned',
  'development',
  'qa',
  'production',
  'archived',
]

const standardSmokeTestRoutes = [
  '/dashboard',
  '/chat',
  '/publications',
  '/whats-new',
  '/admin',
  '/admin/releases',
]

export default function AdminReleasesPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState('')

  const [releases, setReleases] = useState<Release[]>([])
  const [deployments, setDeployments] = useState<DeploymentHistory[]>([])
  const [releaseItems, setReleaseItems] = useState<ReleaseItem[]>([])
  const [enhancements, setEnhancements] = useState<EnhancementRequest[]>([])
  const [issues, setIssues] = useState<IssueReport[]>([])
  const [smokeTests, setSmokeTests] = useState<SmokeTest[]>([])

  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ReleaseStatus>('planned')
  const [plannedReleaseDate, setPlannedReleaseDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingReleaseId, setDeletingReleaseId] = useState<string | null>(null)

  const [selectedReleaseId, setSelectedReleaseId] = useState('')
  const [addingItemId, setAddingItemId] = useState<string | null>(null)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  const [deploymentReleaseId, setDeploymentReleaseId] = useState('')
  const [deploymentEnvironment, setDeploymentEnvironment] = useState('production')
  const [deploymentNotes, setDeploymentNotes] = useState('')
  const [loggingDeployment, setLoggingDeployment] = useState(false)

  const [editingDeploymentId, setEditingDeploymentId] = useState<string | null>(null)
  const [editDeploymentEnvironment, setEditDeploymentEnvironment] = useState('production')
  const [editDeploymentNotes, setEditDeploymentNotes] = useState('')
  const [savingDeploymentId, setSavingDeploymentId] = useState<string | null>(null)
  const [deletingDeploymentId, setDeletingDeploymentId] = useState<string | null>(null)

  const [smokeDeploymentId, setSmokeDeploymentId] = useState('')
  const [smokeRoutePath, setSmokeRoutePath] = useState('/admin/releases')
  const [smokeStatus, setSmokeStatus] = useState<SmokeStatus>('pending')
  const [smokeNotes, setSmokeNotes] = useState('')
  const [savingSmokeTest, setSavingSmokeTest] = useState(false)
  const [updatingSmokeTestId, setUpdatingSmokeTestId] = useState<string | null>(null)
  const [deletingSmokeTestId, setDeletingSmokeTestId] = useState<string | null>(null)
  const [standardizingDeploymentId, setStandardizingDeploymentId] = useState<string | null>(null)

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'Not set'

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary'
  const labelClass = 'mb-1 block text-sm font-semibold text-primary'
  const primaryButton = 'rounded-lg bg-black px-4 py-2 text-sm font-semibold !text-white shadow-sm disabled:bg-gray-700 disabled:cursor-not-allowed'
  const secondaryButton = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-100 disabled:opacity-60'
  const smallButton = 'rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-gray-100 disabled:opacity-60'
  const cardClass = 'rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-6'

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
    await Promise.all([
      loadReleases(),
      loadDeployments(),
      loadReleaseItems(),
      loadEnhancements(),
      loadIssues(),
      loadSmokeTests(),
    ])
  }

  async function loadReleases() {
    const token = await getToken()
    if (!token) return

    const response = await fetch('/api/releases', {
      headers: { Authorization: `Bearer ${token}` },
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
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(result.error ?? 'Could not load deployment history.')
      return
    }

    setDeployments(result.deployments ?? [])
  }

  async function loadReleaseItems() {
    const token = await getToken()
    if (!token) return

    const response = await fetch('/api/release-items', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(result.error ?? 'Could not load release items.')
      return
    }

    setReleaseItems(result.releaseItems ?? [])
  }

  async function loadEnhancements() {
    const token = await getToken()

    if (!token) {
      setEnhancements([])
      return
    }

    const response = await fetch('/api/enhancement-requests?status=all', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(result.error ?? 'Could not load enhancements.')
      setEnhancements([])
      return
    }

    setEnhancements(
      (result.enhancements ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? null,
        status: item.status ?? 'new',
        priority: item.priority ?? 'medium',
        category: null,
        release_status: null,
        created_at: item.created_at,
      }))
    )
  }

  async function loadIssues() {
    const { data, error } = await supabase
      .from('issue_reports')
      .select('id, issue_type, description, related_question, status, user_email, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      setIssues([])
      return
    }

    setIssues((data ?? []) as IssueReport[])
  }

  async function loadSmokeTests() {
    const token = await getToken()
    if (!token) return

    const response = await fetch('/api/deployment-smoke-tests', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(result.error ?? 'Could not load smoke tests.')
      return
    }

    setSmokeTests(result.smokeTests ?? [])
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
      release.planned_release_date ? release.planned_release_date.slice(0, 10) : ''
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

  async function deleteOrArchiveRelease(release: Release) {
    const confirmed = window.confirm(
      `Remove v${release.version}? If this release has deployment history, it will be archived instead of deleted.`
    )
    if (!confirmed) return

    const secondConfirm = window.confirm(
      'Are you sure? This action cannot be undone for releases that have not been deployed.'
    )
    if (!secondConfirm) return

    setDeletingReleaseId(release.id)
    setMessage('Removing release...')

    try {
      const token = await getToken()
      if (!token) {
        setMessage('You must be signed in.')
        setDeletingReleaseId(null)
        return
      }

      const response = await fetch('/api/releases', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ releaseId: release.id }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not remove release.')
        setDeletingReleaseId(null)
        return
      }

      setMessage(result.message ?? 'Release removed.')
      setDeletingReleaseId(null)
      await loadData()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not remove release.')
      setDeletingReleaseId(null)
    }
  }

  async function addItemToRelease(
    releaseId: string,
    itemType: 'enhancement' | 'issue',
    itemId: string
  ) {
    setAddingItemId(itemId)
    setMessage('Adding item to release...')

    try {
      const token = await getToken()
      if (!token) {
        setMessage('You must be signed in.')
        setAddingItemId(null)
        return
      }

      const response = await fetch('/api/release-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          releaseId,
          itemType,
          enhancementRequestId: itemType === 'enhancement' ? itemId : null,
          issueReportId: itemType === 'issue' ? itemId : null,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not add item to release.')
        setAddingItemId(null)
        return
      }

      setMessage('Item added to release.')
      setAddingItemId(null)
      await loadData()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not add item.')
      setAddingItemId(null)
    }
  }

  async function removeItemFromRelease(releaseItemId: string) {
    const confirmed = window.confirm('Remove this item from the release?')
    if (!confirmed) return

    setRemovingItemId(releaseItemId)
    setMessage('Removing item from release...')

    try {
      const token = await getToken()
      if (!token) {
        setMessage('You must be signed in.')
        setRemovingItemId(null)
        return
      }

      const response = await fetch('/api/release-items', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ releaseItemId }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not remove release item.')
        setRemovingItemId(null)
        return
      }

      setMessage('Item removed from release.')
      setRemovingItemId(null)
      await loadData()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not remove item.')
      setRemovingItemId(null)
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

  function startEditDeployment(deployment: DeploymentHistory) {
    setEditingDeploymentId(deployment.id)
    setEditDeploymentEnvironment(deployment.environment)
    setEditDeploymentNotes(deployment.deployment_notes || '')
  }

  function cancelEditDeployment() {
    setEditingDeploymentId(null)
    setEditDeploymentEnvironment('production')
    setEditDeploymentNotes('')
  }

  async function saveDeployment(deploymentId: string) {
    setSavingDeploymentId(deploymentId)
    setMessage('Updating deployment history...')

    try {
      const token = await getToken()
      if (!token) {
        setMessage('You must be signed in.')
        setSavingDeploymentId(null)
        return
      }

      const response = await fetch('/api/deployment-history', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deploymentId,
          environment: editDeploymentEnvironment,
          deploymentNotes: editDeploymentNotes,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not update deployment.')
        setSavingDeploymentId(null)
        return
      }

      setMessage('Deployment updated.')
      setSavingDeploymentId(null)
      cancelEditDeployment()
      await loadDeployments()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not update deployment.')
      setSavingDeploymentId(null)
    }
  }

  async function deleteDeployment(deploymentId: string) {
    const confirmed = window.confirm('Delete this deployment history entry?')
    if (!confirmed) return

    setDeletingDeploymentId(deploymentId)
    setMessage('Deleting deployment history...')

    try {
      const token = await getToken()
      if (!token) {
        setMessage('You must be signed in.')
        setDeletingDeploymentId(null)
        return
      }

      const response = await fetch('/api/deployment-history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deploymentId }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not delete deployment.')
        setDeletingDeploymentId(null)
        return
      }

      setMessage('Deployment history deleted.')
      setDeletingDeploymentId(null)
      await loadData()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not delete deployment.')
      setDeletingDeploymentId(null)
    }
  }

  async function addSmokeTest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSavingSmokeTest(true)
    setMessage('Adding smoke test...')

    try {
      const token = await getToken()
      if (!token) {
        setMessage('You must be signed in.')
        setSavingSmokeTest(false)
        return
      }

      const response = await fetch('/api/deployment-smoke-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deploymentId: smokeDeploymentId,
          routePath: smokeRoutePath,
          testStatus: smokeStatus,
          notes: smokeNotes,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not add smoke test.')
        setSavingSmokeTest(false)
        return
      }

      setMessage('Smoke test added.')
      setSmokeRoutePath('/admin/releases')
      setSmokeStatus('pending')
      setSmokeNotes('')
      setSavingSmokeTest(false)
      await loadSmokeTests()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not add smoke test.')
      setSavingSmokeTest(false)
    }
  }

  async function createStandardSmokeTests(deploymentId: string) {
    setStandardizingDeploymentId(deploymentId)
    setSavingSmokeTest(true)
    setMessage('Creating standard smoke tests...')

    try {
      const token = await getToken()
      if (!token) {
        setMessage('You must be signed in.')
        setStandardizingDeploymentId(null)
        setSavingSmokeTest(false)
        return
      }

      const existingRoutes = smokeTests
        .filter((test) => test.deployment_id === deploymentId)
        .map((test) => test.route_path)

      const routesToCreate = standardSmokeTestRoutes.filter(
        (route) => !existingRoutes.includes(route)
      )

      if (routesToCreate.length === 0) {
        setMessage('All standard smoke tests already exist for this deployment.')
        setStandardizingDeploymentId(null)
        setSavingSmokeTest(false)
        return
      }

      const response = await fetch('/api/deployment-smoke-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deploymentId,
          routes: routesToCreate,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not create smoke tests.')
        setStandardizingDeploymentId(null)
        setSavingSmokeTest(false)
        return
      }

      setMessage('Standard smoke tests created.')
      setStandardizingDeploymentId(null)
      setSavingSmokeTest(false)
      await loadSmokeTests()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not create standard smoke tests.')
      setStandardizingDeploymentId(null)
      setSavingSmokeTest(false)
    }
  }

  async function updateSmokeTestStatus(smokeTest: SmokeTest, testStatus: SmokeStatus) {
    setUpdatingSmokeTestId(smokeTest.id)
    setMessage('Updating smoke test...')

    try {
      const token = await getToken()
      if (!token) {
        setMessage('You must be signed in.')
        setUpdatingSmokeTestId(null)
        return
      }

      const response = await fetch('/api/deployment-smoke-tests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          smokeTestId: smokeTest.id,
          routePath: smokeTest.route_path,
          testStatus,
          notes: smokeTest.notes,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not update smoke test.')
        setUpdatingSmokeTestId(null)
        return
      }

      setMessage('Smoke test updated.')
      setUpdatingSmokeTestId(null)
      await loadSmokeTests()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not update smoke test.')
      setUpdatingSmokeTestId(null)
    }
  }

  async function deleteSmokeTest(smokeTestId: string) {
    const confirmed = window.confirm('Delete this smoke test?')
    if (!confirmed) return

    setDeletingSmokeTestId(smokeTestId)
    setMessage('Deleting smoke test...')

    try {
      const token = await getToken()
      if (!token) {
        setMessage('You must be signed in.')
        setDeletingSmokeTestId(null)
        return
      }

      const response = await fetch('/api/deployment-smoke-tests', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ smokeTestId }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not delete smoke test.')
        setDeletingSmokeTestId(null)
        return
      }

      setMessage('Smoke test deleted.')
      setDeletingSmokeTestId(null)
      await loadSmokeTests()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not delete smoke test.')
      setDeletingSmokeTestId(null)
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

  function getSmokeStatusClass(status: string) {
    if (status === 'pass') return 'bg-green-100 text-green-700'
    if (status === 'fail') return 'bg-red-100 text-red-700'
    if (status === 'blocked') return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-secondary'
  }

  function getDeploymentSmokeSummary(deploymentId: string) {
    const tests = smokeTests.filter((test) => test.deployment_id === deploymentId)
    return {
      total: tests.length,
      pass: tests.filter((test) => test.test_status === 'pass').length,
      fail: tests.filter((test) => test.test_status === 'fail').length,
      blocked: tests.filter((test) => test.test_status === 'blocked').length,
      pending: tests.filter((test) => test.test_status === 'pending').length,
    }
  }

  function getDeploymentReadinessClass(deploymentId: string) {
    const summary = getDeploymentSmokeSummary(deploymentId)
    if (summary.total === 0) return 'bg-gray-100 text-secondary'
    if (summary.fail > 0) return 'bg-red-100 text-red-700'
    if (summary.blocked > 0) return 'bg-yellow-100 text-yellow-800'
    if (summary.pending > 0) return 'bg-blue-100 text-blue-700'
    return 'bg-green-100 text-green-700'
  }

  function getDeploymentReadinessLabel(deploymentId: string) {
    const summary = getDeploymentSmokeSummary(deploymentId)
    if (summary.total === 0) return 'No smoke tests'
    if (summary.fail > 0) return 'Needs attention'
    if (summary.blocked > 0) return 'Blocked'
    if (summary.pending > 0) return 'In progress'
    return 'Ready'
  }

  const productionRelease = releases.find((release) => release.status === 'production')
  const activeReleases = releases.filter((release) => release.status !== 'archived')
  const qaReleases = releases.filter((release) => release.status === 'qa')
  const selectedRelease = releases.find((release) => release.id === selectedReleaseId)
  const selectedReleaseItems = selectedReleaseId
    ? releaseItems.filter((item) => item.release_id === selectedReleaseId)
    : []

  const attachedEnhancementIds = new Set(
    releaseItems.map((item) => item.enhancement_request_id).filter(Boolean)
  )

  const attachedIssueIds = new Set(
    releaseItems.map((item) => item.issue_report_id).filter(Boolean)
  )

  const availableEnhancements = enhancements
  const availableIssues = issues.filter(
    (item) =>
      !attachedIssueIds.has(item.id) &&
      ['new', 'reviewed', 'enhancement_candidate', 'open'].includes(item.status)
  )

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
          <p className="mt-2 text-secondary">You must be an admin to manage releases.</p>
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
              <h1 className="text-2xl font-bold text-primary sm:text-3xl">Admin: Releases</h1>
              <p className="mt-1 text-secondary">
                Plan app versions, attach enhancements and issue fixes, and record production deployments.
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
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">App version</p>
              <p className="mt-1 text-xl font-bold text-primary">{appVersion}</p>
            </div>

            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Production</p>
              <p className="mt-1 text-xl font-bold text-primary">
                {productionRelease?.version ?? 'Not set'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Active releases</p>
              <p className="mt-1 text-xl font-bold text-primary">{activeReleases.length}</p>
            </div>

            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">QA releases</p>
              <p className="mt-1 text-xl font-bold text-primary">{qaReleases.length}</p>
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
                    <option key={option} value={option}>{option}</option>
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
                  <button type="button" onClick={resetReleaseForm} disabled={saving} className={secondaryButton}>
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-xl font-bold text-primary">Release list</h2>
              <p className="text-sm text-secondary">Current and planned app versions.</p>
            </div>

            {releases.length === 0 ? (
              <p className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm text-secondary">
                No releases yet. Create your first release above.
              </p>
            ) : (
              <div className="grid gap-3">
                {releases.map((release) => (
                  <article key={release.id} className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-primary">v{release.version}</h3>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClass(release.status)}`}>
                            {release.status}
                          </span>
                        </div>

                        <p className="mt-1 font-semibold text-secondary">{release.title || 'Untitled release'}</p>

                        {release.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">{release.description}</p>
                        )}

                        <div className="mt-3 grid gap-1 text-xs text-muted md:grid-cols-3">
                          <p><strong>Planned:</strong> {formatDate(release.planned_release_date)}</p>
                          <p><strong>Deployed:</strong> {formatDate(release.deployed_at)}</p>
                          <p><strong>Updated:</strong> {formatDate(release.updated_at)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEditRelease(release)} className={smallButton}>
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteOrArchiveRelease(release)}
                          disabled={deletingReleaseId === release.id}
                          className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingReleaseId === release.id ? 'Removing...' : 'Delete / Archive'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-xl font-bold text-primary">Release planning</h2>
              <p className="text-sm text-secondary">Attach enhancements and issue fixes to a planned release.</p>
            </div>

            <div>
              <label className={labelClass}>Choose release to plan</label>
              <select
                value={selectedReleaseId}
                onChange={(e) => setSelectedReleaseId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select release</option>
                {releases
                  .filter((release) => release.status !== 'archived')
                  .map((release) => (
                    <option key={release.id} value={release.id}>
                      v{release.version} — {release.title || release.status}
                    </option>
                  ))}
              </select>
            </div>

            {!selectedRelease ? (
              <p className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm text-secondary">
                Select a release to view and assign work items.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h3 className="font-bold text-primary">Planning v{selectedRelease.version}</h3>
                  <p className="text-sm text-secondary">{selectedRelease.title || 'Untitled release'}</p>
                  <p className="mt-1 text-xs text-muted">{selectedReleaseItems.length} item(s) currently included</p>
                </div>

                <section className="rounded-2xl border border-gray-300 bg-white p-4">
                  <h3 className="font-bold text-primary">Included in this release</h3>

                  {selectedReleaseItems.length === 0 ? (
                    <p className="mt-3 text-sm text-secondary">No enhancements or issues have been added yet.</p>
                  ) : (
                    <div className="mt-3 grid gap-3">
                      {selectedReleaseItems.map((item) => {
                        const enhancement = item.enhancement_requests
                        const issue = item.issue_reports

                        return (
                          <article key={item.id} className="rounded-xl border border-gray-300 bg-gray-50 p-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-secondary">
                                  {item.item_type}
                                </span>

                                {enhancement && (
                                  <>
                                    <h4 className="mt-2 font-semibold text-primary">{enhancement.title}</h4>
                                    <p className="mt-1 text-sm text-secondary">{enhancement.description || 'No description'}</p>
                                    <p className="mt-2 text-xs text-muted">
                                      Priority: {enhancement.priority || 'medium'}
                                      {enhancement.category ? ` • ${enhancement.category}` : ''}
                                      {enhancement.release_status ? ` • ${enhancement.release_status}` : ''}
                                    </p>
                                  </>
                                )}

                                {issue && (
                                  <>
                                    <h4 className="mt-2 font-semibold text-primary">{issue.issue_type}</h4>
                                    <p className="mt-1 text-sm text-secondary">{issue.description}</p>
                                    {issue.related_question && (
                                      <p className="mt-2 text-xs text-muted">Related question: {issue.related_question}</p>
                                    )}
                                  </>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => removeItemFromRelease(item.id)}
                                disabled={removingItemId === item.id}
                                className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                              >
                                {removingItemId === item.id ? 'Removing...' : 'Remove'}
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-300 bg-white p-4">
                    <h3 className="font-bold text-primary">Available enhancements</h3>
                    <p className="text-sm text-secondary">Add approved or upcoming enhancements to this release.</p>

                    {availableEnhancements.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm text-secondary">
                        No available enhancements.
                      </p>
                    ) : (
                      <div className="mt-3 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                        {availableEnhancements.map((item) => (
                          <article key={item.id} className="rounded-xl border border-gray-300 bg-gray-50 p-3">
                            <h4 className="font-semibold text-primary">{item.title}</h4>
                            <p className="mt-1 line-clamp-3 text-sm text-secondary">{item.description || 'No description'}</p>
                            <p className="mt-2 text-xs text-muted">
                              Priority: {item.priority || 'medium'}
                              {item.category ? ` • ${item.category}` : ''}
                              {item.status ? ` • ${item.status}` : ''}
                            </p>

                            {attachedEnhancementIds.has(item.id) ? (
                              <span className="mt-3 inline-flex rounded-full bg-yellow-100 px-3 py-2 text-xs font-semibold text-yellow-800">
                                Already scheduled in a release
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addItemToRelease(selectedRelease.id, 'enhancement', item.id)}
                                disabled={addingItemId === item.id}
                                className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-100 disabled:opacity-60"
                              >
                                {addingItemId === item.id ? 'Adding...' : 'Add to release'}
                              </button>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-300 bg-white p-4">
                    <h3 className="font-bold text-primary">Available issues</h3>
                    <p className="text-sm text-secondary">Add issue fixes or bug reports to this release.</p>

                    {availableIssues.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm text-secondary">
                        No available issues.
                      </p>
                    ) : (
                      <div className="mt-3 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                        {availableIssues.map((item) => (
                          <article key={item.id} className="rounded-xl border border-gray-300 bg-gray-50 p-3">
                            <h4 className="font-semibold text-primary">{item.issue_type}</h4>
                            <p className="mt-1 line-clamp-3 text-sm text-secondary">{item.description}</p>
                            <p className="mt-2 text-xs text-muted">
                              Status: {item.status}{item.user_email ? ` • ${item.user_email}` : ''}
                            </p>

                            <button
                              type="button"
                              onClick={() => addItemToRelease(selectedRelease.id, 'issue', item.id)}
                              disabled={addingItemId === item.id}
                              className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-100 disabled:opacity-60"
                            >
                              {addingItemId === item.id ? 'Adding...' : 'Add to release'}
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-xl font-bold text-primary">Log deployment</h2>
              <p className="text-sm text-secondary">Record a production deployment after Vercel is confirmed.</p>
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
                <button type="submit" disabled={loggingDeployment} className={primaryButton}>
                  {loggingDeployment ? 'Logging...' : 'Log deployment'}
                </button>
              </div>
            </form>
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-xl font-bold text-primary">Deployment smoke tests</h2>
              <p className="text-sm text-secondary">
                Add a single custom verification check, or use the standard template from a deployment card.
              </p>
            </div>

            <form onSubmit={addSmokeTest} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Deployment</label>
                <select
                  value={smokeDeploymentId}
                  onChange={(e) => setSmokeDeploymentId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select deployment</option>
                  {deployments.map((deployment) => (
                    <option key={deployment.id} value={deployment.id}>
                      v{deployment.releases?.version || 'Unknown'} — {formatDateTime(deployment.deployed_at)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Route / page tested</label>
                <input
                  value={smokeRoutePath}
                  onChange={(e) => setSmokeRoutePath(e.target.value)}
                  placeholder="/admin/releases"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={smokeStatus}
                  onChange={(e) => setSmokeStatus(e.target.value as SmokeStatus)}
                  className={inputClass}
                >
                  <option value="pending">pending</option>
                  <option value="pass">pass</option>
                  <option value="fail">fail</option>
                  <option value="blocked">blocked</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Notes</label>
                <textarea
                  value={smokeNotes}
                  onChange={(e) => setSmokeNotes(e.target.value)}
                  placeholder="Example: Page loaded, release list displayed, edit/delete controls worked."
                  className="min-h-[96px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary"
                />
              </div>

              <div className="md:col-span-2">
                <button type="submit" disabled={savingSmokeTest} className={primaryButton}>
                  {savingSmokeTest ? 'Saving...' : 'Add custom smoke test'}
                </button>
              </div>
            </form>
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-xl font-bold text-primary">Deployment history</h2>
              <p className="text-sm text-secondary">Production and preview release history.</p>
            </div>

            {deployments.length === 0 ? (
              <p className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm text-secondary">
                No deployments logged yet.
              </p>
            ) : (
              <div className="grid gap-3">
                {deployments.map((deployment) => {
                  const deploymentSmokeTests = smokeTests.filter((test) => test.deployment_id === deployment.id)
                  const summary = getDeploymentSmokeSummary(deployment.id)

                  return (
                    <article key={deployment.id} className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-primary">
                              v{deployment.releases?.version || 'Unknown release'}
                            </h3>

                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                              {deployment.environment}
                            </span>

                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getDeploymentReadinessClass(deployment.id)}`}>
                              {getDeploymentReadinessLabel(deployment.id)}
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

                          <p className="mt-2 text-xs text-muted">
                            Deployed: {formatDateTime(deployment.deployed_at)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                            <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-1">Total: {summary.total}</span>
                            <span className="rounded-full border border-green-300 bg-green-50 px-2 py-1 text-green-700">Pass: {summary.pass}</span>
                            <span className="rounded-full border border-red-300 bg-red-50 px-2 py-1 text-red-700">Fail: {summary.fail}</span>
                            <span className="rounded-full border border-yellow-300 bg-yellow-50 px-2 py-1 text-yellow-800">Blocked: {summary.blocked}</span>
                            <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-1 text-blue-700">Pending: {summary.pending}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => createStandardSmokeTests(deployment.id)}
                            disabled={standardizingDeploymentId === deployment.id || savingSmokeTest}
                            className={smallButton}
                          >
                            {standardizingDeploymentId === deployment.id
                              ? 'Creating...'
                              : 'Create standard smoke tests'}
                          </button>

                          <button type="button" onClick={() => startEditDeployment(deployment)} className={smallButton}>
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteDeployment(deployment.id)}
                            disabled={deletingDeploymentId === deployment.id}
                            className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingDeploymentId === deployment.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      {editingDeploymentId === deployment.id && (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className={labelClass}>Environment</label>
                              <select
                                value={editDeploymentEnvironment}
                                onChange={(e) => setEditDeploymentEnvironment(e.target.value)}
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
                                value={editDeploymentNotes}
                                onChange={(e) => setEditDeploymentNotes(e.target.value)}
                                className="min-h-[96px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary"
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => saveDeployment(deployment.id)}
                              disabled={savingDeploymentId === deployment.id}
                              className={primaryButton}
                            >
                              {savingDeploymentId === deployment.id ? 'Saving...' : 'Save changes'}
                            </button>

                            <button type="button" onClick={cancelEditDeployment} className={secondaryButton}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {deploymentSmokeTests.length > 0 && (
                        <div className="mt-4 rounded-xl border border-gray-300 bg-gray-50 p-4">
                          <h4 className="font-semibold text-primary">Smoke tests</h4>

                          <div className="mt-3 space-y-2">
                            {deploymentSmokeTests.map((test) => (
                              <div key={test.id} className="rounded-xl border border-gray-300 bg-white p-3">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-semibold text-primary">{test.route_path}</p>
                                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getSmokeStatusClass(test.test_status)}`}>
                                        {test.test_status}
                                      </span>
                                    </div>

                                    {test.notes && (
                                      <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">{test.notes}</p>
                                    )}

                                    <p className="mt-2 text-xs text-muted">Tested: {formatDateTime(test.tested_at)}</p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {(['pending', 'pass', 'fail', 'blocked'] as const).map((statusValue) => (
                                      <button
                                        key={statusValue}
                                        type="button"
                                        onClick={() => updateSmokeTestStatus(test, statusValue)}
                                        disabled={updatingSmokeTestId === test.id}
                                        className={smallButton}
                                      >
                                        {statusValue}
                                      </button>
                                    ))}

                                    <button
                                      type="button"
                                      onClick={() => deleteSmokeTest(test.id)}
                                      disabled={deletingSmokeTestId === test.id}
                                      className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                                    >
                                      {deletingSmokeTestId === test.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
