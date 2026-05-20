import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')

  if (!filename) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: doc, error: docError } = await supabaseAdmin
    .from('documents')
    .select('storage_path')
    .eq('filename', filename)
    .single()

  if (docError || !doc?.storage_path) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('pdfs')
    .download(doc.storage_path)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Could not fetch document' }, { status: 500 })
  }

  const bytes = await fileData.arrayBuffer()

  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
