'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
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

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'Not set'

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

    return [
      'flex min-h-14 items-center justify-center rounded-xl border px-2 py-2 text-center text-xs font-semibold shadow-sm transition sm:min-h-11 sm:px-3 sm:text-sm',
      active
        ? 'border-black bg-black text-white'
        : 'border-gray-300 bg-white text-primary hover:bg-gray-100',
    ].join(' ')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-300 bg-gradient-to-r from-blue-100 via-blue-50 to-green-100 text-primary shadow-sm">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <img
              src="/jar-logosm.png"
              alt="MFP Publication Agent logo"
              className="h-10 w-10 shrink-0 object-contain"
            />

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight text-primary sm:text-xl">
                MFP Publication Agent
              </h1>
              <p className="text-[10px] font-semibold tracking-wide text-secondary sm:text-xs">
                MASTER FOOD PRESERVERS
              </p>
            </div>
          </Link>

          <nav
            aria-label="Main navigation"
            className="grid grid-cols-3 gap-2 sm:grid-cols-7 lg:w-auto"
          >
            <Link href="/dashboard" className={navClass('/dashboard')}>
              <span className="flex flex-col items-center gap-1 leading-tight sm:flex-row">
                <span aria-hidden="true">🏠</span>
                <span>Home</span>
              </span>
            </Link>

            <Link href="/chat" className={navClass('/chat')}>
              <span className="flex flex-col items-center gap-1 leading-tight sm:flex-row">
                <Image
                  src="/chat-icon.png"
                  alt=""
                  width={18}
                  height={18}
                  className="h-5 w-5 object-contain"
                />
                <span>Chat</span>
              </span>
            </Link>

            <Link href="/publications" className={navClass('/publications')}>
              <span className="flex flex-col items-center gap-1 leading-tight sm:flex-row">
                <span aria-hidden="true">📚</span>
                <span>Publications</span>
              </span>
            </Link>

            <Link href="/whats-new" className={navClass('/whats-new')}>
              <span className="flex flex-col items-center gap-1 leading-tight sm:flex-row">
                <span aria-hidden="true">✨</span>
                <span>What’s New</span>
              </span>
            </Link>

            <Link href="/help" className={navClass('/help')}>
              <span className="flex flex-col items-center gap-1 leading-tight sm:flex-row">
                <span aria-hidden="true">❓</span>
                <span>Help</span>
              </span>
            </Link>

            {isAdmin ? (
              <Link href="/admin" className={navClass('/admin')}>
                <span className="flex flex-col items-center gap-1 leading-tight sm:flex-row">
                  <span aria-hidden="true">⚙️</span>
                  <span>Admin</span>
                </span>
              </Link>
            ) : (
              <Link href="/request-access" className={navClass('/request-access')}>
                <span className="flex flex-col items-center gap-1 leading-tight sm:flex-row">
                  <span aria-hidden="true">➕</span>
                  <span>Access</span>
                </span>
              </Link>
            )}

            {userInfo && (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-14 items-center justify-center rounded-xl border border-gray-300 bg-white px-2 py-2 text-xs font-semibold text-primary shadow-sm transition hover:bg-gray-100 sm:min-h-11 sm:px-3 sm:text-sm"
              >
                Sign out
              </button>
            )}
          </nav>
        </div>

        {userInfo && (
          <div className="mt-3 flex flex-col gap-2 border-t border-gray-300 pt-2 text-xs text-primary sm:flex-row sm:items-center sm:justify-between sm:text-sm">
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

            <Link
              href="/whats-new"
              className="w-fit text-xs font-semibold text-secondary underline hover:text-primary"
            >
              v{appVersion} • What’s New
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}