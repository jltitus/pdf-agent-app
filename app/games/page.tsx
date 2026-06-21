import ToolkitClient from './ToolkitClient'

export const metadata = {
  title: 'Toolkit — MFP Volunteer Resource Hub',
}

export default function ToolkitPage() {
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
              Everything you need to run an MFP table at a farmers market, fair, or class.
              Each activity can be played live on a tablet or printed for a no-tech table, and
              comes with a step-by-step volunteer run sheet. Use the filters to find what fits
              your event, audience, and prep time. Grounded in OSU Extension publications.
            </p>
            {/* Skill legend */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-secondary">
              <span className="font-bold uppercase tracking-wide">Skill to run:</span>
              <span><b className="text-[#2e7d32]">Grab &amp; go</b> — open &amp; play, no prep</span>
              <span><b className="text-[#b26a00]">Some prep</b> — print, cut, gather supplies</span>
              <span><b className="text-[#c62828]">Trained MFP</b> — needs preservation knowledge</span>
            </div>
          </div>
        </section>

        {/* Filters + activity cards (client) */}
        <ToolkitClient />

        {/* Handouts & references */}
        <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
          <div className="p-5 sm:p-8">
            <div className="mb-3 flex items-baseline gap-3">
              <span className="text-2xl" aria-hidden>📄</span>
              <h2 className="text-2xl font-bold text-primary">Handouts &amp; references</h2>
              <span className="text-sm text-secondary">for volunteers</span>
            </div>
            <ul className="space-y-2 text-base">
              <li>
                <a className="font-semibold text-[#1976D2] hover:underline" href="/games/PRIZES.md" target="_blank">
                  🎁 Prize &amp; reward ideas (by age group)
                </a>
              </li>
              <li>
                <a className="font-semibold text-[#1976D2] hover:underline" href="/games/questions.csv" download>
                  📊 Prize Wheel question bank (CSV, 640 Q&amp;A)
                </a>
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
