import Link from 'next/link'

export const metadata = {
  title: 'Is This Safe? — MFP Outreach',
}

// Self-contained sort app lives at public/games/sorting/sort-app.html (also runs
// offline). Embedded here inside the authenticated shell. /games is members-only
// (proxy.ts), which gates the iframe document and its cards.json.
export default function SortingGamePage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f7f4ef]">
      <div className="flex items-center justify-between px-4 py-2">
        <Link href="/games" className="text-sm font-semibold text-[#d73f09] hover:underline">
          ← Back to Outreach
        </Link>
        <a
          href="/games/sorting/sort-app.html"
          target="_blank"
          className="text-sm font-semibold text-[#1976D2] hover:underline"
        >
          Open full screen ↗
        </a>
      </div>
      <iframe
        src="/games/sorting/sort-app.html"
        title="Is this safe? Sorting game"
        className="w-full flex-1 border-0"
      />
    </main>
  )
}
