import { NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { createClient } from '@supabase/supabase-js'
import PDFParser from 'pdf2json'

export const maxDuration = 120

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parsePdfPages(buffer: Buffer): Promise<{ pageNumber: number; text: string }[]> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData?.parserError || 'PDF parsing failed'))
    })

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      const pages =
        pdfData?.Pages?.map((page: any, index: number) => {
          const text =
            page.Texts?.map((textItem: any) =>
              textItem.R?.map((r: any) => safeDecode(r.T ?? '')).join(' ')
            )
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim() ?? ''

          return {
            pageNumber: index + 1,
            text,
          }
        }).filter((page: { pageNumber: number; text: string }) => page.text.length > 0) ?? []

      resolve(pages)
    })

    pdfParser.parseBuffer(buffer)
  })
}

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
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('pdfs')
      .download(doc.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `Could not download PDF: ${downloadError?.message}` },
        { status: 500 }
      )
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    const pages = await parsePdfPages(pdfBuffer)

    if (pages.length === 0) {
      return NextResponse.json(
        { error: 'No readable text found in this PDF.' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })

    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID!

    // Clean up old OpenAI page files before reprocessing
    const { data: oldPages } = await supabaseAdmin
      .from('document_pages')
      .select('openai_file_id')
      .eq('document_id', documentId)

    for (const oldPage of oldPages ?? []) {
      if (!oldPage.openai_file_id) continue

      try {
        await openai.vectorStores.files.delete(vectorStoreId, oldPage.openai_file_id)
      } catch {
        // Ignore if already removed from vector store
      }

      try {
        await openai.files.delete(oldPage.openai_file_id)
      } catch {
        // Ignore if already deleted from OpenAI files
      }
    }

    const { error: deletePagesError } = await supabaseAdmin
      .from('document_pages')
      .delete()
      .eq('document_id', documentId)

    if (deletePagesError) {
      return NextResponse.json(
        { error: `Could not delete old page records: ${deletePagesError.message}` },
        { status: 500 }
      )
    }

    const uploadedPageFileIds: string[] = []

    const safeBaseName = doc.filename
      .replace(/\.pdf$/i, '')
      .replace(/[^\w.-]+/g, '-')

    for (const page of pages) {
      const pageFilename = `${safeBaseName}__page-${String(page.pageNumber).padStart(3, '0')}.txt`

      const pageFileText = `
Document title: ${doc.title}
Original filename: ${doc.filename}
Category: ${doc.category ?? 'None'}
Version: ${doc.version ?? 'None'}
Page number: ${page.pageNumber}

${page.text}
      `.trim()

      const uploadedFile = await openai.files.create({
        file: await toFile(
          Buffer.from(pageFileText, 'utf-8'),
          pageFilename,
          { type: 'text/plain' }
        ),
        purpose: 'assistants',
      })

      await openai.vectorStores.files.create(vectorStoreId, {
        file_id: uploadedFile.id,
      })

      uploadedPageFileIds.push(uploadedFile.id)

      const { error: insertPageError } = await supabaseAdmin
        .from('document_pages')
        .insert({
          document_id: documentId,
          page_number: page.pageNumber,
          openai_file_id: uploadedFile.id,
          vector_store_id: vectorStoreId,
        })

      if (insertPageError) {
        return NextResponse.json(
          { error: `Could not save page ${page.pageNumber}: ${insertPageError.message}` },
          { status: 500 }
        )
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        openai_file_id: uploadedPageFileIds[0],
        vector_store_id: vectorStoreId,
      })
      .eq('id', documentId)

    if (updateError) {
      return NextResponse.json(
        { error: `Document update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pages_processed: pages.length,
      vector_store_id: vectorStoreId,
    })
  } catch (error: any) {
    console.error('PROCESS DOCUMENT ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown processing error' },
      { status: 500 }
    )
  }
}