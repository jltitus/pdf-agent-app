import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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

async function sendOnboardingEmail({
  email,
  fullName,
  siteUrl,
}: {
  email: string
  fullName: string
  siteUrl: string
}) {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_NOTIFICATION_EMAIL) return

  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'MFP Agent <mfp@titus225.com>',
    to: email,
    bcc: process.env.ADMIN_NOTIFICATION_EMAIL,
    subject: 'Welcome to the MFP Publication Agent',
    html: `
      <h2>Welcome${fullName ? `, ${fullName}` : ''}!</h2>
      <p>You have been invited to use the MFP Publication Agent.</p>
      <p><strong>Next steps:</strong></p>
      <ol>
        <li>Open the setup email from Supabase and set your password.</li>
        <li>Go to <a href="${siteUrl}/login">${siteUrl}/login</a>.</li>
        <li>Use the Help page first for testing instructions.</li>
        <li>If something seems wrong, use Help Report an Issue.</li>
      </ol>
      <p>If the setup email is expired or missing, use “Forgot password” from the login page.</p>
    `,
  })
}

export async function POST(request: Request) {
  try {
    const { fullName, email } = await request.json()

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Missing full name or email' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
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

    const { data: usersList, error: usersListError } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })

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

      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo: `${siteUrl}/update-password` }
      )

      if (resetError) {
        return NextResponse.json({ error: resetError.message }, { status: 500 })
      }

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

    const now = new Date().toISOString()

    const { data: existingAccessRequest } = await supabaseAdmin
      .from('access_requests')
      .select('id, invite_count')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingAccessRequest) {
      const { error: updateRequestError } = await supabaseAdmin
        .from('access_requests')
        .update({
          full_name: fullName,
          reason: 'Direct admin invite',
          status: 'approved',
          approved_at: now,
          approved_by: adminCheck.user.id,
          last_invited_at: now,
          invite_count: (existingAccessRequest.invite_count ?? 0) + 1,
        })
        .eq('id', existingAccessRequest.id)

      if (updateRequestError) {
        return NextResponse.json({ error: updateRequestError.message }, { status: 500 })
      }
    } else {
      const { error: insertRequestError } = await supabaseAdmin
        .from('access_requests')
        .insert({
          email: normalizedEmail,
          full_name: fullName,
          reason: 'Direct admin invite',
          status: 'approved',
          approved_at: now,
          approved_by: adminCheck.user.id,
          last_invited_at: now,
          invite_count: 1,
        })

      if (insertRequestError) {
        return NextResponse.json({ error: insertRequestError.message }, { status: 500 })
      }
    }

    await sendOnboardingEmail({
      email: normalizedEmail,
      fullName,
      siteUrl,
    })

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