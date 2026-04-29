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
      ? 'rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white shadow'
      : 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-gray-100'
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-300 bg-gradient-to-r from-blue-100 via-blue-50 to-green-100 text-primary shadow-sm">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img
              src="/jar-logosm.png"
              alt="MFP Publication Agent logo"
              className="h-10 w-10 object-contain"
            />

            <div>
              <h1 className="text-lg font-bold leading-tight text-primary sm:text-xl">
                MFP Publication Agent
              </h1>
              <p className="text-xs font-semibold tracking-wide text-secondary">
                MASTER FOOD PRESERVERS
              </p>
            </div>
          </Link>

          <nav className="grid grid-cols-4 gap-2">
            <Link href="/dashboard" className={navClass('/dashboard')}>
              <span className="flex flex-col items-center leading-tight">
                <span>🏠</span>
                <span className="text-[11px]">Home</span>
              </span>
            </Link>

            <Link href="/chat" className={navClass('/chat')}>
              <span className="flex flex-col items-center leading-tight">
                <span>💬</span>
                <span className="text-[11px]">Chat</span>
              </span>
            </Link>

            <Link href="/help" className={navClass('/help')}>
              <span className="flex flex-col items-center leading-tight">
                <span className="text-lg">❓</span>
                <span className="text-[11px]">Help</span>
              </span>
            </Link>

            {isAdmin ? (
              <Link href="/admin" className={navClass('/admin')}>
                <span className="flex flex-col items-center leading-tight">
                  <span>⚙️</span>
                  <span className="text-[11px]">Admin</span>
                </span>
              </Link>
            ) : (
              <Link href="/request-access" className={navClass('/request-access')}>
                <span className="flex flex-col items-center leading-tight">
                  <span>➕</span>
                  <span className="text-[11px]">Access</span>
                </span>
              </Link>
            )}
          </nav>

          {userInfo && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-300 pt-2 text-xs text-primary sm:text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-primary">
                  {userInfo.name}
                </span>

                {isAdmin && (
                  <span className="shrink-0 rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold text-secondary">
                    admin
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="shrink-0 font-semibold text-primary underline hover:text-black"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}