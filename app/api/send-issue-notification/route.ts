import { NextResponse } from 'next/server'
import { Resend } from 'resend'

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
      from: 'MFP Agent <mfp@titus225.com>',
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      subject: `New Issue Report: ${issueType}`,
      html: `
        <h2>New Issue Report</h2>
        <p><strong>Type:</strong> ${issueType}</p>
        <p><strong>User:</strong> ${userEmail || 'Unknown'}</p>
        ${
          relatedQuestion
            ? `<p><strong>Related Question:</strong> ${relatedQuestion}</p>`
            : ''
        }
        <p><strong>Description:</strong></p>
        <p>${description}</p>
      `,
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