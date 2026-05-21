import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // Fetch all documents
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('id, title, filename, category')
      .order('title')

    if (!documents) {
      return NextResponse.json({ stats: [] })
    }

    // Fetch view counts grouped by document
    const { data: viewRows } = await supabaseAdmin
      .from('document_views')
      .select('document_id')

    const viewCounts: Record<string, number> = {}
    for (const row of viewRows ?? []) {
      viewCounts[row.document_id] = (viewCounts[row.document_id] ?? 0) + 1
    }

    // Fetch recent chat history with sources to count questions per document
    const { data: chatRows } = await supabaseAdmin
      .from('chat_history')
      .select('question, sources, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)

    // Map filename -> document id
    const filenameToId: Record<string, string> = {}
    for (const doc of documents) {
      filenameToId[doc.filename] = doc.id
    }

    // Aggregate questions per document
    const questionsByDoc: Record<string, { question: string; created_at: string }[]> = {}
    for (const row of chatRows ?? []) {
      const sources = Array.isArray(row.sources) ? row.sources : []
      const seenIds = new Set<string>()
      for (const src of sources) {
        const filename = src?.filename
        if (!filename) continue
        const docId = filenameToId[filename]
        if (!docId || seenIds.has(docId)) continue
        seenIds.add(docId)
        if (!questionsByDoc[docId]) questionsByDoc[docId] = []
        questionsByDoc[docId].push({ question: row.question, created_at: row.created_at })
      }
    }

    const stats = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      filename: doc.filename,
      category: doc.category,
      viewCount: viewCounts[doc.id] ?? 0,
      questionCount: questionsByDoc[doc.id]?.length ?? 0,
      recentQuestions: (questionsByDoc[doc.id] ?? []).slice(0, 5).map((q) => q.question),
    }))

    // Sort by most-viewed first
    stats.sort((a, b) => b.viewCount - a.viewCount)

    return NextResponse.json({ stats })
  } catch {
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
