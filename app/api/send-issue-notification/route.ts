import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailTemplate } from '@/lib/email/template'

export async function POST(request: Request) {
  try {
    const { issueType, description, relatedQuestion, userEmail } =
      await request.json()

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Missing RESEND_API_KEY environment variable' },
        { status: 500 }
      )
    }

    if (!process.env.ADMIN_NOTIFICATION_EMAIL) {
      return NextResponse.json(
        { error: 'Missing ADMIN_NOTIFICATION_EMAIL environment variable' },
        { status: 500 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error } = await resend.emails.send({
      from: 'MFP Reference system <mfp@titus225.com>',
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      subject: `New Issue Report: ${issueType}`,
      html: emailTemplate(`
        <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">New Issue Report</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #e5e1db;font-size:13px;color:#666;width:120px;">Type</td><td style="padding:8px 0;border-bottom:1px solid #e5e1db;font-weight:600;">${issueType}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e5e1db;font-size:13px;color:#666;">User</td><td style="padding:8px 0;border-bottom:1px solid #e5e1db;">${userEmail || 'Unknown'}</td></tr>
          ${relatedQuestion ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e1db;font-size:13px;color:#666;">Related question</td><td style="padding:8px 0;border-bottom:1px solid #e5e1db;">${relatedQuestion}</td></tr>` : ''}
        </table>
        <p style="margin-top:16px;font-size:13px;color:#666;">Description</p>
        <p style="background:#f7f4ef;border-radius:8px;padding:12px;margin:0;">${description}</p>
      `),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Issue notification failed' },
      { status: 500 }
    )
  }
}