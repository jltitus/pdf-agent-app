import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function tokenize(str: string): Set<string> {
  return new Set(
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  )
}

function similarity(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  const intersection = [...ta].filter((w) => tb.has(w)).length
  const union = new Set([...ta, ...tb]).size
  return union === 0 ? 0 : intersection / union
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' || !profile?.is_active) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const [{ data: trusted }, { data: history }] = await Promise.all([
      supabaseAdmin.from('trusted_answers').select('id, question').eq('is_active', true),
      supabaseAdmin
        .from('chat_history')
        .select('id, question, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    const trustedList = trusted ?? []
    const historyList = history ?? []

    const THRESHOLD = 0.35
    const matches: {
      chatId: string
      chatQuestion: string
      createdAt: string
      matchedTrustedId: string
      matchedQuestion: string
      similarity: number
    }[] = []

    for (const row of historyList) {
      let best = 0
      let bestTrusted: (typeof trustedList)[0] | null = null
      for (const t of trustedList) {
        const score = similarity(row.question, t.question)
        if (score > best) {
          best = score
          bestTrusted = t
        }
      }
      if (best >= THRESHOLD && bestTrusted) {
        matches.push({
          chatId: row.id,
          chatQuestion: row.question,
          createdAt: row.created_at,
          matchedTrustedId: bestTrusted.id,
          matchedQuestion: bestTrusted.question,
          similarity: Math.round(best * 100),
        })
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity)

    return NextResponse.json({ matches: matches.slice(0, 100) })
  } catch (err) {
    console.error('SIMILAR QUESTIONS ERROR:', err)
    return NextResponse.json({ error: 'Failed to load similar questions' }, { status: 500 })
  }
}
