'use client'

import { useEffect, useState } from 'react'
import HeaderBar from '../components/HeaderBar'

type RoadmapItem = {
  id: string
  title: string
  description: string
  status: 'new' | 'reviewed' | 'planned' | 'in_progress' | 'resolved' | 'declined'
  priority: 'low' | 'medium' | 'high' | null
  created_at: string
  updated_at: string | null
  resolved_at: string | null
}

export default function RoadmapPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<RoadmapItem[]>([])

  useEffect(() => {
    async function loadRoadmap() {
      const response = await fetch('/api/public-roadmap')
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error ?? 'Could not load roadmap.')
        setLoading(false)
        return
      }

      setItems(result.roadmapItems ?? [])
      setLoading(false)
    }

    loadRoadmap()
  }, [])

  function statusClass(status: RoadmapItem['status']) {
    if (status === 'resolved') return 'bg-green-100 text-green-700'
    if (status === 'in_progress') return 'bg-purple-100 text-purple-700'
    if (status === 'planned') return 'bg-blue-100 text-blue-700'
    if (status === 'reviewed') return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-secondary'
  }

  function priorityClass(priority: RoadmapItem['priority']) {
    if (priority === 'high') return 'bg-red-100 text-red-700'
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-secondary'
  }

  function statusLabel(status: RoadmapItem['status']) {
    if (status === 'in_progress') return 'In progress'
    if (status === 'resolved') return 'Released'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  function RoadmapCard({ item }: { item: RoadmapItem }) {
    return (
      <article className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(
              item.status
            )}`}
          >
            {statusLabel(item.status)}
          </span>

          {item.priority && (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${priorityClass(
                item.priority
              )}`}
            >
              {item.priority} priority
            </span>
          )}
        </div>

        <h3 className="mt-3 text-lg font-bold text-primary">{item.title}</h3>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-secondary">
          {item.description}
        </p>
      </article>
    )
  }

  const plannedItems = items.filter((item) =>
    ['new', 'reviewed', 'planned'].includes(item.status)
  )

  const inProgressItems = items.filter((item) => item.status === 'in_progress')
  const releasedItems = items.filter((item) => item.status === 'resolved')

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 text-primary">
        <div className="mx-auto max-w-6xl space-y-6 px-3 py-5 sm:px-6 sm:py-8">
          <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">
              MFP Publication Agent
            </p>

            <h1 className="mt-2 text-3xl font-bold text-primary">
              Product Roadmap
            </h1>

            <p className="mt-2 max-w-3xl text-secondary">
              See user-visible improvements that are planned, in progress, or recently released.
            </p>
          </section>

          {message && (
            <div className="rounded-xl border border-gray-300 bg-white p-3 text-sm text-primary shadow-sm">
              {message}
            </div>
          )}

          {loading ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
              Loading roadmap...
            </section>
          ) : items.length === 0 ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-5 text-sm text-secondary shadow-sm">
              No public roadmap items are available yet.
            </section>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              <section className="space-y-3">
                <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
                  <h2 className="text-xl font-bold text-primary">Planned</h2>
                  <p className="text-sm text-secondary">
                    Ideas and improvements being reviewed or planned.
                  </p>
                </div>

                {plannedItems.length === 0 ? (
                  <p className="rounded-xl border border-gray-300 bg-white p-4 text-sm text-secondary">
                    No planned items.
                  </p>
                ) : (
                  plannedItems.map((item) => <RoadmapCard key={item.id} item={item} />)
                )}
              </section>

              <section className="space-y-3">
                <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
                  <h2 className="text-xl font-bold text-primary">In Progress</h2>
                  <p className="text-sm text-secondary">
                    Improvements currently being worked on.
                  </p>
                </div>

                {inProgressItems.length === 0 ? (
                  <p className="rounded-xl border border-gray-300 bg-white p-4 text-sm text-secondary">
                    No in-progress items.
                  </p>
                ) : (
                  inProgressItems.map((item) => (
                    <RoadmapCard key={item.id} item={item} />
                  ))
                )}
              </section>

              <section className="space-y-3">
                <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
                  <h2 className="text-xl font-bold text-primary">Released</h2>
                  <p className="text-sm text-secondary">
                    Improvements that have been completed.
                  </p>
                </div>

                {releasedItems.length === 0 ? (
                  <p className="rounded-xl border border-gray-300 bg-white p-4 text-sm text-secondary">
                    No released items.
                  </p>
                ) : (
                  releasedItems.map((item) => (
                    <RoadmapCard key={item.id} item={item} />
                  ))
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  )
}