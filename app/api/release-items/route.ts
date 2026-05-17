import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseForRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return { supabase: null, error: 'Missing authorization token.' }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return { supabase: null, error: 'Supabase environment variables are missing.' }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  return { supabase, error: null }
}

async function requireAdmin(request: NextRequest) {
  const { supabase, error } = getSupabaseForRequest(request)

  if (!supabase) return { supabase: null, error }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { supabase: null, error: 'Unauthorized.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' || !profile?.is_active) {
    return { supabase: null, error: 'Admin access required.' }
  }

  return { supabase, error: null }
}

export async function GET(request: NextRequest) {
  const { supabase, error } = await requireAdmin(request)

  if (!supabase) return NextResponse.json({ error }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const releaseId = searchParams.get('releaseId')

  let query = supabase
    .from('release_items')
    .select(`
      id,
      release_id,
      enhancement_request_id,
      issue_report_id,
      item_type,
      created_at,
      enhancement_requests (
        id,
        title,
        description,
        status,
        priority,
        category,
        release_status,
        created_at
      ),
      issue_reports (
        id,
        issue_type,
        description,
        related_question,
        status,
        user_email,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (releaseId) query = query.eq('release_id', releaseId)

  const { data, error: itemsError } = await query

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ releaseItems: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabase, error } = await requireAdmin(request)

  if (!supabase) return NextResponse.json({ error }, { status: 401 })

  const body = await request.json().catch(() => null)

  if (!body?.releaseId || !body?.itemType) {
    return NextResponse.json(
      { error: 'Release ID and item type are required.' },
      { status: 400 }
    )
  }

  if (body.itemType === 'enhancement' && !body.enhancementRequestId) {
    return NextResponse.json(
      { error: 'Enhancement request ID is required.' },
      { status: 400 }
    )
  }

  if (body.itemType === 'issue' && !body.issueReportId) {
    return NextResponse.json(
      { error: 'Issue report ID is required.' },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from('release_items')
    .select('id')
    .eq('release_id', body.releaseId)
    .eq(
      body.itemType === 'enhancement'
        ? 'enhancement_request_id'
        : 'issue_report_id',
      body.itemType === 'enhancement'
        ? body.enhancementRequestId
        : body.issueReportId
    )
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'This item is already attached to the release.' },
      { status: 409 }
    )
  }

  const { data, error: insertError } = await supabase
    .from('release_items')
    .insert({
      release_id: body.releaseId,
      item_type: body.itemType,
      enhancement_request_id:
        body.itemType === 'enhancement' ? body.enhancementRequestId : null,
      issue_report_id: body.itemType === 'issue' ? body.issueReportId : null,
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  if (body.itemType === 'enhancement') {
    await supabase
      .from('enhancement_requests')
      .update({
        release_status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.enhancementRequestId)
  }

  if (body.itemType === 'issue') {
    await supabase
      .from('issue_reports')
      .update({
        status: 'enhancement_candidate',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.issueReportId)
  }

  return NextResponse.json({ releaseItem: data })
}

export async function DELETE(request: NextRequest) {
  const { supabase, error } = await requireAdmin(request)

  if (!supabase) return NextResponse.json({ error }, { status: 401 })

  const body = await request.json().catch(() => null)

  if (!body?.releaseItemId) {
    return NextResponse.json(
      { error: 'Release item ID is required.' },
      { status: 400 }
    )
  }

  const { data: item } = await supabase
    .from('release_items')
    .select('id, enhancement_request_id, issue_report_id, item_type')
    .eq('id', body.releaseItemId)
    .single()

  const { error: deleteError } = await supabase
    .from('release_items')
    .delete()
    .eq('id', body.releaseItemId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (item?.item_type === 'enhancement' && item.enhancement_request_id) {
    await supabase
      .from('enhancement_requests')
      .update({
        release_status: 'new',
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.enhancement_request_id)
  }

  return NextResponse.json({ success: true })
}