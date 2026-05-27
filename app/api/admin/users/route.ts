import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
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
      data: { user: adminUser },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !adminUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', adminUser.id)
      .single()

    if (adminProfile?.role !== 'admin' || !adminProfile?.is_active) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, full_name, role, is_active, city, state, mfp_affiliation, last_login_at, last_activity_at, last_chat_at, total_questions_asked, avatar_url'
      )

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p])
    )

    const users = authData.users.map((authUser) => {
      const profile = profileMap[authUser.id]
      return {
        id: authUser.id,
        email: authUser.email ?? null,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at ?? null,
        full_name: profile?.full_name ?? null,
        role: profile?.role ?? null,
        is_active: profile?.is_active ?? null,
        city: profile?.city ?? null,
        state: profile?.state ?? null,
        mfp_affiliation: profile?.mfp_affiliation ?? null,
        last_login_at: profile?.last_login_at ?? null,
        last_activity_at: profile?.last_activity_at ?? null,
        last_chat_at: profile?.last_chat_at ?? null,
        total_questions_asked: profile?.total_questions_asked ?? 0,
        avatar_url: profile?.avatar_url ?? null,
        has_profile: !!profile,
      }
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
