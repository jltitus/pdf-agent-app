'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function HeaderBar({
  user,
  isAdmin,
}: {
  user?: any
  isAdmin?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const { createClient } = await import('../../lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function navClass(path: string) {
    const active = pathname === path

    return active
      ? 'rounded-lg bg-black px-3 py-2 text-sm font-medium text-white'
      : 'rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white/60'
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-gradient-to-r from-blue-100 via-blue-50 to-green-100 shadow-sm">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img
              src="/jar-logosm.png"
              alt="MFP Publication Agent logo"
              className="h-11 w-11 object-contain"
            />

            <div>
              <h1 className="text-xl font-bold">MFP Publication Agent</h1>
              <p className="text-xs tracking-wide text-gray-600">
                MASTER FOOD PRESERVERS
              </p>
            </div>
          </Link>

          <div className="flex flex-col gap-3 md:items-end">
            <nav className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard" className={navClass('/dashboard')}>
                🏠 Dashboard
              </Link>

              <Link href="/chat" className={navClass('/chat')}>
                💬 Chat
              </Link>

              <Link href="/help" className={navClass('/help')}>
                ❔ Help
              </Link>

              {isAdmin && (
                <Link href="/admin" className={navClass('/admin')}>
                  ⚙️ Admin
                </Link>
              )}
            </nav>

            {user && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-700">
                  {user.email}
                </span>

                {isAdmin && (
                  <span className="rounded-full border bg-white/60 px-2 py-0.5 text-xs">
                    admin
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="underline hover:text-black"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}