import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, storage_path')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { data: pages } = await supabaseAdmin
      .from('document_pages')
      .select('openai_file_id')
      .eq('document_id', documentId)

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })

    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID!

    for (const page of pages ?? []) {
      if (!page.openai_file_id) continue

      try {
        await openai.vectorStores.files.delete(vectorStoreId, page.openai_file_id)
      } catch {
        // Ignore if already removed from vector store.
      }

      try {
        await openai.files.delete(page.openai_file_id)
      } catch {
        // Ignore if already deleted from OpenAI files.
      }

    }

    if (doc.storage_path) {
      await supabaseAdmin.storage.from('pdfs').remove([doc.storage_path])
    }

    await supabaseAdmin
      .from('document_pages')
      .delete()
      .eq('document_id', documentId)

    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedOpenAIPageFiles: pages?.length ?? 0,
    })
  } catch (error: any) {
    console.error('DELETE DOCUMENT ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown delete error' },
      { status: 500 }
    )
  }
}