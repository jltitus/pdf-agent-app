import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { emailTemplate } from '@/lib/email/template'

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
  }

  const supabaseAdmin = createSupabaseAdmin()

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin' || !adminProfile?.is_active) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { data: requests, error: requestsError } = await supabaseAdmin
    .from('access_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (requestsError) {
    return NextResponse.json({ error: requestsError.message }, { status: 500 })
  }

  const { data: authUsersResult, error: authUsersError } =
    await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (authUsersError) {
    return NextResponse.json({ error: authUsersError.message }, { status: 500 })
  }

  const authUsers = authUsersResult.users ?? []
  const authUserByEmail = new Map(
    authUsers
      .filter((authUser: any) => authUser.email)
      .map((authUser: any) => [authUser.email.toLowerCase(), authUser])
  )

  const userIds = authUsers.map((authUser: any) => authUser.id)

  const { data: profiles } = await supabaseAdmin
  .from('profiles')
  .select(`
    id,
    role,
    is_active,
    last_activity_at,
    last_login_at,
    last_chat_at,
    total_questions_asked
  `)
  .in('id', userIds)

  const profileById = new Map(
    (profiles ?? []).map((profile: any) => [profile.id, profile])
  )

  const { data: chatRows } = await supabaseAdmin
    .from('chat_history')
    .select('user_id, question, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })

  const latestChatByUserId = new Map<string, any>()

  for (const row of chatRows ?? []) {
    if (!latestChatByUserId.has(row.user_id)) {
      latestChatByUserId.set(row.user_id, row)
    }
  }

  const enrichedRequests = (requests ?? []).map((request: any) => {
    const normalizedEmail = String(request.email ?? '').trim().toLowerCase()
    const authUser = authUserByEmail.get(normalizedEmail)
    const profile = authUser ? profileById.get(authUser.id) : null
    const latestChat = authUser ? latestChatByUserId.get(authUser.id) : null

    return {
  ...request,

  profile_is_active: profile?.is_active ?? null,
  profile_role: profile?.role ?? null,

  last_activity_at:
    profile?.last_activity_at ??
    latestChat?.created_at ??
    null,

  last_login_at:
    profile?.last_login_at ?? null,

  last_chat_at:
    profile?.last_chat_at ??
    latestChat?.created_at ??
    null,

  total_questions_asked:
    profile?.total_questions_asked ?? 0,

  last_question:
    latestChat?.question ?? null,
}
  })

  return NextResponse.json({ requests: enrichedRequests })
}

export async function POST(request: Request) {
  try {
    const { fullName, email, reason } = await request.json()

    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Missing name or email' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()
    const normalizedEmail = String(email).trim().toLowerCase()

    const { data: existingRequest } = await supabaseAdmin
      .from('access_requests')
      .select('id, status')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            existingRequest.status === 'approved'
              ? 'This email already has approved access. Try logging in or using Forgot Password.'
              : 'An access request already exists for this email.',
        },
        { status: 409 }
      )
    }

    const { error: insertError } = await supabaseAdmin
      .from('access_requests')
      .insert({
        full_name: fullName,
        email: normalizedEmail,
        reason: reason || null,
        status: 'pending',
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    if (process.env.RESEND_API_KEY && process.env.ADMIN_NOTIFICATION_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

      const { error: emailError } = await resend.emails.send({
        from: 'MFP Reference system <mfp@titus225.com>',
        to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: 'New Access Request',
        html: emailTemplate(`
          <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">New Access Request</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;border-bottom:1px solid #e5e1db;font-size:13px;color:#666;width:80px;">Name</td><td style="padding:8px 0;border-bottom:1px solid #e5e1db;font-weight:600;">${fullName}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e5e1db;font-size:13px;color:#666;">Email</td><td style="padding:8px 0;border-bottom:1px solid #e5e1db;">${normalizedEmail}</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#666;">Reason</td><td style="padding:8px 0;">${reason || 'Not provided'}</td></tr>
          </table>
          ${siteUrl ? `<p style="margin-top:20px;"><a href="${siteUrl}/admin" style="display:inline-block;background:#d73f09;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Review in Admin</a></p>` : ''}
        `),
      })

      if (emailError) {
        return NextResponse.json(
          {
            error: `Access request saved, but email notification failed: ${emailError.message}`,
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Access request submitted.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown access request error' },
      { status: 500 }
    )
  }
}