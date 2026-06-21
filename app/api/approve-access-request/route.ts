import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { generateTempPassword } from '@/lib/auth/generateTempPassword'
import { emailTemplate } from '@/lib/email/template'

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sendTemporaryPasswordEmail({
  email,
  fullName,
  tempPassword,
  siteUrl,
}: {
  email: string
  fullName?: string | null
  tempPassword: string
  siteUrl: string
}) {
  if (!process.env.RESEND_API_KEY) return

  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'MFP Volunteer Resource Hub <mfp@titus225.com>',
    to: email,
    bcc: process.env.ADMIN_NOTIFICATION_EMAIL || undefined,
    subject: 'Your MFP Volunteer Resource Hub login information',
    html: emailTemplate(`
      <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">Your access has been approved</h2>
      <p>Hello ${fullName || 'there'},</p>
      <p>Your account is ready. Use the temporary login information below to sign in for the first time.</p>
      <table style="margin:20px 0;background:#f7f4ef;border-radius:10px;padding:16px 20px;width:100%;">
        <tr><td style="font-size:13px;color:#666;padding-bottom:4px;">Email</td></tr>
        <tr><td style="font-weight:600;color:#1a1a1a;padding-bottom:12px;">${email}</td></tr>
        <tr><td style="font-size:13px;color:#666;padding-bottom:4px;">Temporary password</td></tr>
        <tr><td style="font-weight:600;color:#1a1a1a;font-size:18px;letter-spacing:0.05em;">${tempPassword}</td></tr>
      </table>
      <p>
        <a href="${siteUrl}/login" style="display:inline-block;background:#d73f09;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Log In Now
        </a>
      </p>
      <p style="color:#666;font-size:14px;">After logging in you will be asked to create your own permanent password. If you have trouble, contact the app administrator.</p>
    `),
  })
}

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

    const supabaseAdmin = createSupabaseAdmin()

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_SITE_URL environment variable' },
        { status: 500 }
      )
    }

    const normalizedEmail = String(accessRequest.email).trim().toLowerCase()
    const tempPassword = generateTempPassword()

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

    let approvedUserId = ''

    if (existingUser) {
      approvedUserId = existingUser.id

      const { error: updateUserError } =
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: tempPassword,
          email_confirm: true,
        })

      if (updateUserError) {
        return NextResponse.json({ error: updateUserError.message }, { status: 500 })
      }
    } else {
      const { data: createdUser, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: accessRequest.full_name,
          },
        })

      if (createUserError || !createdUser.user) {
        return NextResponse.json(
          { error: createUserError?.message ?? 'Could not create approved user' },
          { status: 500 }
        )
      }

      approvedUserId = createdUser.user.id
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: approvedUserId,
        full_name: accessRequest.full_name,
        role: 'member',
        is_active: true,
        must_change_password: true,
      })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('access_requests')
      .update({
        status: 'approved',
        approved_at: now,
        approved_by: adminUser.id,
        last_invited_at: now,
        invite_count: (accessRequest.invite_count ?? 0) + 1,
      })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await sendTemporaryPasswordEmail({
      email: normalizedEmail,
      fullName: accessRequest.full_name,
      tempPassword,
      siteUrl,
    })

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      tempPassword,
      message: 'Access approved. Temporary password created and emailed.',
    })
  } catch (error: any) {
    console.error('APPROVE ACCESS REQUEST ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown approval error' },
      { status: 500 }
    )
  }
}