'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import Link from 'next/link'

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
    setMenuOpen(false)
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: '🏠' },
    { href: '/chat', label: 'Chat', icon: '💬' },
    { href: '/publications', label: 'Publications', icon: '📚' },
    { href: '/profile', label: 'Profile', icon: '👤' },
    { href: '/community', label: 'Community', icon: '🌱' },
    { href: '/help', label: 'Help', icon: '❓' },
  ]

  const adminItem = isAdmin
    ? { href: '/admin', label: 'Admin', icon: '⚙️' }
    : { href: '/request-access', label: 'Access', icon: '➕' }

  function isActive(path: string) {
    return pathname === path || (path === '/admin' && pathname.startsWith('/admin'))
  }

  function desktopNavClass(path: string) {
    return [
      'inline-flex min-h-9 items-center rounded-xl px-2.5 py-1.5 text-sm font-semibold transition',
      isActive(path)
        ? 'bg-[#d73f09] text-white shadow-sm'
        : 'text-primary hover:bg-[#f3f0ed] hover:text-black',
    ].join(' ')
  }

  function mobileNavClass(path: string) {
    return [
      'flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold shadow-sm transition',
      isActive(path)
        ? 'border-[#d73f09] bg-[#d73f09] text-white'
        : 'border-[#d8d1c7] bg-white text-primary hover:bg-[#f3f0ed]',
    ].join(' ')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#d8d1c7] bg-[#fcfaf7] text-primary shadow-sm">
      <div className="h-1 bg-[#d73f09]" />

      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-2xl font-bold leading-none text-primary shadow-sm lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-main-menu"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {menuOpen ? '×' : '☰'}
            </button>

            <a
              href="/dashboard"
              className="flex min-w-0 shrink-0 items-center gap-3"
              onClick={() => setMenuOpen(false)}
            >
              <img
                src="/jar-logosm.png"
                alt="MFP Publication Reference system logo"
                className="h-10 w-10 shrink-0 object-contain"
              />

              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-tight text-primary sm:text-xl">
                  MFP Publication Reference system
                </h1>
                <p className="truncate text-[10px] font-semibold tracking-wide text-secondary sm:text-xs">
                  MASTER FOOD PRESERVERS
                </p>
              </div>
            </a>
          </div>

          <nav aria-label="Main navigation" className="hidden flex-1 items-center justify-end gap-1 lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} prefetch={false} className={desktopNavClass(item.href)}>
  <span className="mr-1" aria-hidden="true">{item.icon}</span>
  {item.label}
</Link>
            ))}

            <div className="mx-1 h-6 w-px bg-[#d8d1c7]" />

            <a href={adminItem.href} className={desktopNavClass(adminItem.href)}>
              <span className="mr-1" aria-hidden="true">{adminItem.icon}</span>
              {adminItem.label}
            </a>

            {userInfo && (
              <button
                type="button"
                onClick={handleSignOut}
                className="ml-1 inline-flex min-h-9 items-center rounded-xl border border-[#d8d1c7] bg-white px-3 py-1.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-[#f3f0ed]"
              >
                Sign out
              </button>
            )}
          </nav>
        </div>

        {menuOpen && (
          <nav
            id="mobile-main-menu"
            aria-label="Mobile navigation"
            className="mt-3 grid grid-cols-2 gap-2 border-t border-[#d8d1c7] pt-3 sm:grid-cols-3 lg:hidden"
          >
            {[...navItems, adminItem].map((item) => (
              <Link
  key={item.href}
  href={item.href}
  prefetch={false}
  onClick={() => setMenuOpen(false)}
  className={mobileNavClass(item.href)}
>
                <span className="mr-1" aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}

            {userInfo && (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-11 items-center justify-center rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-[#f3f0ed]"
              >
                Sign out
              </button>
            )}
          </nav>
        )}

<div className="mt-3 min-h-[34px] border-t border-[#d8d1c7] pt-2">
  {userInfo ? (
    <div className="flex flex-col gap-2 text-xs text-primary sm:flex-row sm:items-center sm:justify-between sm:text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-primary">
          {userInfo.name}
        </span>

        {isAdmin && (
          <span className="shrink-0 rounded-full border border-[#d8d1c7] bg-white px-2 py-0.5 text-xs font-semibold text-secondary">
            admin
          </span>
        )}
      </div>

      <Link href="/whats-new" prefetch={false}  className="w-fit text-xs font-semibold text-[#d73f09] underline hover:text-[#b23408]"
      >
        v{appVersion} • What’s New
      </Link>
    </div>
  ) : (
    <div className="h-[20px]" aria-hidden="true" />
  )}
</div>
      </div>
    </header>
  )
}