import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseForRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return { supabase: null, error: 'Missing authorization token.' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return { supabase: null, error: 'Supabase environment variables are missing.' }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  return { supabase, error: null }
}

async function requireAdmin(request: NextRequest) {
  const { supabase, error } = getSupabaseForRequest(request)

  if (!supabase) {
    return { supabase: null, userId: null, error }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { supabase: null, userId: null, error: 'Unauthorized.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin' || !profile?.is_active) {
    return { supabase: null, userId: null, error: 'Admin access required.' }
  }

  return { supabase, userId: user.id, error: null }
}

export async function GET(request: NextRequest) {
  const { supabase, error } = await requireAdmin(request)

  if (!supabase) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { data, error: historyError } = await supabase
    .from('deployment_history')
    .select('*, releases(version, title, status)')
    .order('deployed_at', { ascending: false })

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 })
  }

  return NextResponse.json({ deployments: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabase, userId, error } = await requireAdmin(request)

  if (!supabase || !userId) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body?.releaseId) {
    return NextResponse.json({ error: 'Release ID is required.' }, { status: 400 })
  }

  const { data, error: insertError } = await supabase
    .from('deployment_history')
    .insert({
      release_id: body.releaseId,
      deployed_by: userId,
      environment: body.environment || 'production',
      deployment_notes: body.deploymentNotes || null,
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await supabase
    .from('releases')
    .update({
      status: 'production',
      deployed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.releaseId)

  return NextResponse.json({ deployment: data })
}