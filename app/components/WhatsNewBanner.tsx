'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function WhatsNewBanner() {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissedVersion = localStorage.getItem(
      'mfpDismissedVersion'
    )

    if (dismissedVersion !== appVersion) {
      setVisible(true)
    }
  }, [appVersion])

  function dismissBanner() {
    localStorage.setItem(
      'mfpDismissedVersion',
      appVersion
    )

    setVisible(false)
  }

  if (!visible) {
    return null
  }

  return (
    <div className="border-b border-blue-200 bg-blue-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-900">
            What’s new in v{appVersion}
          </p>

          <p className="mt-1 text-sm text-blue-800">
            New releases, deployment tracking, smoke testing,
            release planning, and operational improvements are now available.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/whats-new"
            className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100"
          >
            View updates
          </Link>

          <button
            type="button"
            onClick={dismissBanner}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-gray-100"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}