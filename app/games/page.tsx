import ToolkitClient from './ToolkitClient'

export const metadata = {
  title: 'Outreach — MFP Volunteer Resource Hub',
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
              Outreach activities &amp; printables
            </h1>
            <p className="mt-2 text-lg font-semibold text-secondary">
              Games, printables &amp; Activity guides for farmers-market outreach.
            </p>
            {/* Scope chips — where these are used */}
            <div className="mt-4 flex flex-wrap gap-2">
              {['🧺 Farmers markets', '🏫 Youth programs', '🎓 Workshops', '🎪 Fairs & events'].map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-[#e3ddd2] bg-[#faf8f4] px-3 py-1 text-sm font-semibold text-secondary"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-4 max-w-3xl text-base leading-7 text-secondary">
              Each activity plays on a tablet or prints for a no-tech table, with a
              step-by-step Activity guide. Grounded in OSU Extension publications.
            </p>
            {/* Skill legend */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-secondary">
              <span className="font-bold uppercase tracking-wide">Skill to run:</span>
              <span><b className="text-[#2e7d32]">Grab &amp; go</b> — open &amp; play, no prep</span>
              <span><b className="text-[#b26a00]">Some prep</b> — print, cut, gather supplies</span>
            </div>
          </div>
        </section>

        {/* Filters + activity cards (client) */}
        <ToolkitClient />

        <p className="px-1 pb-4 text-xs text-secondary">
          More activities coming to the toolkit. Content is grounded in OSU Extension
          publications but model-generated — spot-check before printing at scale.
        </p>
      </div>
    </main>
  )
}
