import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestIp, getRequestUserAgent, logAuditEvent } from '../../../lib/audit/logAuditEvent'

export async function POST(request: Request) {
  const ipAddress = getRequestIp(request)
  const userAgent = getRequestUserAgent(request)

  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
    }

    const {
      documentId,
      title,
      category,
      version,
      publicationDate,
      documentNotes,
      approvalStatus,
    } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data: existingDoc } = await supabaseAdmin
      .from('documents')
      .select('id, title, filename, category, version, publication_date, approval_status, is_active')
      .eq('id', documentId)
      .single()

    const updatePayload: Record<string, any> = {
      title,
      category,
      version,
      publication_date: publicationDate || null,
      document_notes: documentNotes || null,
      updated_at: new Date().toISOString(),
    }

    if (approvalStatus) {
      updatePayload.approval_status = approvalStatus

      if (approvalStatus === 'active' || approvalStatus === 'approved') {
        updatePayload.approved_at = new Date().toISOString()
        updatePayload.approved_by = user.id
      }
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .update(updatePayload)
      .eq('id', documentId)

    if (error) {
      await logAuditEvent({
        supabaseAdmin,
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: profile.role,
        action: 'document.update_metadata',
        targetType: 'document',
        targetId: documentId,
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: {
          reason: error.message,
          attempted: updatePayload,
          previous: existingDoc ?? null,
        },
      })

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAuditEvent({
      supabaseAdmin,
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: profile.role,
      action: 'document.update_metadata',
      targetType: 'document',
      targetId: documentId,
      status: 'success',
      ipAddress,
      userAgent,
      metadata: {
        previous: existingDoc ?? null,
        updated: updatePayload,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown update error' },
      { status: 500 }
    )
  }
}