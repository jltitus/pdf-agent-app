import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdmin()

    const {
      data: { user: adminUser },
      error: adminUserError,
    } = await supabaseAdmin.auth.getUser(token)

    if (adminUserError || !adminUser) {
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

    if (adminUser.email?.toLowerCase() === normalizedEmail) {
      return NextResponse.json(
        { error: 'You cannot delete your own admin account.' },
        { status: 400 }
      )
    }

    const { data: usersList, error: usersListError } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (usersListError) {
      return NextResponse.json({ error: usersListError.message }, { status: 500 })
    }

    const targetUser = usersList.users.find(
      (user: any) => user.email?.toLowerCase() === normalizedEmail
    )

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found in Auth.' }, { status: 404 })
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetUser.id)

    if (deleteProfileError) {
      return NextResponse.json({ error: deleteProfileError.message }, { status: 500 })
    }

    const { error: updateRequestError } = await supabaseAdmin
      .from('access_requests')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('email', normalizedEmail)

    if (updateRequestError) {
      return NextResponse.json({ error: updateRequestError.message }, { status: 500 })
    }

    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(targetUser.id)

    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted. Chat history and feedback were kept for reporting.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown delete user error' },
      { status: 500 }
    )
  }
}