import Link from 'next/link'

export const metadata = {
  title: 'Food preservation trivia — MFP Outreach',
}

// The wheel itself is a self-contained static app at public/games/prize-wheel-app.html
// (also used offline on a tablet). We embed it here so it lives inside the
// authenticated app shell with a back link. The /games route is members-only
// (proxy.ts), which gates the iframe document and questions.json too.
export default function PrizeWheelPage() {
  return (
    <main className="flex h-[calc(100vh-0px)] min-h-screen flex-col bg-[#f7f4ef]">
      <div className="flex items-center justify-between px-4 py-2">
        <Link
          href="/games"
          className="text-sm font-semibold text-[#d73f09] hover:underline"
        >
          ← Back to Games
        </Link>
        <a
          href="/games/prize-wheel-app.html"
          target="_blank"
          className="text-sm font-semibold text-[#1976D2] hover:underline"
        >
          Open full screen ↗
        </a>
      </div>
      <iframe
        src="/games/prize-wheel-app.html"
        title="Food preservation trivia"
        className="w-full flex-1 border-0"
      />
    </main>
  )
}
