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

  const { data, error: releasesError } = await supabase
    .from('releases')
    .select('*')
    .order('created_at', { ascending: false })

  if (releasesError) {
    return NextResponse.json({ error: releasesError.message }, { status: 500 })
  }

  return NextResponse.json({ releases: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabase, userId, error } = await requireAdmin(request)

  if (!supabase || !userId) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body?.version) {
    return NextResponse.json({ error: 'Version is required.' }, { status: 400 })
  }

  const { data, error: insertError } = await supabase
    .from('releases')
    .insert({
      version: body.version,
      title: body.title || null,
      description: body.description || null,
      status: body.status || 'planned',
      planned_release_date: body.plannedReleaseDate || null,
      created_by: userId,
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ release: data })
}

export async function PATCH(request: NextRequest) {
  const { supabase, error } = await requireAdmin(request)

  if (!supabase) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body?.releaseId) {
    return NextResponse.json({ error: 'Release ID is required.' }, { status: 400 })
  }

  const updates = {
    version: body.version,
    title: body.title || null,
    description: body.description || null,
    status: body.status,
    planned_release_date: body.plannedReleaseDate || null,
    deployed_at: body.deployedAt || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error: updateError } = await supabase
    .from('releases')
    .update(updates)
    .eq('id', body.releaseId)
    .select('*')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ release: data })
}

export async function DELETE(request: NextRequest) {
  const { supabase, error } = await requireAdmin(request)

  if (!supabase) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body?.releaseId) {
    return NextResponse.json({ error: 'Release ID is required.' }, { status: 400 })
  }

  const { data: deploymentRows, error: deploymentError } = await supabase
    .from('deployment_history')
    .select('id')
    .eq('release_id', body.releaseId)
    .limit(1)

  if (deploymentError) {
    return NextResponse.json({ error: deploymentError.message }, { status: 500 })
  }

  if ((deploymentRows ?? []).length > 0) {
    const { data, error: archiveError } = await supabase
      .from('releases')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.releaseId)
      .select('*')
      .single()

    if (archiveError) {
      return NextResponse.json({ error: archiveError.message }, { status: 500 })
    }

    return NextResponse.json({
      release: data,
      action: 'archived',
      message: 'Release has deployment history, so it was archived instead of deleted.',
    })
  }

  const { error: deleteError } = await supabase
    .from('releases')
    .delete()
    .eq('id', body.releaseId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    action: 'deleted',
    message: 'Release deleted.',
  })
}