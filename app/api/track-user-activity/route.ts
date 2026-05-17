import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

type ActivityType = 'login' | 'chat' | 'activity'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const activityType = body?.activityType as ActivityType | undefined

  const { data, error } = await supabase.rpc('track_profile_activity', {
    p_activity_type: activityType ?? 'activity',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}