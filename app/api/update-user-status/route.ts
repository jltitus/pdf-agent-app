import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, isActive } = await request.json()

    if (!email || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing email or isActive value' },
        { status: 400 }
      )
    }

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

    const normalizedEmail = String(email).trim().toLowerCase()

    const { data: usersList, error: usersListError } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (usersListError) {
      return NextResponse.json({ error: usersListError.message }, { status: 500 })
    }

    const targetUser = usersList.users.find(
      (user: any) => user.email?.toLowerCase() === normalizedEmail
    )

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found in Auth' }, { status: 404 })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUser.id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      message: isActive ? 'User reactivated.' : 'User deactivated.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown user status update error' },
      { status: 500 }
    )
  }
}