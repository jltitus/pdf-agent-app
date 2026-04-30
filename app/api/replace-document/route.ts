import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
    }

    const formData = await request.formData()

    const oldDocumentId = String(formData.get('oldDocumentId') || '')
    const title = String(formData.get('title') || '')
    const category = String(formData.get('category') || '')
    const version = String(formData.get('version') || '')
    const publicationDate = String(formData.get('publicationDate') || '')
    const notes = String(formData.get('documentNotes') || '')
    const file = formData.get('file') as File | null

    if (!oldDocumentId) {
      return NextResponse.json({ error: 'Missing oldDocumentId' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'Missing replacement PDF file' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
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

    const { data: oldDoc, error: oldDocError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', oldDocumentId)
      .single()

    if (oldDocError || !oldDoc) {
      return NextResponse.json({ error: 'Original document not found' }, { status: 404 })
    }

    const safeFileName = file.name.replaceAll(' ', '-')
    const storagePath = `${user.id}/${Date.now()}-${safeFileName}`

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('pdfs')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Replacement upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: newDoc, error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        title: title || oldDoc.title,
        filename: file.name,
        category: category || oldDoc.category,
        version,
        publication_date: publicationDate || null,
        document_notes: notes || null,
        is_active: true,
        storage_path: storagePath,
        uploaded_by: user.id,
      })
      .select('id')
      .single()

    if (insertError || !newDoc) {
      return NextResponse.json(
        { error: `Replacement document record failed: ${insertError?.message}` },
        { status: 500 }
      )
    }

    const { error: updateOldError } = await supabaseAdmin
      .from('documents')
      .update({
        is_active: false,
        replaced_by_document_id: newDoc.id,
        replaced_at: new Date().toISOString(),
      })
      .eq('id', oldDocumentId)

    if (updateOldError) {
      return NextResponse.json(
        { error: `Original document archive failed: ${updateOldError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      oldDocumentId,
      newDocumentId: newDoc.id,
      message: 'Replacement uploaded. Process the new document next.',
    })
  } catch (error: any) {
    console.error('REPLACE DOCUMENT ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown replacement error' },
      { status: 500 }
    )
  }
}