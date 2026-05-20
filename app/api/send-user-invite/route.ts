import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { generateTempPassword } from '@/lib/auth/generateTempPassword'

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
    subject: 'Your MFP Publication Reference system login information',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Welcome${fullName ? `, ${fullName}` : ''}!</h2>

        <p>
          Your account for the <strong>MFP Publication Reference system</strong>
          is ready.
        </p>

        <h3>Temporary Login Information</h3>

        <p>
          <strong>Email:</strong><br />
          ${email}
        </p>

        <p>
          <strong>Temporary Password:</strong><br />
          ${tempPassword}
        </p>

        <p>
          <a
            href="${siteUrl}/login"
            style="display:inline-block;background:#111827;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;"
          >
            Log In
          </a>
        </p>

        <p>
          After logging in, you will immediately be asked to create your own password.
        </p>

        <p>
          If you have trouble logging in, contact the app administrator.
        </p>
      </div>
    `,
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
