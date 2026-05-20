import Link from 'next/link'

export default function HelpPage() {
  return (
    <>
  

      <main className="min-h-screen bg-[#f7f4ef] text-primary">
        <div className="mx-auto max-w-6xl space-y-6 px-3 py-5 sm:px-6 sm:py-8">
          <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
            <div className="bg-[#d73f09] px-5 py-3 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">
                Oregon State University Extension
              </p>
            </div>

            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                  Evidence guide
                </p>

                <h1 className="mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl">
                  Using preservation evidence and source guidance
                </h1>

                <p className="mt-5 max-w-3xl text-base leading-7 text-secondary sm:text-lg">
                  Learn how to use the MFP Publication Agent effectively,
                  interpret evidence labels, review citations, and confirm
                  preservation guidance using OSU Extension source publications.
                </p>
              </div>

              <aside className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-5">
                <h2 className="text-xl font-bold text-primary">
                  Important reminder
                </h2>

                <p className="mt-3 text-sm leading-6 text-secondary">
                  Answers in this system are limited to uploaded active
                  publications and should always be reviewed alongside the
                  cited source material.
                </p>

                <div className="mt-5 rounded-xl border border-[#ead9bf] bg-[#f7f0dd] p-4 text-sm leading-6 text-secondary">
                  <strong className="text-primary">
                    Best practice:
                  </strong>{' '}
                  Open the cited publication PDF when confirming processing
                  times, recipes, preservation methods, or food safety guidance.
                </div>
              </aside>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-primary">
                What this system does
              </h2>

              <p className="mt-4 text-sm leading-7 text-secondary">
                The MFP Publication Agent helps Oregon Master Food Preservers
                search active OSU Extension preservation publications, retrieve
                supporting evidence, and review source citations more quickly.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-primary">
                What this system does not do
              </h2>

              <p className="mt-4 text-sm leading-7 text-secondary">
                The system does not replace official OSU Extension guidance,
                publication review, or professional judgment. Preservation
                recommendations should always be verified against the cited
                publication source.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
              Reference workflow
            </p>

            <h2 className="mt-2 text-3xl font-bold text-primary">
              How to ask stronger preservation questions
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-5">
                <h3 className="text-lg font-bold text-primary">
                  Helpful question examples
                </h3>

                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-secondary">
                  <li>How do I safely dry herbs?</li>
                  <li>What does the publication say about smoked fish storage?</li>
                  <li>Can I use low-temperature pasteurization for pickles?</li>
                  <li>What are the safety concerns for garlic in oil?</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-5">
                <h3 className="text-lg font-bold text-primary">
                  Less specific questions
                </h3>

                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-secondary">
                  <li>Tell me everything about food.</li>
                  <li>What should I do?</li>
                  <li>Is this safe?</li>
                  <li>Give me a recipe.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
              Evidence interpretation
            </p>

            <h2 className="mt-2 text-3xl font-bold text-primary">
              Understanding evidence labels
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#cfe2cf] bg-[#e7f0e7] p-5">
                <h3 className="text-lg font-bold text-primary">
                  Strong evidence
                </h3>

                <p className="mt-2 text-sm leading-6 text-secondary">
                  Multiple supporting excerpts or publication references were found.
                </p>
              </div>

              <div className="rounded-2xl border border-[#d8d1c7] bg-[#f7f4ef] p-5">
                <h3 className="text-lg font-bold text-primary">
                  Moderate evidence
                </h3>

                <p className="mt-2 text-sm leading-6 text-secondary">
                  More than one supporting reference or excerpt was identified.
                </p>
              </div>

              <div className="rounded-2xl border border-[#ead9bf] bg-[#f7f0dd] p-5">
                <h3 className="text-lg font-bold text-primary">
                  Limited evidence
                </h3>

                <p className="mt-2 text-sm leading-6 text-secondary">
                  Only a small amount of supporting publication evidence was found.
                </p>
              </div>

              <div className="rounded-2xl border border-[#e5d1d1] bg-[#f8ecec] p-5">
                <h3 className="text-lg font-bold text-primary">
                  Not found
                </h3>

                <p className="mt-2 text-sm leading-6 text-secondary">
                  The system could not locate sufficient support in the selected publications.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
              Source verification
            </p>

            <h2 className="mt-2 text-3xl font-bold text-primary">
              When to review the original publication
            </h2>

            <ul className="mt-6 list-disc space-y-3 pl-5 text-sm leading-7 text-secondary">
              <li>Confirming processing times or temperatures</li>
              <li>Reviewing tested recipes or ingredient ratios</li>
              <li>Providing preservation safety guidance to others</li>
              <li>Comparing multiple preservation methods</li>
              <li>Validating recommendations before public instruction</li>
            </ul>
          </section>

          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
              Issue reporting
            </p>

            <h2 className="mt-2 text-3xl font-bold text-primary">
              When to report an issue
            </h2>

            <ul className="mt-6 list-disc space-y-3 pl-5 text-sm leading-7 text-secondary">
              <li>The answer appears unsupported by the cited sources.</li>
              <li>The wrong document or publication page opens.</li>
              <li>The answer seems incomplete or misleading.</li>
              <li>A known publication topic cannot be found.</li>
              <li>A publication appears outdated or missing.</li>
            </ul>
          </section>

          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
              Quick access
            </p>

            <h2 className="mt-2 text-3xl font-bold text-primary">
              Reference tools
            </h2>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/chat"
                className="rounded-xl bg-[#d73f09] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#b23408]"
              >
                Open chat
              </Link>

              <Link
                href="/publications"
                className="rounded-xl border border-[#d8d1c7] bg-white px-5 py-3 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
              >
                Browse publications
              </Link>

              <Link
                href="/report-issue"
                className="rounded-xl border border-[#d8d1c7] bg-white px-5 py-3 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
              >
                Report an issue
              </Link>

              <Link
                href="/profile"
                className="rounded-xl border border-[#d8d1c7] bg-white px-5 py-3 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
              >
                My profile
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}