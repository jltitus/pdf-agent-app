import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  const page = req.nextUrl.searchParams.get('page')

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

  const { data, error } = await supabaseAdmin.storage
    .from('pdfs')
    .createSignedUrl(doc.storage_path, 60)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not create source link' }, { status: 500 })
  }

  const signedUrl = page ? `${data.signedUrl}#page=${page}` : data.signedUrl

  return NextResponse.redirect(signedUrl)
}