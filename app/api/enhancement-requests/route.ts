import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type EnhancementStatus = 'new' | 'reviewed' | 'planned' | 'in_progress' | 'resolved' | 'declined'
type EnhancementPriority = 'low' | 'medium' | 'high'
type EnhancementSourceType = 'manual' | 'chat_feedback' | 'issue_report'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return { error: 'Missing auth token', status: 401 as const }
  }

  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return { error: 'Not authenticated', status: 401 as const }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin' || !profile?.is_active) {
    return { error: 'Admin access required', status: 403 as const }
  }

  return { supabaseAdmin, user }
}

function isValidStatus(value: unknown): value is EnhancementStatus {
  return value === 'new' || value === 'reviewed' || value === 'planned' || value === 'in_progress' || value === 'resolved' || value === 'declined'
}

function isValidPriority(value: unknown): value is EnhancementPriority {
  return value === 'low' || value === 'medium' || value === 'high'
}

function isValidSourceType(value: unknown): value is EnhancementSourceType {
  return value === 'manual' || value === 'chat_feedback' || value === 'issue_report'
}

export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request)

    if ('error' in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const { supabaseAdmin } = adminCheck
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('enhancement_requests')
      .select('id, source_type, source_id, title, description, status, priority, admin_user_id, created_at, updated_at, resolved_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (status && status !== 'all') {
      if (!isValidStatus(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ enhancements: data ?? [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown enhancement request error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request)

    if ('error' in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const { supabaseAdmin, user } = adminCheck
    const body = await request.json()
    const sourceType = body.sourceType ?? 'manual'
    const sourceId = body.sourceId ?? null
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const status = body.status ?? 'new'
    const priority = body.priority ?? 'medium'

    if (!isValidSourceType(sourceType)) {
      return NextResponse.json({ error: 'Invalid source type' }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    if (!isValidStatus(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (!isValidPriority(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }

    if (sourceType !== 'manual' && !sourceId) {
      return NextResponse.json({ error: 'Source id is required for sourced enhancements' }, { status: 400 })
    }

    const insertPayload = {
      source_type: sourceType,
      source_id: sourceId || null,
      title,
      description,
      status,
      priority,
      admin_user_id: user.id,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    }

    const { data, error } = await supabaseAdmin
      .from('enhancement_requests')
      .insert(insertPayload)
      .select('id, source_type, source_id, title, description, status, priority, admin_user_id, created_at, updated_at, resolved_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An enhancement request already exists for this source.' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ enhancement: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown enhancement create error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const adminCheck = await requireAdmin(request)

    if ('error' in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const { supabaseAdmin } = adminCheck
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''

    if (!id) {
      return NextResponse.json({ error: 'Enhancement id is required' }, { status: 400 })
    }

    const updates: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    }

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
      updates.resolved_at = body.status === 'resolved' ? new Date().toISOString() : null
    }

    if (body.priority !== undefined) {
      if (!isValidPriority(body.priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
      }
      updates.priority = body.priority
    }

    if (body.title !== undefined) {
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (!title) return NextResponse.json({ error: 'Title cannot be blank' }, { status: 400 })
      updates.title = title
    }

    if (body.description !== undefined) {
      const description = typeof body.description === 'string' ? body.description.trim() : ''
      if (!description) return NextResponse.json({ error: 'Description cannot be blank' }, { status: 400 })
      updates.description = description
    }

    const { data, error } = await supabaseAdmin
      .from('enhancement_requests')
      .update(updates)
      .eq('id', id)
      .select('id, source_type, source_id, title, description, status, priority, admin_user_id, created_at, updated_at, resolved_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ enhancement: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown enhancement update error' },
      { status: 500 }
    )
  }
}
