import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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
    subject: 'MFP Publication Agent setup link resent',
    html: `
      <h2>Hello${fullName ? `, ${fullName}` : ''}!</h2>
      <p>Your MFP Publication Agent setup/reset email has been resent.</p>
      <p><strong>Next steps:</strong></p>
      <ol>
        <li>Check your inbox and spam folder for the setup/reset email.</li>
        <li>Set your password.</li>
        <li>Go to <a href="${siteUrl}/login">${siteUrl}/login</a>.</li>
        <li>Review the Help page before testing.</li>
      </ol>
      <p>If you still cannot get in, contact the app admin.</p>
    `,
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
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_SITE_URL environment variable' },
        { status: 500 }
      )
    }

    const normalizedEmail = String(accessRequest.email).trim().toLowerCase()

    await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${siteUrl}/update-password`,
    })

    const now = new Date().toISOString()

    await supabaseAdmin
      .from('access_requests')
      .update({
        last_invited_at: now,
        invite_count: (accessRequest.invite_count ?? 0) + 1,
      })
      .eq('id', requestId)

    await sendOnboardingEmail({
      email: normalizedEmail,
      fullName: accessRequest.full_name,
      siteUrl,
    })

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      message: 'Setup/reset email resent. User should check their inbox and spam folder.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown resend invite error' },
      { status: 500 }
    )
  }
}