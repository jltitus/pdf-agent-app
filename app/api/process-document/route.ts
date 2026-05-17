import { NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { createClient } from '@supabase/supabase-js'
import PDFParser from 'pdf2json'

export const maxDuration = 120

type ProcessingStatus =
  | 'pending'
  | 'validating'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'encrypted'
  | 'invalid_pdf'

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getProcessingErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unknown processing error.'
}

function validatePdfBuffer(buffer: Buffer) {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      status: 'invalid_pdf' as ProcessingStatus,
      error: 'The PDF file is empty and cannot be processed.',
    }
  }

  const header = buffer.toString('utf8', 0, 8)

  if (!header.includes('%PDF')) {
    return {
      valid: false,
      status: 'invalid_pdf' as ProcessingStatus,
      error: 'This file does not appear to be a valid PDF.',
    }
  }

  const rawPdfText = buffer.toString('latin1')

  if (rawPdfText.includes('/Encrypt')) {
    return {
      valid: false,
      status: 'encrypted' as ProcessingStatus,
      error:
        'This PDF is encrypted or password protected. Please upload an unlocked PDF and try again.',
    }
  }

  return {
    valid: true,
    status: 'validating' as ProcessingStatus,
    error: null,
  }
}

function parsePdfPages(
  buffer: Buffer
): Promise<{ pageNumber: number; text: string }[]> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData?.parserError || 'PDF parsing failed.'))
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
        }).filter(
          (page: { pageNumber: number; text: string }) =>
            page.text.length > 0
        ) ?? []

      resolve(pages)
    })

    pdfParser.parseBuffer(buffer)
  })
}

async function updateProcessingState(
  supabaseAdmin: any,
  documentId: string,
  payload: Record<string, any>
) {
  await supabaseAdmin
    .from('documents')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
}

export async function POST(request: Request) {
  let documentId: string | null = null

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    documentId = body.documentId

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId.' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token.' }, { status: 401 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' || !profile?.is_active) {
      return NextResponse.json(
        { error: 'Admin access required.' },
        { status: 403 }
      )
    }

    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    if (doc.processing_status === 'processing') {
      return NextResponse.json(
        {
          error:
            'This document is already processing. Wait for it to finish before retrying.',
        },
        { status: 409 }
      )
    }

    if (!doc.storage_path) {
      await updateProcessingState(supabaseAdmin, documentId, {
        processing_status: 'failed',
        processing_error: 'Document is missing a storage path.',
        processing_progress: 0,
        processing_completed_at: new Date().toISOString(),
      })

      return NextResponse.json(
        { error: 'Document is missing a storage path.' },
        { status: 400 }
      )
    }

    await updateProcessingState(supabaseAdmin, documentId, {
      processing_status: 'validating',
      processing_error: null,
      processing_progress: 5,
      processing_started_at: new Date().toISOString(),
      processing_completed_at: null,
      processing_attempts: (doc.processing_attempts ?? 0) + 1,
      last_processed_page: 0,
      is_encrypted: false,
    })

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('pdfs')
      .download(doc.storage_path)

    if (downloadError || !fileData) {
      throw new Error(
        `Could not download PDF: ${
          downloadError?.message ?? 'No file data returned.'
        }`
      )
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    const validation = validatePdfBuffer(pdfBuffer)

    if (!validation.valid) {
      await updateProcessingState(supabaseAdmin, documentId, {
        processing_status: validation.status,
        processing_error: validation.error,
        processing_progress: 0,
        processing_completed_at: new Date().toISOString(),
        is_encrypted: validation.status === 'encrypted',
        file_size_bytes: pdfBuffer.length,
      })

      return NextResponse.json(
        { error: validation.error, processing_status: validation.status },
        { status: 400 }
      )
    }

    await updateProcessingState(supabaseAdmin, documentId, {
      processing_status: 'processing',
      processing_progress: 20,
      file_size_bytes: pdfBuffer.length,
    })

    const pages = await parsePdfPages(pdfBuffer)

    if (pages.length === 0) {
      await updateProcessingState(supabaseAdmin, documentId, {
        processing_status: 'failed',
        processing_error:
          'No readable text was found in this PDF. It may be scanned images only.',
        processing_progress: 0,
        processing_completed_at: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          error:
            'No readable text was found in this PDF. It may be scanned images only.',
        },
        { status: 400 }
      )
    }

    await updateProcessingState(supabaseAdmin, documentId, {
      processing_status: 'processing',
      processing_progress: 40,
    })

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })

    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID!

    const { data: oldPages } = await supabaseAdmin
      .from('document_pages')
      .select('openai_file_id')
      .eq('document_id', documentId)

    for (const oldPage of oldPages ?? []) {
      if (!oldPage.openai_file_id) continue

      try {
        await openai.vectorStores.files.delete(
          vectorStoreId,
          oldPage.openai_file_id
        )
      } catch {
        // Ignore already removed vector store files.
      }

      try {
        await openai.files.delete(oldPage.openai_file_id)
      } catch {
        // Ignore already deleted OpenAI files.
      }
    }

    const { error: deletePagesError } = await supabaseAdmin
      .from('document_pages')
      .delete()
      .eq('document_id', documentId)

    if (deletePagesError) {
      throw new Error(
        `Could not delete old page records: ${deletePagesError.message}`
      )
    }

    await updateProcessingState(supabaseAdmin, documentId, {
      processing_status: 'processing',
      processing_progress: 60,
    })

    const uploadedPageFileIds: string[] = []

    const safeBaseName = doc.filename
      .replace(/\.pdf$/i, '')
      .replace(/[^\w.-]+/g, '-')

    for (const page of pages) {
      const pageFilename = `${safeBaseName}__page-${String(
        page.pageNumber
      ).padStart(3, '0')}.txt`

      const pageFileText = `
Document title: ${doc.title}
Original filename: ${doc.filename}
Category: ${doc.category ?? 'None'}
Version: ${doc.version ?? 'None'}
Page number: ${page.pageNumber}

${page.text}
      `.trim()

      const uploadedFile = await openai.files.create({
        file: await toFile(Buffer.from(pageFileText, 'utf-8'), pageFilename, {
          type: 'text/plain',
        }),
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
        throw new Error(
          `Could not save page ${page.pageNumber}: ${insertPageError.message}`
        )
      }

      const progress = Math.min(
        90,
        60 + Math.round((page.pageNumber / pages.length) * 30)
      )

      await updateProcessingState(supabaseAdmin, documentId, {
        processing_status: 'processing',
        processing_progress: progress,
        last_processed_page: page.pageNumber,
      })
    }

    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        openai_file_id: uploadedPageFileIds[0],
        vector_store_id: vectorStoreId,
        processing_status: 'processed',
        processing_error: null,
        processing_progress: 100,
        processing_completed_at: new Date().toISOString(),
        last_processed_page: pages.length,
        is_encrypted: false,
        file_size_bytes: pdfBuffer.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateError) {
      throw new Error(`Document update failed: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      pages_processed: pages.length,
      vector_store_id: vectorStoreId,
      processing_status: 'processed',
    })
  } catch (error: any) {
    console.error('PROCESS DOCUMENT ERROR:', error)

    const errorMessage = getProcessingErrorMessage(error)

    if (documentId) {
      await updateProcessingState(supabaseAdmin, documentId, {
        processing_status: 'failed',
        processing_error: errorMessage,
        processing_progress: 0,
        processing_completed_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}