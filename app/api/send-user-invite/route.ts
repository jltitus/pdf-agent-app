import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { generateTempPassword } from '@/lib/auth/generateTempPassword'
import { emailTemplate } from '@/lib/email/template'

async function requireAdmin(request: Request, supabaseAdmin: any) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Missing auth token' },
        { status: 401 }
      ),
    }
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      ),
    }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' || !profile?.is_active) {
    return {
      error: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    }
  }

  return { user }
}

async function sendOnboardingEmail({
  email,
  fullName,
  tempPassword,
  siteUrl,
}: {
  email: string
  fullName: string
  tempPassword: string
  siteUrl: string
}) {
  if (!process.env.RESEND_API_KEY) return

  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'MFP Reference system <mfp@titus225.com>',
    to: email,
    bcc: process.env.ADMIN_NOTIFICATION_EMAIL || undefined,
    subject: 'Your MFP Volunteer Resource Hub login information',
    html: emailTemplate(`
      <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">Welcome${fullName ? `, ${fullName}` : ''}!</h2>
      <p>Your account for the MFP Volunteer Resource Hub is ready. Use the temporary login information below to sign in for the first time.</p>
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
  const rateLimitResponse = checkRateLimit(
    request,
    rateLimitConfigs.adminInvite
  )

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { fullName, email } = await request.json()

    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Missing full name or email' },
        { status: 400 }
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const adminCheck = await requireAdmin(request, supabaseAdmin)

    if (adminCheck.error) {
      return adminCheck.error
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_SITE_URL' },
        { status: 500 }
      )
    }

    const tempPassword = generateTempPassword()

    const { data: existingUsers } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

    const existingUser = existingUsers.users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail
    )

    let userId = ''

    if (existingUser) {
      userId = existingUser.id

      const { error } =
        await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            password: tempPassword,
            email_confirm: true,
          }
        )

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
    } else {
      const { data, error } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
        })

      if (error || !data.user) {
        return NextResponse.json(
          {
            error:
              error?.message ??
              'Could not create user',
          },
          { status: 500 }
        )
      }

      userId = data.user.id
    }

    const { error: profileError } =
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        role: 'member',
        is_active: true,
        must_change_password: true,
      })

  if (profileError) {
  return NextResponse.json(
    { error: profileError.message },
    { status: 500 }
  )
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
    return NextResponse.json(
      { error: updateRequestError.message },
      { status: 500 }
    )
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
    return NextResponse.json(
      { error: insertRequestError.message },
      { status: 500 }
    )
  }
}

await sendOnboardingEmail({
  email: normalizedEmail,
  fullName,
  tempPassword,
  siteUrl,
})

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      tempPassword,
      message:
        'Temporary password created and emailed successfully.',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ??
          'Unknown invite error',
      },
      { status: 500 }
    )
  }
  
}
