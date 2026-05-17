import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('favorite_publications')
    .select(`
      id,
      created_at,
      document_id,
      documents (
        id,
        title,
        filename,
        category,
        version
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ favorites: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const documentId = body.documentId

  if (!documentId) {
    return NextResponse.json({ error: 'documentId required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('favorite_publications')
    .upsert(
      {
        user_id: user.id,
        document_id: documentId,
      },
      {
        onConflict: 'user_id,document_id',
        ignoreDuplicates: true,
      }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const documentId = body.documentId

  if (!documentId) {
    return NextResponse.json({ error: 'documentId required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('favorite_publications')
    .delete()
    .eq('user_id', user.id)
    .eq('document_id', documentId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}