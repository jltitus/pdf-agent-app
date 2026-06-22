import Link from 'next/link'

export const metadata = { title: 'Before & after jar display — MFP Outreach' }

export default function BeforeAfterPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f7f4ef]">
      <div className="flex items-center justify-between px-4 py-2">
        <Link href="/games" className="text-sm font-semibold text-[#d73f09] hover:underline">← Back to Outreach</Link>
        <a href="/games/before-after/before-after-app.html" target="_blank" className="text-sm font-semibold text-[#1976D2] hover:underline">Open full screen ↗</a>
      </div>
      <iframe src="/games/before-after/before-after-app.html" title="Before & after jar display" className="w-full flex-1 border-0" />
    </main>
  )
}
