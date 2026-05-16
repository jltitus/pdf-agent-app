import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const resendKey = process.env.RESEND_API_KEY

    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_SITE_URL environment variable' },
        { status: 500 }
      )
    }

    if (!resendKey) {
      return NextResponse.json(
        { error: 'Missing RESEND_API_KEY environment variable' },
        { status: 500 }
      )
    }

    const normalizedEmail = String(accessRequest.email).trim().toLowerCase()

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

const { data: linkData, error: linkError } = existingUser
  ? await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${siteUrl}/update-password`,
      },
    })
  : await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: normalizedEmail,
      options: {
        redirectTo: `${siteUrl}/update-password`,
        data: {
          full_name: accessRequest.full_name,
        },
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: linkError?.message ?? 'Could not generate setup link' },
        { status: 500 }
      )
    }

    const approvedUserId =
      existingUser?.id ?? linkData.user?.id

    if (!approvedUserId) {
      return NextResponse.json(
        { error: 'Could not determine approved user ID' },
        { status: 500 }
      )
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

    const resend = new Resend(resendKey)

    await resend.emails.send({
      from: 'MFP Publication Agent <mfp@titus225.com>',
      to: normalizedEmail,
      bcc: process.env.ADMIN_NOTIFICATION_EMAIL || undefined,
      subject: 'Your MFP Publication Agent access has been approved',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h2>Your access has been approved</h2>

          <p>Hello ${accessRequest.full_name || ''},</p>

          <p>
            Your access to the <strong>MFP Publication Agent</strong> has been approved.
          </p>

          <p>
            Please use the button below to set your password and finish setting up your account.
          </p>

          <p>
            <a href="${linkData.properties.action_link}"
               style="display:inline-block;background:#111827;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;">
              Set your password
            </a>
          </p>

          <p>
            After your password is set, you can log in here:
            <br />
            <a href="${siteUrl}/login">${siteUrl}/login</a>
          </p>

          <h3>What you can do in the app</h3>
          <ul>
            <li>Ask questions across active MFP publications</li>
            <li>Review source references and page citations</li>
            <li>Open publication PDFs directly</li>
            <li>Report issues or missing source information</li>
          </ul>

          <p>
            If the button does not work, copy and paste this link into your browser:
          </p>

          <p style="word-break: break-all;">
            ${linkData.properties.action_link}
          </p>

          <p>
            Thank you,<br />
            MFP Publication Agent
          </p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      invited: !existingUser,
      message:
        'Access approved. Setup email sent with password instructions.',
    })
  } catch (error: any) {
    console.error('APPROVE ACCESS REQUEST ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown approval error' },
      { status: 500 }
    )
  }
}