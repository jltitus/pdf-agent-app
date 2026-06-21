import Link from 'next/link'

export const metadata = {
  title: 'Canning timeline puzzle — MFP Outreach',
}

// Self-contained puzzle at public/games/timeline/timeline-app.html (also offline).
// Embedded in the authenticated shell. /games is members-only (proxy.ts).
export default function TimelinePuzzlePage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f7f4ef]">
      <div className="flex items-center justify-between px-4 py-2">
        <Link href="/games" className="text-sm font-semibold text-[#d73f09] hover:underline">
          ← Back to Outreach
        </Link>
        <a
          href="/games/timeline/timeline-app.html"
          target="_blank"
          className="text-sm font-semibold text-[#1976D2] hover:underline"
        >
          Open full screen ↗
        </a>
      </div>
      <iframe
        src="/games/timeline/timeline-app.html"
        title="Canning timeline puzzle"
        className="w-full flex-1 border-0"
      />
    </main>
  )
}
