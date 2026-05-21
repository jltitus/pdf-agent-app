import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export async function POST(req: NextRequest) {
  try {
    const { title, body, url } = await req.json()

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    webpush.setVapidDetails(
      'mailto:jonatitus@gmail.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    )

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')

    const payload = JSON.stringify({ title, body, url: url ?? '/publications' })
    const results = await Promise.allSettled(
      (subscriptions ?? []).map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return NextResponse.json({ ok: true, sent })
  } catch {
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}
