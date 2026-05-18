import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestIp, getRequestUserAgent, logAuditEvent } from '../../../lib/audit/logAuditEvent'

export const maxDuration = 120

type ProcessingStatus =
  | 'pending'
  | 'validating'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'encrypted'
  | 'invalid_pdf'

function validateReplacementPdf(buffer: Buffer) {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      status: 'invalid_pdf' as ProcessingStatus,
      error: 'The replacement PDF is empty and cannot be uploaded.',
    }
  }

  const header = buffer.toString('utf8', 0, 8)

  if (!header.includes('%PDF')) {
    return {
      valid: false,
      status: 'invalid_pdf' as ProcessingStatus,
      error: 'The replacement file does not appear to be a valid PDF.',
    }
  }

  const rawPdfText = buffer.toString('latin1')

  if (rawPdfText.includes('/Encrypt')) {
    return {
      valid: false,
      status: 'encrypted' as ProcessingStatus,
      error:
        'The replacement PDF is encrypted or password protected. Please upload an unlocked PDF and try again.',
    }
  }

  return {
    valid: true,
    status: 'pending' as ProcessingStatus,
    error: null,
  }
}

export async function POST(request: Request) {
  const ipAddress = getRequestIp(request)
  const userAgent = getRequestUserAgent(request)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let uploadedStoragePath: string | null = null
  let newDocumentId: string | null = null
  let actorUserId: string | null = null
  let actorEmail: string | null = null
  let actorRole: string | null = null
  let auditOldDocumentId: string | null = null

  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token.' }, { status: 401 })
    }

    const formData = await request.formData()

    const oldDocumentId = String(formData.get('oldDocumentId') || '')
    auditOldDocumentId = oldDocumentId || null
    const title = String(formData.get('title') || '').trim()
    const category = String(formData.get('category') || '').trim()
    const version = String(formData.get('version') || '').trim()
    const publicationDate = String(formData.get('publicationDate') || '').trim()
    const notes = String(formData.get('documentNotes') || '').trim()
    const approvalStatus = String(formData.get('approvalStatus') || 'active').trim()
    const file = formData.get('file') as File | null

    if (!oldDocumentId) {
      return NextResponse.json({ error: 'Missing oldDocumentId.' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Missing replacement PDF file.' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed.' },
        { status: 400 }
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const validation = validateReplacementPdf(fileBuffer)

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error,
          processing_status: validation.status,
        },
        { status: 400 }
      )
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    actorUserId = user.id
    actorEmail = user.email ?? null

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    actorRole = profile?.role ?? null

    if (profile?.role !== 'admin' || !profile?.is_active) {
      return NextResponse.json(
        { error: 'Admin access required.' },
        { status: 403 }
      )
    }

    const { data: oldDoc, error: oldDocError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', oldDocumentId)
      .single()

    if (oldDocError || !oldDoc) {
      await logAuditEvent({
        supabaseAdmin,
        actorUserId,
        actorEmail,
        actorRole,
        action: 'document.replace',
        targetType: 'document',
        targetId: oldDocumentId,
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: { reason: 'Original document not found.' },
      })

      return NextResponse.json(
        { error: 'Original document not found.' },
        { status: 404 }
      )
    }

    if (oldDoc.processing_status === 'processing') {
      await logAuditEvent({
        supabaseAdmin,
        actorUserId,
        actorEmail,
        actorRole,
        action: 'document.replace',
        targetType: 'document',
        targetId: oldDocumentId,
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: {
          reason: 'Original document is currently processing.',
          oldTitle: oldDoc.title,
          oldFilename: oldDoc.filename,
        },
      })

      return NextResponse.json(
        {
          error:
            'The original document is currently processing. Wait for it to finish before replacing it.',
        },
        { status: 409 }
      )
    }

    const safeFileName = file.name.replaceAll(' ', '-')
    uploadedStoragePath = `${user.id}/${Date.now()}-${safeFileName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('pdfs')
      .upload(uploadedStoragePath, fileBuffer, {
        contentType: 'application/pdf',
      })

    if (uploadError) {
      await logAuditEvent({
        supabaseAdmin,
        actorUserId,
        actorEmail,
        actorRole,
        action: 'document.replace',
        targetType: 'document',
        targetId: oldDocumentId,
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: {
          reason: `Replacement upload failed: ${uploadError.message}`,
          oldTitle: oldDoc.title,
          oldFilename: oldDoc.filename,
          replacementFilename: file.name,
        },
      })

      return NextResponse.json(
        { error: `Replacement upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const replacementIsActive = approvalStatus !== 'draft' && approvalStatus !== 'pending_review'

    const { data: newDoc, error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        title: title || oldDoc.title,
        filename: file.name,
        category: category || oldDoc.category,
        version: version || null,
        publication_date: publicationDate || null,
        document_notes: notes || null,
        approval_status: approvalStatus || 'active',
        is_active: replacementIsActive,
        storage_path: uploadedStoragePath,
        uploaded_by: user.id,
        previous_document_id: oldDocumentId,
        processing_status: 'pending',
        processing_error: null,
        processing_progress: 0,
        processing_started_at: null,
        processing_completed_at: null,
        processing_attempts: 0,
        last_processed_page: 0,
        is_encrypted: false,
        file_size_bytes: fileBuffer.length,
      })
      .select('id')
      .single()

    if (insertError || !newDoc) {
      if (uploadedStoragePath) {
        await supabaseAdmin.storage.from('pdfs').remove([uploadedStoragePath])
      }

      await logAuditEvent({
        supabaseAdmin,
        actorUserId,
        actorEmail,
        actorRole,
        action: 'document.replace',
        targetType: 'document',
        targetId: oldDocumentId,
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: {
          reason: `Replacement document record failed: ${
            insertError?.message ?? 'No replacement record returned.'
          }`,
          oldTitle: oldDoc.title,
          oldFilename: oldDoc.filename,
          replacementFilename: file.name,
        },
      })

      return NextResponse.json(
        {
          error: `Replacement document record failed: ${
            insertError?.message ?? 'No replacement record returned.'
          }`,
        },
        { status: 500 }
      )
    }

    newDocumentId = newDoc.id

    const { error: updateOldError } = await supabaseAdmin
      .from('documents')
      .update({
        is_active: false,
        replaced_by_document_id: newDocumentId,
        replaced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', oldDocumentId)

    if (updateOldError) {
      await supabaseAdmin.from('documents').delete().eq('id', newDocumentId)

      if (uploadedStoragePath) {
        await supabaseAdmin.storage.from('pdfs').remove([uploadedStoragePath])
      }

      await logAuditEvent({
        supabaseAdmin,
        actorUserId,
        actorEmail,
        actorRole,
        action: 'document.replace',
        targetType: 'document',
        targetId: oldDocumentId,
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: {
          reason: `Original document archive failed: ${updateOldError.message}`,
          oldTitle: oldDoc.title,
          oldFilename: oldDoc.filename,
          newDocumentId,
          replacementFilename: file.name,
        },
      })

      return NextResponse.json(
        { error: `Original document archive failed: ${updateOldError.message}` },
        { status: 500 }
      )
    }

    await logAuditEvent({
      supabaseAdmin,
      actorUserId,
      actorEmail,
      actorRole,
      action: 'document.replace',
      targetType: 'document',
      targetId: oldDocumentId,
      status: 'success',
      ipAddress,
      userAgent,
      metadata: {
        oldDocumentId,
        newDocumentId,
        oldTitle: oldDoc.title,
        oldFilename: oldDoc.filename,
        replacementTitle: title || oldDoc.title,
        replacementFilename: file.name,
        replacementStoragePath: uploadedStoragePath,
        approvalStatus: approvalStatus || 'active',
        replacementIsActive,
        fileSizeBytes: fileBuffer.length,
      },
    })

    return NextResponse.json({
      success: true,
      oldDocumentId,
      newDocumentId,
      message:
        'Replacement PDF validated and uploaded. The new document is ready to process for AI search.',
    })
  } catch (error: any) {
    console.error('REPLACE DOCUMENT ERROR:', error)

    if (newDocumentId) {
      await supabaseAdmin.from('documents').delete().eq('id', newDocumentId)
    }

    if (uploadedStoragePath) {
      await supabaseAdmin.storage.from('pdfs').remove([uploadedStoragePath])
    }

    if (actorUserId) {
      await logAuditEvent({
        supabaseAdmin,
        actorUserId,
        actorEmail,
        actorRole,
        action: 'document.replace',
        targetType: 'document',
        targetId: auditOldDocumentId ?? newDocumentId,
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: {
          reason: error.message ?? 'Unknown replacement error.',
          newDocumentId,
          uploadedStoragePath,
        },
      })
    }

    return NextResponse.json(
      { error: error.message ?? 'Unknown replacement error.' },
      { status: 500 }
    )
  }
}
