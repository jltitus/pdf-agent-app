import Link from 'next/link'
import HeaderBar from '../components/HeaderBar'

export default function HelpPage() {
  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 text-primary">
        <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
          
          {/* Header */}
          <section className="rounded-3xl border border-gray-300 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-4">
              <img
                src="/jar-logosm.png"
                alt="MFP Publication Agent logo"
                className="h-14 w-14 object-contain"
              />

              <div>
                <h1 className="text-3xl font-bold text-primary">
                  Help & Tester Guide
                </h1>
                <p className="text-sm font-semibold tracking-wide text-secondary">
                  MFP PUBLICATION AGENT
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-secondary">
              This guide explains how to test the MFP Publication Agent, ask better questions,
              review sources, and report issues.
            </p>
          </section>

          {/* What it does */}
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-primary">
                What this tool does
              </h2>
              <p className="mt-3 text-sm leading-6 text-secondary">
                The agent answers questions using uploaded active MFP publications. It is designed
                to help you find information faster and point you back to supporting source material.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-primary">
                What this tool does not do
              </h2>
              <p className="mt-3 text-sm leading-6 text-secondary">
                It does not replace approved publications, Extension guidance, or expert judgment.
                For food preservation decisions, always review the cited source before relying on an answer.
              </p>
            </div>
          </section>

          {/* Questions */}
          <section className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-primary">
              How to ask good questions
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-300 p-4">
                <h3 className="font-semibold text-primary">Good examples</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">
                  <li>How do I safely dry herbs?</li>
                  <li>What does the publication say about smoked fish storage?</li>
                  <li>Can I use low-temperature pasteurization for pickles?</li>
                  <li>What are the safety concerns for garlic in oil?</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-300 p-4">
                <h3 className="font-semibold text-primary">Less helpful examples</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">
                  <li>Tell me everything about food.</li>
                  <li>What should I do?</li>
                  <li>Is this safe?</li>
                  <li>Give me a recipe.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Testing */}
          <section className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-primary">
              How to test the agent
            </h2>

            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-secondary">
              <li>Start with a clear question about a food preservation topic.</li>
              <li>Try different answer modes: General, Recipe, Compare, and Safety.</li>
              <li>Use Category or Publication filters to narrow the answer.</li>
              <li>Ask a follow-up question in the same chat.</li>
              <li>Click the source links and verify the answer against the publication.</li>
              <li>Use Helpful, Not helpful, or Missing source feedback after reviewing the response.</li>
            </ol>
          </section>

          {/* Evidence */}
          <section className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-primary">
              Understanding evidence
            </h2>

            <div className="mt-4 space-y-3 text-sm text-secondary">
              <p><strong>Strong:</strong> Multiple supporting pages or excerpts were found.</p>
              <p><strong>Moderate:</strong> More than one supporting page or excerpt was found.</p>
              <p><strong>Limited:</strong> Only one supporting page or excerpt was found.</p>
              <p><strong>Not found:</strong> The agent could not find enough support in the selected publications.</p>
            </div>
          </section>

          {/* Issues */}
          <section className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-primary">
              When to report an issue
            </h2>

            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-secondary">
              <li>The answer seems unsupported by the sources.</li>
              <li>The source link opens the wrong document or page.</li>
              <li>The answer says “not found,” but you know the topic exists in a publication.</li>
              <li>The answer is confusing, incomplete, or too vague.</li>
              <li>A document appears to be missing from the publication list.</li>
            </ul>
          </section>

          {/* Links */}
          <section className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-primary">
              Quick links
            </h2>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/chat"
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
              >
                Go to Chat
              </Link>

              <Link
                href="/dashboard"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-gray-100"
              >
                Dashboard
              </Link>

              <Link
                href="/request-access"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-gray-100"
              >
                Request Access
              </Link>

              <Link
                href="/report-issue"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-gray-100"
              >
                Report an Issue
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}