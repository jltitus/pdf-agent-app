import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  const page = req.nextUrl.searchParams.get('page')

  if (!filename) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const params = new URLSearchParams({ file: filename })
  if (page) params.set('page', page)

  return NextResponse.redirect(new URL(`/view-pdf?${params}`, req.url))
}
