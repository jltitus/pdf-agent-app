import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Release notes are not configured.' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('releases')
    .select('id, version, title, description, status, planned_release_date, deployed_at, updated_at')
    .in('status', ['production', 'archived'])
    .order('deployed_at', { ascending: false, nullsFirst: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ releases: data ?? [] })
}