'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

// ---- shared data ----
const TOPICS = [
  { id: 'food-safety', name: 'Food Safety', color: '#D32F2F' },
  { id: 'canning-fruits', name: 'Canning Fruits', color: '#F57C00' },
  { id: 'canning-tomatoes-salsas', name: 'Canning Tomatoes & Salsas', color: '#E64A19' },
  { id: 'low-acid-foods', name: 'Low Acid Foods', color: '#7B1FA2' },
  { id: 'pickling', name: 'Pickling', color: '#388E3C' },
  { id: 'jams-jellies', name: 'Jams & Jellies', color: '#C2185B' },
  { id: 'freezing-cold-storage', name: 'Freezing & Cold Storage', color: '#1976D2' },
  { id: 'dehydrating-smoking', name: 'Dehydrating & Smoking', color: '#5D4037' },
]
const TIERS = [
  { id: 'kids', label: 'Kids' },
  { id: 'tweens', label: 'Tweens' },
  { id: 'teens', label: 'Teens' },
  { id: 'adults', label: 'Adults' },
]

const EFFORT_CLS: Record<string, string> = {
  'Grab & go': 'bg-[#e6f4ea] text-[#2e7d32]',
  'Some prep': 'bg-[#fff4e0] text-[#b26a00]',
}

type Activity = {
  id: string
  emoji: string
  title: string
  category: string
  skill: 'Grab & go' | 'Some prep'
  skillNote?: string
  audience: string[] // from Kids/Tweens/Teens/Adults
  audienceLabel: string
  prep: string
  count: string
  description: React.ReactNode
  play: string
  playLabel?: string
  fullscreen: string
  runSheet: string
  deckGrid?: boolean
  tierDecks?: { tier: string; front: string; back: string }[]
  prints?: { label: string; href: string; note?: string }[]
  printNote?: string
  references?: { label: string; href: string; download?: boolean }[]
}

const ACTIVITIES: Activity[] = [
  {
    id: 'prize-wheel',
    emoji: '🎡',
    title: 'Food Preservation Trivia',
    category: 'Trivia game',
    skill: 'Grab & go',
    audience: ['Kids', 'Tweens', 'Teens', 'Adults'],
    audienceLabel: 'All ages',
    prep: '5–10 min',
    count: '640 questions',
    description: (
      <>
        Spin the wheel to land on a topic, pick the player&rsquo;s age group, and answer a
        trivia question — then share the fun fact. 8 color-coded topics × 4 age tiers.
      </>
    ),
    play: '/games/prize-wheel',
    fullscreen: '/games/prize-wheel-app.html',
    runSheet: '/games/guides/prize-wheel-run-sheet.pdf',
    deckGrid: true,
    references: [{ label: '📊 Question bank (CSV, 640 Q&A)', href: '/games/questions.csv', download: true }],
  },
  {
    id: 'is-this-safe',
    emoji: '🔎',
    title: 'Is This Safe? Sorting Game',
    category: 'Sorting game',
    skill: 'Some prep',
    audience: ['Kids', 'Tweens', 'Teens', 'Adults'],
    audienceLabel: 'All ages',
    prep: '5–10 min',
    count: '96 scenario cards',
    description: (
      <>
        Players read a real home preservation scenario and decide:{' '}
        <b className="text-[#2E7D32]">Safe</b>, <b className="text-[#C62828]">Not Safe</b>, or{' '}
        <b className="text-[#F57C00]">It Depends</b>? Then flip for the answer and a plain-language
        explanation. The &ldquo;It Depends&rdquo; cards spark the best conversations.
      </>
    ),
    play: '/games/sorting-game',
    fullscreen: '/games/sorting/sort-app.html',
    runSheet: '/games/guides/is-this-safe-run-sheet.pdf',
    tierDecks: [
      { tier: 'Kids', front: '/games/sorting/cards-front-kids.pdf', back: '/games/sorting/cards-back-kids.pdf' },
      { tier: 'Tweens', front: '/games/sorting/cards-front-tweens.pdf', back: '/games/sorting/cards-back-tweens.pdf' },
      { tier: 'Teens', front: '/games/sorting/cards-front-teens.pdf', back: '/games/sorting/cards-back-teens.pdf' },
      { tier: 'Adults', front: '/games/sorting/cards-front-adults.pdf', back: '/games/sorting/cards-back-adults.pdf' },
    ],
    prints: [
      { label: '🔑 Volunteer answer key (all ages)', href: '/games/sorting/volunteer-key.pdf' },
      { label: '🪧 Sorting signs', href: '/games/sorting/sorting-labels.pdf' },
    ],
    printNote:
      'Pick an age deck below (24 cards each). Print scenarios (front) and answers (back) double-sided, flip on the short edge so each answer lands on its card. Set the three signs across the table and keep the answer key handy.',
  },
  {
    id: 'preservation-bingo',
    emoji: '🎟️',
    title: 'Preservation Bingo',
    category: 'Bingo game',
    skill: 'Some prep',
    audience: ['Kids', 'Tweens', 'Teens', 'Adults'],
    audienceLabel: 'All ages',
    prep: '10–15 min',
    count: '72 terms · 30 cards',
    description: (
      <>
        Classic 5×5 bingo with food-preservation terms. The caller draws a term and reads a
        clue at the right age level (Kids / Tweens / Teens / Adult); players cover it if it&rsquo;s
        on their card. First to five in a row wins. Text cards for teens/adults, icon cards for kids.
      </>
    ),
    play: '/games/bingo',
    playLabel: '📢 Open caller',
    fullscreen: '/games/bingo/caller.html',
    runSheet: '/games/guides/preservation-bingo-run-sheet.pdf',
    prints: [
      { label: '🎟️ Bingo cards — teens/adults (text)', href: '/games/bingo/bingo-cards-adults.pdf' },
      { label: '🧒 Bingo cards — kids (icons)', href: '/games/bingo/bingo-cards-kids.pdf' },
      { label: '🔑 Volunteer call sheet (4 age clues)', href: '/games/bingo/volunteer-call-sheet.pdf' },
    ],
    printNote:
      'Print 2 cards per sheet and cut in half. Give each player a card and markers (dried beans, pennies, or a pen).',
  },
]

// ---- filter facets ----
const FACETS = {
  Category: Array.from(new Set(ACTIVITIES.map((a) => a.category))),
  Skill: ['Grab & go', 'Some prep'],
  Audience: ['Kids', 'Tweens', 'Teens', 'Adults'],
  Prep: Array.from(new Set(ACTIVITIES.map((a) => a.prep))),
} as const

type FacetKey = keyof typeof FACETS

function Badge({ children, cls = 'bg-[#eef1f5] text-[#42556b]' }: { children: React.ReactNode; cls?: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{children}</span>
}

export default function ToolkitClient() {
  const [filters, setFilters] = useState<Record<FacetKey, Set<string>>>({
    Category: new Set(),
    Skill: new Set(),
    Audience: new Set(),
    Prep: new Set(),
  })

  function toggle(facet: FacetKey, value: string) {
    setFilters((prev) => {
      const next = new Set(prev[facet])
      next.has(value) ? next.delete(value) : next.add(value)
      return { ...prev, [facet]: next }
    })
  }
  function clearAll() {
    setFilters({ Category: new Set(), Skill: new Set(), Audience: new Set(), Prep: new Set() })
  }
  const activeCount = (Object.keys(filters) as FacetKey[]).reduce((n, k) => n + filters[k].size, 0)

  const visible = useMemo(() => {
    return ACTIVITIES.filter((a) => {
      if (filters.Category.size && !filters.Category.has(a.category)) return false
      if (filters.Skill.size && !filters.Skill.has(a.skill)) return false
      if (filters.Audience.size && !a.audience.some((x) => filters.Audience.has(x))) return false
      if (filters.Prep.size && !filters.Prep.has(a.prep)) return false
      return true
    })
  }, [filters])

  return (
    <>
      {/* Filter bar */}
      <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#d73f09]">
              Filter activities
            </h2>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-sm font-semibold text-[#1976D2] hover:underline">
                Clear filters ({activeCount})
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(FACETS) as FacetKey[]).map((facet) => (
              <div key={facet}>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary">{facet}</p>
                <div className="flex flex-wrap gap-1.5">
                  {FACETS[facet].map((value) => {
                    const active = filters[facet].has(value)
                    return (
                      <button
                        key={value}
                        onClick={() => toggle(facet, value)}
                        aria-pressed={active}
                        className={[
                          'rounded-full border px-3 py-1 text-xs font-semibold transition',
                          active
                            ? 'border-[#d73f09] bg-[#d73f09] text-white'
                            : 'border-[#d8d1c7] bg-white text-primary hover:bg-[#f3f0ed]',
                        ].join(' ')}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Activity cards */}
      <p className="px-1 text-sm text-secondary">
        {visible.length} {visible.length === 1 ? 'activity' : 'activities'}
        {activeCount > 0 ? ' match your filters' : ' available'}
      </p>

      {visible.map((a) => (
        <section key={a.id} className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>{a.emoji}</span>
                <h2 className="text-2xl font-bold text-primary">{a.title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{a.category}</Badge>
                <Badge cls={EFFORT_CLS[a.skill]}>{a.skillNote ? `${a.skill} · ${a.skillNote}` : a.skill}</Badge>
                <Badge>{a.audienceLabel}</Badge>
                <Badge>⏱ {a.prep}</Badge>
                <Badge>{a.count}</Badge>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-base leading-7 text-secondary">{a.description}</p>

            {/* Play */}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={a.play}
                className="rounded-xl bg-[#d73f09] px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-[#b23408]"
              >
                {a.playLabel ?? '▶ Play on tablet'}
              </Link>
              <Link
                href={a.fullscreen}
                target="_blank"
                className="rounded-xl border-2 border-[#d73f09] px-6 py-3 text-base font-bold text-[#d73f09] hover:bg-[#fdeee8]"
              >
                Open full screen ↗
              </Link>
              <a
                href={a.runSheet}
                target="_blank"
                className="rounded-xl border-2 border-[#5D4037] px-6 py-3 text-base font-bold text-[#5D4037] hover:bg-[#f3ece8]"
              >
                📋 Volunteer run sheet
              </a>
            </div>
            <p className="mt-2 text-sm text-secondary">
              New to this? The <b>run sheet</b> walks you through setup, exactly what to do, a
              no-tablet version, and volunteer tips — no tech or food-preservation experience needed.
            </p>

            {/* Print for a table */}
            <div className="mt-5 border-t border-[#ece6dc] pt-4">
              {a.references && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-bold uppercase tracking-wide text-secondary">
                    Volunteer reference
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-base">
                    {a.references.map((r) => (
                      <a key={r.href} className="font-semibold text-[#1976D2] hover:underline" href={r.href} download={r.download}>
                        {r.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-2 text-sm font-bold uppercase tracking-wide text-secondary">
                🖨 Print for an in-person table
              </p>

              {a.prints && (
                <>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-base">
                    {a.prints.map((p) => (
                      <a key={p.href} className="font-semibold text-[#1976D2] hover:underline" href={p.href} download>
                        {p.label}
                      </a>
                    ))}
                  </div>
                  {a.printNote && <p className="mt-2 text-xs text-secondary">{a.printNote}</p>}
                </>
              )}

              {a.tierDecks && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="border-b border-[#e7e1d7] py-2 pr-3">Age deck</th>
                        <th className="border-b border-[#e7e1d7] px-2 py-2 text-center">Scenarios (front)</th>
                        <th className="border-b border-[#e7e1d7] px-2 py-2 text-center">Answers (back)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.tierDecks.map((d) => (
                        <tr key={d.tier}>
                          <td className="border-b border-[#f0ece4] py-2 pr-3 font-semibold">{d.tier}</td>
                          <td className="border-b border-[#f0ece4] px-2 py-2 text-center">
                            <a className="font-semibold text-[#1976D2] hover:underline" href={d.front} download>PDF</a>
                          </td>
                          <td className="border-b border-[#f0ece4] px-2 py-2 text-center">
                            <a className="font-semibold text-[#1976D2] hover:underline" href={d.back} download>PDF</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {a.deckGrid && (
                <>
                  <p className="mb-3 text-sm text-secondary">
                    One PDF per topic per age tier (20 cards each). Front = question; back = answer,
                    fun fact, and source. Print on card stock, actual size, duplex (flip short edge).
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="border-b border-[#e7e1d7] py-2 pr-3">Topic</th>
                          {TIERS.map((t) => (
                            <th key={t.id} className="border-b border-[#e7e1d7] px-2 py-2 text-center">
                              {t.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TOPICS.map((topic) => (
                          <tr key={topic.id}>
                            <td className="border-b border-[#f0ece4] py-2 pr-3">
                              <span className="inline-flex items-center gap-2 font-semibold">
                                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: topic.color }} aria-hidden />
                                {topic.name}
                              </span>
                            </td>
                            {TIERS.map((t) => (
                              <td key={t.id} className="border-b border-[#f0ece4] px-2 py-2 text-center">
                                <a className="font-semibold text-[#1976D2] hover:underline" href={`/games/cards/${topic.id}-${t.id}.pdf`} download>
                                  PDF
                                </a>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      ))}

      {visible.length === 0 && (
        <div className="rounded-3xl border border-dashed border-[#d8d1c7] bg-white p-10 text-center">
          <p className="text-base font-semibold text-secondary">No activities match those filters.</p>
          <button onClick={clearAll} className="mt-2 font-semibold text-[#1976D2] hover:underline">
            Clear filters
          </button>
        </div>
      )}
    </>
  )
}
