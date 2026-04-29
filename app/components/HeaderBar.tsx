'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

type UserInfo = {
  email?: string | null
  name?: string | null
}

export default function HeaderBar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user

      if (!user) {
        setUserInfo(null)
        setIsAdmin(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('id', user.id)
        .single()

      setUserInfo({
        email: user.email,
        name: profile?.full_name || user.email,
      })

      setIsAdmin(profile?.role === 'admin' && profile?.is_active === true)
    }

    loadUser()
  }, [supabase])

  async function handleSignOut() {
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
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img
              src="/jar-logosm.png"
              alt="MFP Publication Agent logo"
              className="h-10 w-10 object-contain"
            />

            <div>
              <h1 className="text-lg font-bold sm:text-xl">
                MFP Publication Agent
              </h1>
              <p className="text-xs tracking-wide text-gray-600">
                MASTER FOOD PRESERVERS
              </p>
            </div>
          </Link>

          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <nav className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard" className={navClass('/dashboard')}>
                🏠 <span className="hidden sm:inline">Home</span>
              </Link>

              <Link href="/chat" className={navClass('/chat')}>
                💬 <span className="hidden sm:inline">Chat</span>
              </Link>

              <Link href="/help" className={navClass('/help')}>
                ❔ <span className="hidden sm:inline">Help</span>
              </Link>

              {isAdmin && (
                <Link href="/admin" className={navClass('/admin')}>
                  ⚙️ <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
            </nav>

            {userInfo && (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="max-w-[140px] truncate text-gray-700 sm:max-w-[220px]">
                  {userInfo.name}
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