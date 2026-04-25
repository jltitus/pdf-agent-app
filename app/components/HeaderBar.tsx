'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function HeaderBar() {
  const pathname = usePathname()

  const linkStyle = (path: string) =>
    `px-4 py-2 rounded-md ${
      pathname === path ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <div className="w-full border-b bg-white px-6 py-4 flex items-center justify-between">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <div className="text-xl font-bold">MFP</div>
        <div className="text-gray-500 text-sm hidden sm:block">
          Publication Agent
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className={linkStyle('/dashboard')}>
          Dashboard
        </Link>
        <Link href="/chat" className={linkStyle('/chat')}>
          Chat
        </Link>
        <Link href="/admin" className={linkStyle('/admin')}>
          Admin
        </Link>
      </div>

      {/* Right side */}
      <div>
        <Link
          href="/login"
          className="text-sm text-gray-600 hover:underline"
        >
          Sign out
        </Link>
      </div>
    </div>
  )
}