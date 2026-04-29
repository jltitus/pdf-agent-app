import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function requireAdmin(request: Request, supabaseAdmin: any) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return { error: NextResponse.json({ error: 'Missing auth token' }, { status: 401 }) }
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' || !profile?.is_active) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user }
}

export async function POST(request: Request) {
  try {
    const { fullName, email } = await request.json()

    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Missing full name or email' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const adminCheck = await requireAdmin(request, supabaseAdmin)
    if (adminCheck.error) return adminCheck.error

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_SITE_URL environment variable' },
        { status: 500 }
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const { data: usersList, error: usersListError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

    if (usersListError) {
      return NextResponse.json({ error: usersListError.message }, { status: 500 })
    }

    const existingUser = usersList.users.find(
      (user: any) => user.email?.toLowerCase() === normalizedEmail
    )

    let userId = ''
    let message = ''

    if (existingUser) {
      userId = existingUser.id

      await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${siteUrl}/update-password`,
      })

      message =
        'User already existed. Their profile was activated and a password reset/setup email was sent.'
    } else {
      const { data: invitedUser, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
          redirectTo: `${siteUrl}/update-password`,
          data: { full_name: fullName },
        })

      if (inviteError || !invitedUser.user) {
        return NextResponse.json(
          { error: inviteError?.message ?? 'Could not invite user' },
          { status: 500 }
        )
      }

      userId = invitedUser.user.id
      message = 'Invitation email sent. User will set their own password.'
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      role: 'member',
      is_active: true,
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    await supabaseAdmin.from('access_requests').upsert(
      {
        email: normalizedEmail,
        full_name: fullName,
        reason: 'Direct admin invite',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminCheck.user.id,
      },
      { onConflict: 'email' }
    )

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      message,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown invite error' },
      { status: 500 }
    )
  }
}