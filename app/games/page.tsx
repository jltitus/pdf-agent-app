import Link from 'next/link'

export const metadata = {
  title: 'Toolkit — MFP Volunteer Resource Hub',
}

// Mirrors mfp-prize-wheel/scripts/config.mjs (topic ids/colors) so download
// links resolve to public/games/cards/{topic}-{tier}.pdf.
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

// Two-facet tagging: how much VOLUNTEER skill an item needs to run, and the
// AUDIENCE it's for.
const EFFORT = {
  grab: { label: 'Grab & go', cls: 'bg-[#e6f4ea] text-[#2e7d32]' },
  prep: { label: 'Some prep', cls: 'bg-[#fff4e0] text-[#b26a00]' },
  trained: { label: 'Trained MFP', cls: 'bg-[#fdeaea] text-[#c62828]' },
}

function Badge({ children, cls = 'bg-[#eef1f5] text-[#42556b]' }: { children: React.ReactNode; cls?: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      {children}
    </span>
  )
}

function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <span className="text-2xl" aria-hidden>{icon}</span>
      <h2 className="text-2xl font-bold text-primary">{title}</h2>
      <span className="text-sm text-secondary">{sub}</span>
    </div>
  )
}

export default function ResourceHubPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-primary">
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-5 sm:px-6 sm:py-8">
        {/* Masthead */}
        <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
          <div className="bg-[#d73f09] px-5 py-3 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em]">
              Oregon State University Extension
            </p>
          </div>
          <div className="p-5 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
              Master Food Preservers · Outreach
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl">
              Toolkit
            </h1>
            <p className="mt-2 text-lg font-semibold text-secondary">
              Games, printables &amp; run sheets for Master Food Preserver outreach.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-7 text-secondary">
              Everything you need to run an MFP table at a farmers market, fair, or
              class — interactive games, printable activities, and step-by-step
              volunteer run sheets. Grounded in OSU Extension food-preservation
              publications. Organized by <b>activity type</b> and tagged by{' '}
              <b>skill level</b> (how much volunteer prep) and <b>audience</b>.
            </p>
            {/* Legend */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-secondary">
              <span className="font-bold uppercase tracking-wide">Skill to run:</span>
              <Badge cls={EFFORT.grab.cls}>Grab &amp; go</Badge>
              <span>open &amp; play, no prep</span>
              <Badge cls={EFFORT.prep.cls}>Some prep</Badge>
              <span>print, cut, gather supplies</span>
              <Badge cls={EFFORT.trained.cls}>Trained MFP</Badge>
              <span>needs preservation knowledge</span>
            </div>
          </div>
        </section>

        {/* ---- Interactive games ---- */}
        <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
          <div className="p-5 sm:p-8">
            <SectionHeader icon="🎡" title="Interactive games" sub="run live on a tablet" />
            <div className="rounded-2xl border border-[#ece6dc] bg-[#faf8f4] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-primary">Prize Wheel Trivia</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge cls={EFFORT.grab.cls}>Grab &amp; go</Badge>
                  <Badge>All ages · Kids–Adults</Badge>
                  <Badge>640 questions</Badge>
                </div>
              </div>
              <p className="mt-3 max-w-2xl text-base leading-7 text-secondary">
                Spin the wheel to land on a topic, pick the player&rsquo;s age group, and
                answer trivia to win a prize. 8 color-coded topics × 4 age tiers.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/games/prize-wheel"
                  className="rounded-xl bg-[#d73f09] px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-[#b23408]"
                >
                  ▶ Play digital wheel
                </Link>
                <Link
                  href="/games/prize-wheel-app.html"
                  target="_blank"
                  className="rounded-xl border-2 border-[#d73f09] px-6 py-3 text-base font-bold text-[#d73f09] hover:bg-[#fdeee8]"
                >
                  Open full screen ↗
                </Link>
                <a
                  href="/games/guides/prize-wheel-run-sheet.pdf"
                  target="_blank"
                  className="rounded-xl border-2 border-[#5D4037] px-6 py-3 text-base font-bold text-[#5D4037] hover:bg-[#f3ece8]"
                >
                  📋 Volunteer run sheet (PDF)
                </a>
              </div>
              <p className="mt-3 text-sm text-secondary">
                New to this? The <b>run sheet</b> is a printable step-by-step guide —
                materials, setup, exactly what to tap, a no-tablet card version, and
                volunteer tips. No tech or food-preservation experience needed.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Printable activities ---- */}
        <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
          <div className="p-5 sm:p-8">
            <SectionHeader icon="🃏" title="Printable activities" sub="for an in-person table" />
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-primary">Prize Wheel question cards</span>
              <Badge cls={EFFORT.prep.cls}>Some prep · print &amp; cut</Badge>
              <Badge>Pick deck by audience</Badge>
            </div>
            <p className="mb-4 max-w-3xl text-sm text-secondary">
              One PDF per topic × age tier (20 cards each). Front = question; back =
              answer, fun fact, and source citation. Cards are 2.5″×3.5″ with 0.125″
              bleed — print on white card stock at actual size, duplex (flip on short
              edge), then cut. The color band marks the topic.
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
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: topic.color }}
                            aria-hidden
                          />
                          {topic.name}
                        </span>
                      </td>
                      {TIERS.map((t) => (
                        <td key={t.id} className="border-b border-[#f0ece4] px-2 py-2 text-center">
                          <a
                            className="font-semibold text-[#1976D2] hover:underline"
                            href={`/games/cards/${topic.id}-${t.id}.pdf`}
                            download
                          >
                            PDF
                          </a>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---- Volunteer handouts & references ---- */}
        <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
          <div className="p-5 sm:p-8">
            <SectionHeader icon="📄" title="Handouts & references" sub="for volunteers" />
            <ul className="space-y-3">
              <li className="flex flex-wrap items-center gap-3">
                <a className="font-semibold text-[#1976D2] hover:underline" href="/games/PRIZES.md" target="_blank">
                  🎁 Prize &amp; reward ideas (by age group)
                </a>
                <Badge cls={EFFORT.grab.cls}>Grab &amp; go</Badge>
                <Badge>Volunteer reference</Badge>
              </li>
              <li className="flex flex-wrap items-center gap-3">
                <a className="font-semibold text-[#1976D2] hover:underline" href="/games/questions.csv" download>
                  📊 Full question bank (CSV, 640 Q&amp;A)
                </a>
                <Badge cls={EFFORT.trained.cls}>Trained MFP</Badge>
                <Badge>Review / print master</Badge>
              </li>
            </ul>
          </div>
        </section>

        <p className="px-1 pb-4 text-xs text-secondary">
          More activities coming to the toolkit. Content is grounded in OSU Extension
          publications but model-generated — spot-check before printing at scale.
        </p>
      </div>
    </main>
  )
}
