'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import WhatsNewBanner from './WhatsNewBanner'
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
  const [menuOpen, setMenuOpen] = useState(false)

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
    const active =
      pathname === path || (path === '/admin' && pathname.startsWith('/admin'))

    return [
      'flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold shadow-sm transition',
      active
        ? 'border-black bg-black text-white'
        : 'border-gray-300 bg-white text-primary hover:bg-gray-100',
    ].join(' ')
  }

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: '🏠' },
    { href: '/chat', label: 'Chat', icon: '👤' },
    { href: '/publications', label: 'Publications', icon: '📚' },
    { href: '/whats-new', label: 'What’s New', icon: '✨' },
    { href: '/help', label: 'Help', icon: '❓' },
    isAdmin
      ? { href: '/admin', label: 'Admin', icon: '⚙️' }
      : { href: '/request-access', label: 'Access', icon: '➕' },
  ]

  return (
  <>
    <WhatsNewBanner />

    <header className="sticky top-0 z-50 border-b border-gray-300 bg-gradient-to-r from-blue-100 via-blue-50 to-green-100 text-primary shadow-sm">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6">

        {/* TOP BAR */}

        <div className="flex items-center gap-3">

          {/* MOBILE MENU BUTTON */}

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="shrink-0 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-primary shadow-sm lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-main-menu"
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>

          {/* LOGO + TITLE */}

          <Link
            href="/dashboard"
            className="flex min-w-0 flex-1 items-center gap-3"
            onClick={() => setMenuOpen(false)}
          >
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

          {/* DESKTOP NAV */}

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-2 lg:flex"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navClass(item.href)}
              >
                <span className="mr-1" aria-hidden="true">
                  {item.icon}
                </span>

                {item.label}
              </Link>
            ))}

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

        {/* MOBILE MENU */}

        {menuOpen && (
          <nav
            id="mobile-main-menu"
            aria-label="Mobile navigation"
            className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-300 pt-3 sm:grid-cols-3 lg:hidden"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={navClass(item.href)}
              >
                <span className="mr-1" aria-hidden="true">
                  {item.icon}
                </span>

                {item.label}
              </Link>
            ))}

            {userInfo && (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-gray-100"
              >
                Sign out
              </button>
            )}
          </nav>
        )}

        {/* USER INFO BAR */}

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
  </>
  )
}