import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { emailTemplate } from '../../../../lib/email/template'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' || !profile?.is_active) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId, question, answer } = await request.json()
    if (!userId || !question || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    const recipientEmail = targetUser?.user?.email
    if (!recipientEmail) {
      return NextResponse.json({ error: 'Could not find user email' }, { status: 404 })
    }

    const html = emailTemplate(`
      <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1a1a1a;">
        We found an answer to your question
      </p>
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">
        Your question
      </p>
      <p style="margin:0 0 24px;padding:12px 16px;background:#f7f4ef;border-radius:8px;font-size:15px;color:#1a1a1a;">
        ${question}
      </p>
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">
        Answer
      </p>
      <div style="margin:0 0 24px;padding:12px 16px;background:#fff7f4;border-left:3px solid #d73f09;border-radius:0 8px 8px 0;font-size:15px;color:#1a1a1a;line-height:1.7;">
        ${answer.replace(/\n/g, '<br />')}
      </div>
      <p style="margin:0;font-size:13px;color:#888;">
        This answer has been reviewed by an administrator and added to our reference system
        so others asking similar questions will find it right away.
      </p>
    `)

    await resend.emails.send({
      from: 'MFP Reference System <noreply@mfp.jonatitus.com>',
      to: recipientEmail,
      subject: 'We found an answer to your question',
      html,
    })

    return NextResponse.json({ ok: true, sentTo: recipientEmail })
  } catch (err) {
    console.error('SEND ANSWER TO USER ERROR:', err)
    return NextResponse.json({ error: 'Failed to send answer' }, { status: 500 })
  }
}
