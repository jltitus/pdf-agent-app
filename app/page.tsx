'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import LogoutButton from './logout-button'

export default function HomePage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const user = data.session.user
      setEmail(user.email ?? null)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
      setLoading(false)
    }

    loadUser()
  }, [supabase])

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <p>Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">PDF Agent</h1>
          <LogoutButton />
        </div>

        <div className="rounded-2xl border p-6">
          <p className="mb-2">
            <strong>Signed in as:</strong> {email}
          </p>
          <p className="mb-2">
            <strong>Name:</strong> {profile?.full_name}
          </p>
          <p className="mb-2">
            <strong>Role:</strong> {profile?.role}
          </p>
        </div>
      </div>
    </main>
  )
}