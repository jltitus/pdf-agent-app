import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' || !profile?.is_active) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('access_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ requests: data ?? [] })
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
        from: 'MFP Agent <mfp@titus225.com>',
        to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: 'New Access Request',
        html: `
          <h2>New Access Request</h2>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${normalizedEmail}</p>
          <p><strong>Reason:</strong> ${reason || 'Not provided'}</p>
          ${
            siteUrl
              ? `<p><a href="${siteUrl}/admin">Review in Admin</a></p>`
              : ''
          }
        `,
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