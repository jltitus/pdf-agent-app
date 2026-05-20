'use client'

import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

const PdfViewerClient = dynamic(() => import('./PdfViewerClient'), { ssr: false })

function PdfViewerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const filename = searchParams.get('file')
  const pageParam = searchParams.get('page')
  const initialPage = pageParam ? Math.max(0, parseInt(pageParam, 10) - 1) : 0

  if (!filename) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        No document specified.
      </div>
    )
  }

  return (
    <div className="relative" style={{ height: '100dvh' }}>
      <button
        onClick={() => router.back()}
        className="absolute top-3 left-3 z-50 bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
      >
        ← Back
      </button>
      <PdfViewerClient filename={filename} initialPage={initialPage} />
    </div>
  )
}

export default function ViewPdfPage() {
  return (
    <Suspense>
      <PdfViewerPage />
    </Suspense>
  )
}
