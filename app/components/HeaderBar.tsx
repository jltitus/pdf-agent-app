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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      'flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold shadow-sm transition',
      active
        ? 'border-black bg-black text-white'
        : 'border-gray-300 bg-white text-primary hover:bg-gray-100',
    ].join(' ')
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-300 bg-gradient-to-r from-blue-100 via-blue-50 to-green-100 text-primary shadow-sm">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
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

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-xl font-bold text-primary shadow-sm hover:bg-gray-100 lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? '×' : '☰'}
          </button>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-2 lg:flex"
          >
            <Link href="/dashboard" className={navClass('/dashboard')}>
              🏠 Home
            </Link>

            <Link href="/chat" className={navClass('/chat')}>
              <span className="flex items-center gap-2">
                <Image
                  src="/chat-icon.png"
                  alt=""
                  width={18}
                  height={18}
                  className="h-5 w-5 object-contain"
                />
                Chat
              </span>
            </Link>

            <Link href="/publications" className={navClass('/publications')}>
              📚 Publications
            </Link>

            <Link href="/help" className={navClass('/help')}>
              ❓ Help
            </Link>

            {isAdmin ? (
              <Link href="/admin" className={navClass('/admin')}>
                ⚙️ Admin
              </Link>
            ) : (
              <Link href="/request-access" className={navClass('/request-access')}>
                ➕ Access
              </Link>
            )}

            {userInfo && (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-gray-100"
              >
                Sign out
              </button>
            )}
          </nav>
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="mt-3 grid grid-cols-2 gap-2 lg:hidden"
          >
            <Link
              href="/dashboard"
              className={navClass('/dashboard')}
              onClick={closeMobileMenu}
            >
              🏠 Home
            </Link>

            <Link
              href="/chat"
              className={navClass('/chat')}
              onClick={closeMobileMenu}
            >
              💬 Chat
            </Link>

            <Link
              href="/publications"
              className={navClass('/publications')}
              onClick={closeMobileMenu}
            >
              📚 Publications
            </Link>

            <Link
              href="/help"
              className={navClass('/help')}
              onClick={closeMobileMenu}
            >
              ❓ Help
            </Link>

            {isAdmin ? (
              <Link
                href="/admin"
                className={navClass('/admin')}
                onClick={closeMobileMenu}
              >
                ⚙️ Admin
              </Link>
            ) : (
              <Link
                href="/request-access"
                className={navClass('/request-access')}
                onClick={closeMobileMenu}
              >
                ➕ Access
              </Link>
            )}

            {userInfo && (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-sm font-semibold text-primary shadow-sm transition hover:bg-gray-100"
              >
                Sign out
              </button>
            )}
          </nav>
        )}

        {userInfo && (
          <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-gray-300 pt-2 text-xs text-primary sm:text-sm">
            <span className="truncate font-medium text-primary">
              {userInfo.name}
            </span>

            {isAdmin && (
              <span className="shrink-0 rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold text-secondary">
                admin
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}