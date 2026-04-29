import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { requestId } = await request.json()

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
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

    const { data: accessRequest, error: requestError } = await supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !accessRequest) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
    }

    if (accessRequest.status === 'approved') {
      return NextResponse.json({ error: 'Request is already approved' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_SITE_URL environment variable' },
        { status: 500 }
      )
    }

    const normalizedEmail = String(accessRequest.email).trim().toLowerCase()

    // Check whether the user already exists in Supabase Auth.
    // This prevents approval from failing when someone already registered or was invited before.
    const { data: usersList, error: usersListError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

    if (usersListError) {
      return NextResponse.json({ error: usersListError.message }, { status: 500 })
    }

    const existingUser = usersList.users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail
    )

    let approvedUserId: string
    let invited = false
    let message = ''

    if (existingUser) {
      approvedUserId = existingUser.id
      invited = false
      message =
        'User already existed. Their profile has been activated. Ask them to sign in or use Forgot Password if needed.'
    } else {
      const { data: invitedUser, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
          redirectTo: `${siteUrl}/update-password`,
          data: {
            full_name: accessRequest.full_name,
          },
        })

      if (inviteError || !invitedUser.user) {
        return NextResponse.json(
          { error: inviteError?.message ?? 'Could not invite user' },
          { status: 500 }
        )
      }

      approvedUserId = invitedUser.user.id
      invited = true
      message = 'Invitation email sent. User will set their own password.'
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: approvedUserId,
        full_name: accessRequest.full_name,
        role: 'member',
        is_active: true,
      })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('access_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.id,
      })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      invited,
      message,
    })
  } catch (error: any) {
    console.error('APPROVE ACCESS REQUEST ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown approval error' },
      { status: 500 }
    )
  }
}