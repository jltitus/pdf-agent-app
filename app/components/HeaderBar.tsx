'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

type Profile = {
  role: string | null
  full_name: string | null
}

export default function HeaderBar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user

      if (!user) return

      setEmail(user.email ?? null)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
    }

    loadUser()
  }, [supabase])

  const linkStyle = (path: string) =>
    `rounded-lg px-3 py-2 text-sm ${
      pathname === path
        ? 'bg-black text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/dashboard" className="text-xl font-bold">
            MFP Publication Agent
          </Link>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Master Food Preservers
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard" className={linkStyle('/dashboard')}>
            Dashboard
          </Link>

          <Link href="/chat" className={linkStyle('/chat')}>
            Chat
          </Link>

          {profile?.role === 'admin' && (
            <Link href="/admin" className={linkStyle('/admin')}>
              Admin
            </Link>
          )}
        </nav>

        <div className="flex flex-col items-start gap-1 text-sm md:items-end">
          {email && (
            <div className="text-gray-600">
              {profile?.full_name || email}
              {profile?.role && (
                <span className="ml-2 rounded-full border px-2 py-0.5 text-xs">
                  {profile.role}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}