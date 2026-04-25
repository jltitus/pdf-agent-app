'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function AuthTestPage() {
  const supabase = createClient()
  const [result, setResult] = useState('Checking...')

  useEffect(() => {
    async function checkAuth() {
      const { data, error } = await supabase.auth.getSession()

      setResult(
        JSON.stringify(
          {
            hasSession: !!data.session,
            userEmail: data.session?.user?.email ?? null,
            error: error?.message ?? null,
          },
          null,
          2
        )
      )
    }

    checkAuth()
  }, [supabase])

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test</h1>
      <pre className="rounded-lg border p-4 whitespace-pre-wrap">{result}</pre>
    </main>
  )
}