import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type AdminNoteEntityType = 'issue_report' | 'chat_feedback' | 'enhancement_request'

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

function isValidEntityType(value: string | null): value is AdminNoteEntityType {
  return value === 'issue_report' || value === 'chat_feedback' || value === 'enhancement_request'
}

export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request)

    if ('error' in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const { supabaseAdmin } = adminCheck
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const entityIds = searchParams
      .get('entityIds')
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    if (!isValidEntityType(entityType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('admin_notes')
      .select('id, entity_type, entity_id, note_text, created_at, admin_user_id')
      .eq('entity_type', entityType)
      .order('created_at', { ascending: false })

    if (entityId) {
      query = query.eq('entity_id', entityId)
    } else if (entityIds && entityIds.length > 0) {
      query = query.in('entity_id', entityIds)
    } else {
      return NextResponse.json({ error: 'Missing entity id' }, { status: 400 })
    }

    const { data, error } = await query.limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notes: data ?? [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown admin notes error' },
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
    const { entityType, entityId, noteText } = await request.json()

    if (!isValidEntityType(entityType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json({ error: 'Missing entity id' }, { status: 400 })
    }

    if (!noteText || typeof noteText !== 'string' || noteText.trim().length === 0) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('admin_notes')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        note_text: noteText.trim(),
        admin_user_id: user.id,
      })
      .select('id, entity_type, entity_id, note_text, created_at, admin_user_id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ note: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown admin notes error' },
      { status: 500 }
    )
  }
}
