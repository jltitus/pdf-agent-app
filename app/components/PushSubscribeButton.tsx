'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function PushSubscribeButton() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true)
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
      })
    }
  }, [])

  async function getToken() {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }

  async function subscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      })
      const token = await getToken()
      if (!token) return
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sub.toJSON()),
      })
      setSubscribed(true)
    } catch {
      // User denied or browser error
    }
    setLoading(false)
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      const token = await getToken()
      if (!token) return
      await fetch('/api/push-subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
      setSubscribed(false)
    } catch {}
    setLoading(false)
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-[#d8d1c7] bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-[#f3f0ed] disabled:opacity-50"
    >
      {subscribed ? '🔔 Notifications on' : '🔕 Get new publication alerts'}
    </button>
  )
}
