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
    return {
      supabase: null,
      error: 'Supabase environment variables are missing.',
    }
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
    return {
      supabase: null,
      userId: null,
      error: 'Admin access required.',
    }
  }

  return { supabase, userId: user.id, error: null }
}

export async function GET(request: NextRequest) {
  const { supabase, error } = await requireAdmin(request)

  if (!supabase) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const deploymentId = searchParams.get('deploymentId')

  let query = supabase
    .from('deployment_smoke_tests')
    .select('*')
    .order('created_at', { ascending: true })

  if (deploymentId) {
    query = query.eq('deployment_id', deploymentId)
  }

  const { data, error: smokeTestError } = await query

  if (smokeTestError) {
    return NextResponse.json(
      { error: smokeTestError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ smokeTests: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabase, error } = await requireAdmin(request)

  if (!supabase) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body?.deploymentId || !body?.routePath) {
    return NextResponse.json(
      { error: 'Deployment ID and route path are required.' },
      { status: 400 }
    )
  }

  const { data, error: insertError } = await supabase
    .from('deployment_smoke_tests')
    .insert({
      deployment_id: body.deploymentId,
      route_path: body.routePath,
      test_status: body.testStatus || 'pending',
      notes: body.notes || null,
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ smokeTest: data })
}

export async function PATCH(request: NextRequest) {
  const { supabase, userId, error } = await requireAdmin(request)

  if (!supabase || !userId) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body?.smokeTestId) {
    return NextResponse.json(
      { error: 'Smoke test ID is required.' },
      { status: 400 }
    )
  }

  const status = body.testStatus || 'pending'
  const isCompleted = ['pass', 'fail', 'blocked'].includes(status)

  const { data, error: updateError } = await supabase
    .from('deployment_smoke_tests')
    .update({
      route_path: body.routePath,
      test_status: status,
      notes: body.notes || null,
      tested_by: isCompleted ? userId : null,
      tested_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.smokeTestId)
    .select('*')
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ smokeTest: data })
}

export async function DELETE(request: NextRequest) {
  const { supabase, error } = await requireAdmin(request)

  if (!supabase) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body?.smokeTestId) {
    return NextResponse.json(
      { error: 'Smoke test ID is required.' },
      { status: 400 }
    )
  }

  const { error: deleteError } = await supabase
    .from('deployment_smoke_tests')
    .delete()
    .eq('id', body.smokeTestId)

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Smoke test deleted.',
  })
}