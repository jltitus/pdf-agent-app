import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' || !profile?.is_active) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('chat_history')
    .select('id, user_id, question, answer_mode, category, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const uniqueUserIds = new Set(rows.map((row) => row.user_id).filter(Boolean))

  const modeCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}

  rows.forEach((row) => {
    const mode = row.answer_mode || 'general'
    const category = row.category || 'Uncategorized'

    modeCounts[mode] = (modeCounts[mode] ?? 0) + 1
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1
  })

  return NextResponse.json({
    totalQuestions: rows.length,
    uniqueUsers: uniqueUserIds.size,
    modeCounts,
    categoryCounts,
    recentActivity: rows.slice(0, 10),
  })
}