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
  puzzleGrid?: { label: string; kids: string; adult: string }[]
  prints?: { label: string; href: string }[]
  printNote?: string
  references?: { label: string; href: string; download?: boolean }[]
}

const ACTIVITIES: Activity[] = [
  {
    id: 'prize-wheel',
    emoji: '🎡',
    title: 'Food preservation trivia',
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
    title: 'Is this safe? Sorting game',
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
    title: 'Preservation bingo',
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
    title: 'How long does it last?',
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
    title: 'Seasonal preservation planner',
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
  {
    id: 'myth-busters',
    emoji: '🔬',
    title: 'Food preservation myth busters',
    accent: '#C62828',
    category: 'Myth busting',
    skill: 'Some prep',
    audience: ['Teens', 'Adults'],
    audienceLabel: 'Teens & Adults',
    prep: '5–10 min',
    count: '40 myths',
    keywords: 'myth busters true false misconception debunk fact risk',
    description: (
      <>
        A visitor reads a plausible-sounding claim and guesses <b className="text-[#4A773C]">True</b> or{' '}
        <b className="text-[#D73F09]">False</b> — then you bust it with a warm, plain-language explanation,
        why people believe it, and a risk level. Mostly false, with a few surprising trues. HIGH-risk myths
        are flagged.
      </>
    ),
    play: '/games/myth-busters',
    fullscreen: '/games/myth-busters/myth-app.html',
    runSheet: '/games/guides/myth-busters-activity-guide.pdf',
    kit: '/games/kits/myth-busters-print-kit.zip',
    prints: [
      { label: '🃏 Myth cards — front (claim)', href: '/games/myth-busters/myth-cards-front.pdf' },
      { label: '↩ Myth cards — back (bust)', href: '/games/myth-busters/myth-cards-back.pdf' },
      { label: '🔑 Volunteer key', href: '/games/myth-busters/volunteer-key.pdf' },
    ],
    printNote:
      'Print double-sided (flip on short edge) so each bust lands on the back of its claim, then cut. HIGH-risk myths have a red border.',
  },
  {
    id: 'timeline-puzzle',
    emoji: '🧩',
    title: 'Canning timeline puzzle',
    accent: '#1976D2',
    category: 'Sequencing puzzle',
    skill: 'Some prep',
    audience: ['Kids', 'Tweens', 'Teens', 'Adults'],
    audienceLabel: 'All ages',
    prep: '10–15 min',
    count: '6 processes',
    keywords: 'timeline puzzle order steps sequence canning process strawberry jam tomatoes green beans pickles freezing',
    description: (
      <>
        Players put the steps of a real food-preservation process in the correct order — the exact
        OSU recipe sequence. Six processes, each as a <b>Kids</b> deck (simple) and a{' '}
        <b>Teen/Adult</b> deck (full technical steps). Safety-critical steps are flagged; the step
        number on the back lets players self-check.
      </>
    ),
    play: '/games/timeline-puzzle',
    fullscreen: '/games/timeline/timeline-app.html',
    runSheet: '/games/guides/timeline-puzzle-activity-guide.pdf',
    kit: '/games/kits/timeline-puzzle-print-kit.zip',
    prints: [{ label: '🔑 Answer keys (all processes)', href: '/games/timeline/answer-keys.pdf' }],
    puzzleGrid: [
      { label: 'Strawberry Jam', kids: '/games/timeline/puzzle-strawberry-jam-kids.pdf', adult: '/games/timeline/puzzle-strawberry-jam-adult.pdf' },
      { label: 'Whole Tomatoes', kids: '/games/timeline/puzzle-whole-tomatoes-kids.pdf', adult: '/games/timeline/puzzle-whole-tomatoes-adult.pdf' },
      { label: 'Pressure-Canned Green Beans', kids: '/games/timeline/puzzle-green-beans-kids.pdf', adult: '/games/timeline/puzzle-green-beans-adult.pdf' },
      { label: 'Refrigerator Pickles', kids: '/games/timeline/puzzle-refrigerator-pickles-kids.pdf', adult: '/games/timeline/puzzle-refrigerator-pickles-adult.pdf' },
      { label: 'Freezing Vegetables', kids: '/games/timeline/puzzle-freezing-vegetables-kids.pdf', adult: '/games/timeline/puzzle-freezing-vegetables-adult.pdf' },
      { label: 'Fruit Preserves', kids: '/games/timeline/puzzle-fruit-preserves-kids.pdf', adult: '/games/timeline/puzzle-fruit-preserves-adult.pdf' },
    ],
    printNote:
      'Print the decks you need and cut the cards apart. Each card front is a step; the back has only the step number for self-checking. Safety steps have a red border.',
  },
  {
    id: 'recipe-swap',
    emoji: '📇',
    title: 'Recipe card swap station',
    accent: '#4A773C',
    category: 'Recipe cards',
    skill: 'Some prep',
    audience: ['Adults'],
    audienceLabel: 'Adults',
    prep: '5–10 min',
    count: '12 tested recipes',
    keywords: 'recipe cards swap tested jam salsa pickle canning take-home citation',
    description: (
      <>
        A take-one / swap-one station of <b>tested</b> recipe cards (4×6) drawn from OSU &amp; USDA
        publications — jam, salsa, pickles, canned fruit, green beans, and more. Each card has the
        exact ingredients, headspace, processing time, yield, its source citation, and a
        tested-recipe reminder. A Master Food Preserver should verify each card against its source
        before printing for the public.
      </>
    ),
    play: '/games/recipe-swap',
    fullscreen: '/games/recipes/recipe-app.html',
    runSheet: '/games/guides/recipe-card-swap-station-activity-guide.pdf',
    kit: '/games/kits/recipe-card-swap-station-print-kit.zip',
    prints: [
      { label: '🃏 Recipe cards (4×6, 2-up)', href: '/games/recipes/recipe-cards-all.pdf' },
      { label: '🔑 Recipe index (citations + verify note)', href: '/games/recipes/recipe-index.pdf' },
    ],
    printNote:
      'Verify each recipe against its cited OSU/USDA publication (see the Recipe index) before printing for the public. Every card carries the tested-recipe disclaimer.',
  },
  {
    id: 'jar-display',
    emoji: '🫙',
    title: 'What went wrong? Jar display',
    accent: '#C62828',
    category: 'Display',
    skill: 'Some prep',
    audience: ['Teens', 'Adults'],
    audienceLabel: 'Teens & Adults',
    prep: '15–20 min',
    count: '18 jars',
    keywords: 'jar display what went wrong spoilage seal safe not safe discard mistakes',
    description: (
      <>
        A &ldquo;spot the problem&rdquo; display of jars showing common canning mistakes — failed
        seals, un-acidified tomatoes, crystallization — with tags telling visitors if each is{' '}
        <b className="text-[#2E7D32]">Safe</b>, <b className="text-[#F57C00]">Not Safe</b>, or{' '}
        <b className="text-[#C62828]">Discard</b>. Runs itself; the tablet quiz lets visitors guess first.
      </>
    ),
    play: '/games/jar-display',
    fullscreen: '/games/jar-display/jar-app.html',
    runSheet: '/games/guides/what-went-wrong-jar-display-activity-guide.pdf',
    kit: '/games/kits/what-went-wrong-jar-display-print-kit.zip',
    prints: [
      { label: '🏷 Jar tags (Safe / Not Safe / Discard)', href: '/games/jar-display/jar-tags.pdf' },
      { label: '🪧 Table signage', href: '/games/jar-display/table-signage.pdf' },
      { label: '🛠 Setup guide (recreate the jars)', href: '/games/jar-display/setup-guide.pdf' },
      { label: '🔑 Volunteer talking points', href: '/games/jar-display/volunteer-talking-points.pdf' },
    ],
    printNote:
      'Recreate the example jars from the setup guide and attach a tag to each. Label every unsafe jar "DISPLAY ONLY — DO NOT EAT" and never let anyone taste a display jar.',
  },
  {
    id: 'before-after',
    emoji: '🍓',
    title: 'Before & after jar display',
    accent: '#388E3C',
    category: 'Display',
    skill: 'Grab & go',
    audience: ['Kids', 'Tweens', 'Teens', 'Adults'],
    audienceLabel: 'All ages',
    prep: '10 min',
    count: '20 pairings',
    keywords: 'before after fresh preserved produce pairing display willamette valley season yield',
    description: (
      <>
        Fresh Willamette Valley produce paired with its preserved version — strawberries beside jam,
        cucumbers beside pickles, green beans beside canned. Each pairing has an info card with the
        method, season, and fresh-to-preserved yield. Zero facilitation; the tablet browser shows them all.
      </>
    ),
    play: '/games/before-after',
    fullscreen: '/games/before-after/before-after-app.html',
    runSheet: '/games/guides/before-after-jar-display-activity-guide.pdf',
    kit: '/games/kits/before-after-jar-display-print-kit.zip',
    prints: [
      { label: '🃏 Display cards (4×6, 2-up)', href: '/games/before-after/display-cards.pdf' },
    ],
    printNote:
      'Print the display cards and stand one next to each fresh + preserved pairing. Rotate pairings to match what is in season at the market that week.',
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

const SELECT =
  'min-h-11 rounded-xl border bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09]'
const ALL_LABEL: Record<FacetKey, string> = {
  Category: 'All categories', Skill: 'All skill levels', Audience: 'All ages', Prep: 'All prep times',
}

export default function ToolkitClient() {
  const [filters, setFilters] = useState<Record<FacetKey, string>>({ Category: '', Skill: '', Audience: '', Prep: '' })
  const [query, setQuery] = useState('')
  const hydrated = useRef(false)

  // ---- read filters from the URL on first mount ----
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const next: Record<FacetKey, string> = { Category: '', Skill: '', Audience: '', Prep: '' }
    for (const k of FACET_KEYS) { const v = sp.get(k.toLowerCase()); if (v) next[k] = v }
    setFilters(next)
    setQuery(sp.get('q') ?? '')
    hydrated.current = true
  }, [])

  // ---- persist filters to the URL ----
  useEffect(() => {
    if (!hydrated.current) return
    const sp = new URLSearchParams()
    for (const k of FACET_KEYS) if (filters[k]) sp.set(k.toLowerCase(), filters[k])
    if (query.trim()) sp.set('q', query.trim())
    const qs = sp.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [filters, query])

  function setFacet(facet: FacetKey, value: string) {
    setFilters((prev) => ({ ...prev, [facet]: value }))
  }
  function clearAll() {
    setFilters({ Category: '', Skill: '', Audience: '', Prep: '' })
    setQuery('')
  }
  const activeCount = FACET_KEYS.reduce((n, k) => n + (filters[k] ? 1 : 0), 0) + (query.trim() ? 1 : 0)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ACTIVITIES.filter((a) => {
      if (filters.Category && a.category !== filters.Category) return false
      if (filters.Skill && a.skill !== filters.Skill) return false
      if (filters.Audience && !a.audience.includes(filters.Audience)) return false
      if (filters.Prep && a.prep !== filters.Prep) return false
      if (q && !`${a.title} ${a.category} ${a.audienceLabel} ${a.count} ${a.keywords}`.toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => a.title.localeCompare(b.title))
  }, [filters, query])

  return (
    <>
      {/* Activity quick-nav — surfaced at the top so the full scope is visible */}
      {visible.length > 1 && (
        <nav aria-label="Activities" className="overflow-hidden rounded-2xl border border-[#d8d1c7] bg-white p-3 shadow-sm sm:p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary">
            {visible.length} activities
          </p>
          <div className="flex flex-wrap gap-2">
            {visible.map((a) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d8d1c7] bg-white px-3 py-1.5 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
              >
                <span aria-hidden>{a.emoji}</span>
                {a.title}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* First-time callout */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#f3d9cb] bg-[#fdf1ea] p-4 text-sm text-[#7a3a18]">
        <span className="text-lg" aria-hidden>👋</span>
        <p>
          <b>New here?</b> Open an <b>Activity guide</b> first — it walks you through
          setup, exactly what to do, and a no-tablet version. Each activity can be played on a
          tablet or printed for a table.
        </p>
      </div>

      {/* Filter bar — search + compact dropdowns in one row */}
      <section className="overflow-hidden rounded-2xl border border-[#d8d1c7] bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4">
          <label className="min-w-[180px] flex-1">
            <span className="sr-only">Search activities</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search activities…"
              className="w-full min-h-11 rounded-xl border border-[#d8d1c7] bg-[#fafafa] px-4 py-2 text-base text-primary placeholder:text-[#999] focus:border-[#d73f09] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09]"
            />
          </label>
          {FACET_KEYS.map((facet) => (
            <select
              key={facet}
              aria-label={`Filter by ${facet}`}
              value={filters[facet]}
              onChange={(e) => setFacet(facet, e.target.value)}
              className={`${SELECT} ${filters[facet] ? 'border-[#d73f09] text-[#d73f09]' : 'border-[#d8d1c7] text-primary'}`}
            >
              <option value="">{ALL_LABEL[facet]}</option>
              {FACETS[facet].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          ))}
          {activeCount > 0 && (
            <button onClick={clearAll} className="px-1 text-sm font-semibold text-[#1976D2] hover:underline">
              Clear
            </button>
          )}
        </div>
      </section>

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
                📋 Activity guide
              </a>
              <a href={a.kit} download className="rounded-xl border-2 border-[#1976D2] px-6 py-3 text-base font-bold text-[#1976D2] hover:bg-[#eaf2fb]">
                ⬇ Print kit (ZIP)
              </a>
            </div>
            <p className="mt-2 text-sm text-secondary">
              New to this? The <b>Activity guide</b> walks you through setup, exactly what to do, a
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

                {a.puzzleGrid && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[440px] border-collapse text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="border-b border-[#e7e1d7] py-2 pr-3">Process</th>
                          <th className="border-b border-[#e7e1d7] px-2 py-2 text-center">Kids deck</th>
                          <th className="border-b border-[#e7e1d7] px-2 py-2 text-center">Teen/Adult deck</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.puzzleGrid.map((d) => (
                          <tr key={d.label}>
                            <td className="border-b border-[#f0ece4] py-2 pr-3 font-semibold">{d.label}</td>
                            <td className="border-b border-[#f0ece4] px-2 py-2 text-center">
                              <a className="font-semibold text-[#1976D2] hover:underline" href={d.kids} download>PDF</a>
                            </td>
                            <td className="border-b border-[#f0ece4] px-2 py-2 text-center">
                              <a className="font-semibold text-[#1976D2] hover:underline" href={d.adult} download>PDF</a>
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
