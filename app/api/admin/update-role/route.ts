import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { emailTemplate } from '@/lib/email/template'

export async function POST(request: Request) {
  try {
    const { userId, role } = await request.json()

    if (!userId || !['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'userId and role (admin|user) required' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token)
    if (!caller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin' || !callerProfile?.is_active) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    if (caller.id === userId && role !== 'admin') {
      return NextResponse.json({ error: 'You cannot remove your own admin role.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (role === 'admin' && process.env.RESEND_API_KEY) {
      const [{ data: { user: targetUser } }, { data: targetProfile }] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(userId),
        supabaseAdmin.from('profiles').select('full_name').eq('id', userId).single(),
      ])

      if (targetUser?.email) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
        const name = targetProfile?.full_name || 'there'
        await resend.emails.send({
          from: 'MFP Volunteer Resource Hub <mfp@titus225.com>',
          to: targetUser.email,
          bcc: process.env.ADMIN_NOTIFICATION_EMAIL || undefined,
          subject: 'You now have admin access — MFP Volunteer Resource Hub',
          html: emailTemplate(`
            <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">You've been granted admin access</h2>
            <p>Hello ${name},</p>
            <p>An administrator has granted you admin access to the MFP Volunteer Resource Hub. You will now see an <strong>Admin</strong> button in the navigation menu.</p>
            <p>From the Admin area you can manage users, review publications, view audit logs, and more.</p>
            <p style="margin-top:24px;">
              <a href="${siteUrl}/admin" style="display:inline-block;background-color:#d73f09;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Go to Admin Dashboard</a>
            </p>
          `),
        })
      }
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: caller.id,
      actor_role: 'admin',
      action: role === 'admin' ? 'grant_admin' : 'revoke_admin',
      target_type: 'user',
      target_id: userId,
      status: 'success',
      metadata: { new_role: role },
    })

    return NextResponse.json({ message: `Role updated to ${role}.` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}
