'use client'

import { useEffect, useState } from 'react'
import HeaderBar from '../components/HeaderBar'

type Release = {
  id: string
  version: string
  title: string | null
  description: string | null
  status: string
  planned_release_date: string | null
  deployed_at: string | null
  updated_at: string
}

export default function WhatsNewPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [releases, setReleases] = useState<Release[]>([])

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'Not set'

  useEffect(() => {
    async function loadReleases() {
      const response = await fetch('/api/public-releases')
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not load release notes.')
        setLoading(false)
        return
      }

      setReleases(result.releases ?? [])
      setLoading(false)
    }

    loadReleases()
  }, [])

  function formatDate(value?: string | null) {
    if (!value) return 'Not deployed yet'
    return new Date(value).toLocaleDateString()
  }

  const latestRelease = releases[0]

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 text-primary">
        <div className="mx-auto max-w-5xl space-y-6 px-3 py-5 sm:px-6 sm:py-8">
          <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">
              MFP Publication Agent
            </p>

            <h1 className="mt-2 text-3xl font-bold text-primary">
              What’s New
            </h1>

            <p className="mt-2 text-secondary">
              See recent app updates, improvements, fixes, and the current production version.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Current app version
                </p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {appVersion}
                </p>
              </div>

              <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Latest production release
                </p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {latestRelease ? `v${latestRelease.version}` : 'Not available'}
                </p>
              </div>
            </div>
          </section>

          {message && (
            <div className="rounded-xl border border-gray-300 bg-white p-3 text-sm text-primary shadow-sm">
              {message}
            </div>
          )}

          <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-primary">
              Release notes
            </h2>

            {loading ? (
              <p className="mt-3 text-sm text-secondary">Loading release notes...</p>
            ) : releases.length === 0 ? (
              <p className="mt-3 rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm text-secondary">
                No published release notes are available yet.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {releases.map((release) => (
                  <article
                    key={release.id}
                    className="rounded-2xl border border-gray-300 bg-gray-50 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-primary">
                            v{release.version}
                          </h3>

                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                            {release.status}
                          </span>
                        </div>

                        <p className="mt-1 font-semibold text-secondary">
                          {release.title || 'Release update'}
                        </p>
                      </div>

                      <p className="text-xs text-muted">
                        {formatDate(release.deployed_at)}
                      </p>
                    </div>

                    {release.description ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-secondary">
                        {release.description}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-muted">
                        No release notes were added for this version.
                      </p>
                    )}
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