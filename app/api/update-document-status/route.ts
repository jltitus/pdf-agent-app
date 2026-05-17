import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getRequestIp,
  getRequestUserAgent,
  logAuditEvent,
} from '../../../lib/audit/logAuditEvent'

export async function POST(request: Request) {
  const ipAddress = getRequestIp(request)
  const userAgent = getRequestUserAgent(request)

  try {
    const { documentId, isActive } = await request.json()

    if (!documentId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing documentId or isActive' },
        { status: 400 }
      )
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
      await logAuditEvent({
        supabaseAdmin,
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: profile?.role ?? null,
        action: 'document_status_update_denied',
        targetType: 'document',
        targetId: documentId,
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: { isActive },
      })

      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ is_active: isActive })
      .eq('id', documentId)

    if (updateError) {
      await logAuditEvent({
        supabaseAdmin,
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: profile.role,
        action: 'document_status_update_failed',
        targetType: 'document',
        targetId: documentId,
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: {
          isActive,
          error: updateError.message,
        },
      })

      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await logAuditEvent({
      supabaseAdmin,
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: profile.role,
      action: isActive ? 'document_unarchived' : 'document_archived',
      targetType: 'document',
      targetId: documentId,
      status: 'success',
      ipAddress,
      userAgent,
      metadata: { isActive },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('UPDATE DOCUMENT STATUS ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}