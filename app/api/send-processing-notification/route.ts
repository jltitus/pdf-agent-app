import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailTemplate } from '@/lib/email/template'

export async function POST(request: Request) {
  try {
    const { title, filename, pagesProcessed } = await request.json()

    if (!process.env.RESEND_API_KEY || !process.env.ADMIN_NOTIFICATION_EMAIL) {
      return NextResponse.json({ error: 'Missing email configuration' }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const displayName = title || filename || 'Unknown document'

    const { error } = await resend.emails.send({
      from: 'MFP Reference system <mfp@titus225.com>',
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      subject: `PDF ready: ${displayName}`,
      html: emailTemplate(`
        <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">PDF Processing complete</h2>
        <p><strong>${displayName}</strong> has been indexed and is ready for AI search.</p>
        ${pagesProcessed ? `<p style="background:#f7f4ef;border-radius:8px;padding:12px;display:inline-block;"><strong>${pagesProcessed}</strong> pages processed</p>` : ''}
        <p style="color:#666;">Users can now ask questions about this publication.</p>
      `),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Notification failed' },
      { status: 500 },
    )
  }
}
