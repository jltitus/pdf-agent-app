'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  accent: string
  category: string
  skill: 'Grab & go' | 'Some prep'
  audience: string[]
  audienceLabel: string
  prep: string
  count: string
  keywords: string
  description: React.ReactNode
  play: string
  playLabel?: string
  fullscreen: string
  runSheet: string
  kit: string
  deckGrid?: boolean
  tierDecks?: { tier: string; front: string; back: string }[]
  prints?: { label: string; href: string }[]
  printNote?: string
  references?: { label: string; href: string; download?: boolean }[]
}

const ACTIVITIES: Activity[] = [
  {
    id: 'prize-wheel',
    emoji: '🎡',
    title: 'Food Preservation Trivia',
    accent: '#d73f09',
    category: 'Trivia game',
    skill: 'Grab & go',
    audience: ['Kids', 'Tweens', 'Teens', 'Adults'],
    audienceLabel: 'All ages',
    prep: '5–10 min',
    count: '640 questions',
    keywords: 'wheel spin trivia questions topics quiz',
    description: (
      <>
        Spin the wheel to land on a topic, pick the player&rsquo;s age group, and answer a
        trivia question — then share the fun fact. 8 color-coded topics × 4 age tiers.
      </>
    ),
    play: '/games/prize-wheel',
    fullscreen: '/games/prize-wheel-app.html',
    runSheet: '/games/guides/food-preservation-trivia-activity-guide.pdf',
    kit: '/games/kits/food-preservation-trivia-print-kit.zip',
    deckGrid: true,
    references: [{ label: '📊 Question bank (CSV, 640 Q&A)', href: '/games/questions.csv', download: true }],
  },
  {
    id: 'is-this-safe',
    emoji: '🔎',
    title: 'Is This Safe? Sorting Game',
    accent: '#006A8E',
    category: 'Sorting game',
    skill: 'Some prep',
    audience: ['Kids', 'Tweens', 'Teens', 'Adults'],
    audienceLabel: 'All ages',
    prep: '5–10 min',
    count: '96 scenario cards',
    keywords: 'safe not safe it depends sort scenarios judgment',
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
    runSheet: '/games/guides/is-this-safe-activity-guide.pdf',
    kit: '/games/kits/is-this-safe-print-kit.zip',
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
    accent: '#7B1FA2',
    category: 'Bingo game',
    skill: 'Some prep',
    audience: ['Kids', 'Tweens', 'Teens', 'Adults'],
    audienceLabel: 'All ages',
    prep: '10–15 min',
    count: '72 terms · 30 cards',
    keywords: 'bingo caller terms vocabulary call sheet markers',
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
    runSheet: '/games/guides/preservation-bingo-activity-guide.pdf',
    kit: '/games/kits/preservation-bingo-print-kit.zip',
    prints: [
      { label: '🎟️ Bingo cards — teens/adults (text)', href: '/games/bingo/bingo-cards-adults.pdf' },
      { label: '🧒 Bingo cards — kids (icons)', href: '/games/bingo/bingo-cards-kids.pdf' },
      { label: '🔑 Volunteer call sheet (4 age clues)', href: '/games/bingo/volunteer-call-sheet.pdf' },
    ],
    printNote:
      'Print 2 cards per sheet and cut in half. Give each player a card and markers (dried beans, pennies, or a pen).',
  },
  {
    id: 'shelf-life',
    emoji: '⏳',
    title: 'How Long Does It Last?',
    accent: '#00859B',
    category: 'Guessing game',
    skill: 'Grab & go',
    audience: ['Kids', 'Tweens', 'Teens', 'Adults'],
    audienceLabel: 'All ages',
    prep: '5–10 min',
    count: '40 items',
    keywords: 'shelf life how long last fresh preserved guess storage wow',
    description: (
      <>
        A &ldquo;wow&rdquo; guessing game: see a food item and guess how long it lasts{' '}
        <b className="text-[#2E7D32]">fresh</b> vs. <b className="text-[#00859B]">preserved</b>. The
        reveal shows both shelf lives with a comparison bar, a surprising fact, and an
        age-appropriate explanation. 40 items chosen for surprising differences.
      </>
    ),
    play: '/games/shelf-life',
    fullscreen: '/games/shelf-life/shelf-app.html',
    runSheet: '/games/guides/how-long-does-it-last-activity-guide.pdf',
    kit: '/games/kits/how-long-does-it-last-print-kit.zip',
    prints: [
      { label: '🃏 Question cards (40, 2.5×3.5)', href: '/games/shelf-life/question-cards.pdf' },
      { label: '🪧 Flip-board (large, for an easel)', href: '/games/shelf-life/flip-board.pdf' },
      { label: '🔑 Volunteer key (all ages)', href: '/games/shelf-life/volunteer-key.pdf' },
    ],
    printNote:
      'Print question cards double-sided (flip on short edge) and cut. Print the flip-board for a table easel — big front (guess) and back (answer).',
  },
  {
    id: 'seasonal-planner',
    emoji: '📅',
    title: 'Seasonal Preservation Planner',
    accent: '#388E3C',
    category: 'Planner',
    skill: 'Grab & go',
    audience: ['Teens', 'Adults'],
    audienceLabel: 'Teens & Adults',
    prep: '2–5 min',
    count: '30 produce · 12 months',
    keywords: 'seasonal planner calendar willamette valley produce months in season handout',
    description: (
      <>
        A one-page Willamette Valley (Marion &amp; Yamhill County) planner: which produce is at
        peak each month and the best way to preserve it, color-coded by method. Great as a
        take-home handout. The digital version lets you tap any month for processing notes and yields.
      </>
    ),
    play: '/games/seasonal-planner',
    playLabel: '📅 Open planner',
    fullscreen: '/games/seasonal/planner-app.html',
    runSheet: '/games/guides/seasonal-planner-activity-guide.pdf',
    kit: '/games/kits/seasonal-planner-print-kit.zip',
    prints: [
      { label: '🟧 Planner — color', href: '/games/seasonal/seasonal-planner-color.pdf' },
      { label: '⬛ Planner — black & white (photocopy)', href: '/games/seasonal/seasonal-planner-bw.pdf' },
    ],
    printNote:
      'One US-Letter page. Use color for display and black & white for easy photocopying and giveaways.',
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
const FACET_KEYS = Object.keys(FACETS) as FacetKey[]

function Badge({ children, cls = 'bg-[#eef1f5] text-[#42556b]' }: { children: React.ReactNode; cls?: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{children}</span>
}

const PILL =
  'inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-1'

export default function ToolkitClient() {
  const [filters, setFilters] = useState<Record<FacetKey, Set<string>>>({
    Category: new Set(), Skill: new Set(), Audience: new Set(), Prep: new Set(),
  })
  const [query, setQuery] = useState('')
  const hydrated = useRef(false)

  // ---- read filters from the URL on first mount ----
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const next = { Category: new Set<string>(), Skill: new Set<string>(), Audience: new Set<string>(), Prep: new Set<string>() }
    for (const k of FACET_KEYS) {
      const v = sp.get(k.toLowerCase())
      if (v) v.split(',').filter(Boolean).forEach((x) => next[k].add(x))
    }
    setFilters(next)
    setQuery(sp.get('q') ?? '')
    hydrated.current = true
  }, [])

  // ---- persist filters to the URL ----
  useEffect(() => {
    if (!hydrated.current) return
    const sp = new URLSearchParams()
    for (const k of FACET_KEYS) if (filters[k].size) sp.set(k.toLowerCase(), [...filters[k]].join(','))
    if (query.trim()) sp.set('q', query.trim())
    const qs = sp.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [filters, query])

  function toggle(facet: FacetKey, value: string) {
    setFilters((prev) => {
      const next = new Set(prev[facet])
      next.has(value) ? next.delete(value) : next.add(value)
      return { ...prev, [facet]: next }
    })
  }
  function clearAll() {
    setFilters({ Category: new Set(), Skill: new Set(), Audience: new Set(), Prep: new Set() })
    setQuery('')
  }
  const activeCount = FACET_KEYS.reduce((n, k) => n + filters[k].size, 0) + (query.trim() ? 1 : 0)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ACTIVITIES.filter((a) => {
      if (filters.Category.size && !filters.Category.has(a.category)) return false
      if (filters.Skill.size && !filters.Skill.has(a.skill)) return false
      if (filters.Audience.size && !a.audience.some((x) => filters.Audience.has(x))) return false
      if (filters.Prep.size && !filters.Prep.has(a.prep)) return false
      if (q && !`${a.title} ${a.category} ${a.audienceLabel} ${a.count} ${a.keywords}`.toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => a.title.localeCompare(b.title))
  }, [filters, query])

  return (
    <>
      {/* First-time callout */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#f3d9cb] bg-[#fdf1ea] p-4 text-sm text-[#7a3a18]">
        <span className="text-lg" aria-hidden>👋</span>
        <p>
          <b>New here?</b> Open an <b>Activity Guide</b> first — it walks you through
          setup, exactly what to do, and a no-tablet version. Each activity can be played on a
          tablet or printed for a table.
        </p>
      </div>

      {/* Filter bar */}
      <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#d73f09]">Find an activity</h2>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-sm font-semibold text-[#1976D2] hover:underline">
                Clear filters ({activeCount})
              </button>
            )}
          </div>

          <label className="mb-4 block">
            <span className="sr-only">Search activities</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search activities (e.g. bingo, sorting, kids)…"
              className="w-full rounded-xl border border-[#d8d1c7] bg-[#fafafa] px-4 py-3 text-base text-primary placeholder:text-[#999] focus:border-[#d73f09] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FACET_KEYS.map((facet) => (
              <div key={facet}>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary">{facet}</p>
                <div className="flex flex-wrap gap-2">
                  {FACETS[facet].map((value) => {
                    const active = filters[facet].has(value)
                    return (
                      <button
                        key={value}
                        onClick={() => toggle(facet, value)}
                        aria-pressed={active}
                        className={`${PILL} ${active ? 'border-[#d73f09] bg-[#d73f09] text-white' : 'border-[#d8d1c7] bg-white text-primary hover:bg-[#f3f0ed]'}`}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Topic color legend */}
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-secondary">Topic colors</summary>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {TOPICS.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5 text-xs text-secondary">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} aria-hidden />
                  {t.name}
                </span>
              ))}
            </div>
          </details>
        </div>
      </section>

      {/* Activity index (jump links) */}
      {visible.length > 1 && (
        <nav aria-label="Activities" className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-bold uppercase tracking-wide text-secondary">Jump to:</span>
          {visible.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              className="rounded-full border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-[#f3f0ed]"
            >
              {a.emoji} {a.title}
            </a>
          ))}
        </nav>
      )}

      <p className="px-1 text-sm text-secondary" aria-live="polite">
        {visible.length} {visible.length === 1 ? 'activity' : 'activities'}
        {activeCount > 0 ? ' match your filters' : ' available'}
      </p>

      {visible.map((a) => (
        <section
          key={a.id}
          id={a.id}
          className="scroll-mt-24 overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm"
        >
          {/* accent strip */}
          <div className="h-2.5" style={{ backgroundColor: a.accent }} />
          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: `${a.accent}1a` }}
                  aria-hidden
                >
                  {a.emoji}
                </span>
                <h2 className="text-2xl font-bold text-primary">{a.title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{a.category}</Badge>
                <Badge cls={EFFORT_CLS[a.skill]}>{a.skill}</Badge>
                <Badge>{a.audienceLabel}</Badge>
                <Badge>⏱ {a.prep}</Badge>
                <Badge>{a.count}</Badge>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-base leading-7 text-secondary">{a.description}</p>

            {/* Primary actions */}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={a.play} className="rounded-xl bg-[#d73f09] px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-[#b23408]">
                {a.playLabel ?? '▶ Play on tablet'}
              </Link>
              <Link href={a.fullscreen} target="_blank" className="rounded-xl border-2 border-[#d73f09] px-6 py-3 text-base font-bold text-[#d73f09] hover:bg-[#fdeee8]">
                Open full screen ↗
              </Link>
              <a href={a.runSheet} target="_blank" className="rounded-xl border-2 border-[#5D4037] px-6 py-3 text-base font-bold text-[#5D4037] hover:bg-[#f3ece8]">
                📋 Activity Guide
              </a>
              <a href={a.kit} download className="rounded-xl border-2 border-[#1976D2] px-6 py-3 text-base font-bold text-[#1976D2] hover:bg-[#eaf2fb]">
                ⬇ Print kit (ZIP)
              </a>
            </div>
            <p className="mt-2 text-sm text-secondary">
              New to this? The <b>Activity Guide</b> walks you through setup, exactly what to do, a
              no-tablet version, and volunteer tips. The <b>print kit</b> bundles every printable
              for this activity in one download.
            </p>

            {/* Collapsible: individual print files */}
            <details className="mt-5 rounded-2xl border border-[#ece6dc] bg-[#faf8f4] open:pb-4">
              <summary className="cursor-pointer list-none p-4 text-sm font-bold uppercase tracking-wide text-secondary">
                🖨 Print individual files ▾
              </summary>
              <div className="px-4">
                {a.references && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary">Volunteer reference</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-base">
                      {a.references.map((r) => (
                        <a key={r.href} className="font-semibold text-[#1976D2] hover:underline" href={r.href} download={r.download}>
                          {r.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {a.prints && (
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-base">
                    {a.prints.map((p) => (
                      <a key={p.href} className="font-semibold text-[#1976D2] hover:underline" href={p.href} download>
                        {p.label}
                      </a>
                    ))}
                  </div>
                )}
                {a.printNote && <p className="mt-2 text-xs text-secondary">{a.printNote}</p>}

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
                    <p className="mb-3 mt-1 text-sm text-secondary">
                      One PDF per topic per age tier (20 cards each). Front = question; back = answer,
                      fun fact, and source. Print on card stock, actual size, duplex (flip short edge).
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="border-b border-[#e7e1d7] py-2 pr-3">Topic</th>
                            {TIERS.map((t) => (
                              <th key={t.id} className="border-b border-[#e7e1d7] px-2 py-2 text-center">{t.label}</th>
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
                                  <a className="font-semibold text-[#1976D2] hover:underline" href={`/games/cards/${topic.id}-${t.id}.pdf`} download>PDF</a>
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
            </details>
          </div>
        </section>
      ))}

      {visible.length === 0 && (
        <div className="rounded-3xl border border-dashed border-[#d8d1c7] bg-white p-10 text-center">
          <p className="text-base font-semibold text-secondary">No activities match those filters.</p>
          <button onClick={clearAll} className="mt-2 font-semibold text-[#1976D2] hover:underline">Clear filters</button>
        </div>
      )}
    </>
  )
}
