import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getAuthUser(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = adminClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  return user ?? null
}

// GET /api/contacts
// ?full=true → returns full profile data for each saved contact
// default   → returns just saved_user_ids for fast bookmark lookup
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const supabase = adminClient()
  const full = request.nextUrl.searchParams.get('full') === 'true'

  if (full) {
    const { data, error } = await supabase
      .from('saved_contacts')
      .select(`
        saved_user_id,
        created_at,
        profile:profiles!saved_contacts_saved_user_id_fkey (
          id, full_name, city, county, state, mfp_affiliation,
          specialties, website_url, social_url, profile_url,
          avatar_url, bio, phone, show_phone, show_email, email
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const contacts = (data ?? [])
      .map((row: any) => row.profile)
      .filter(Boolean)

    return NextResponse.json({ contacts })
  }

  const { data, error } = await supabase
    .from('saved_contacts')
    .select('saved_user_id')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ contactIds: (data ?? []).map((r) => r.saved_user_id) })
}

// POST /api/contacts  { savedUserId }
export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { savedUserId } = await request.json()
  if (!savedUserId) return NextResponse.json({ error: 'Missing savedUserId' }, { status: 400 })
  if (savedUserId === user.id) return NextResponse.json({ error: 'Cannot save yourself' }, { status: 400 })

  const supabase = adminClient()
  const { error } = await supabase
    .from('saved_contacts')
    .upsert({ user_id: user.id, saved_user_id: savedUserId }, { onConflict: 'user_id,saved_user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/contacts  { savedUserId }
export async function DELETE(request: Request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { savedUserId } = await request.json()
  if (!savedUserId) return NextResponse.json({ error: 'Missing savedUserId' }, { status: 400 })

  const supabase = adminClient()
  const { error } = await supabase
    .from('saved_contacts')
    .delete()
    .eq('user_id', user.id)
    .eq('saved_user_id', savedUserId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
