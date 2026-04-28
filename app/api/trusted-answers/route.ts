import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function normalize(text: string) {
  return text.toLowerCase().trim()
}

function similarity(a: string, b: string) {
  const aWords = new Set(a.split(' '))
  const bWords = new Set(b.split(' '))
  const intersection = [...aWords].filter((word) => bWords.has(word))
  return intersection.length / Math.max(aWords.size, bWords.size)
}

export async function POST(request: Request) {
  try {
    const { question, answer, category, answerMode, sources } =
      await request.json()

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Missing question or answer' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // 🔍 DUPLICATE CHECK
    const { data: existing } = await supabaseAdmin
      .from('trusted_answers')
      .select('question')
      .eq('is_active', true)

    const newQ = normalize(question)

    if (existing && existing.length > 0) {
      for (const item of existing) {
        const existingQ = normalize(item.question)

        // Exact match
        if (existingQ === newQ) {
          return NextResponse.json(
            { error: 'This trusted answer already exists.' },
            { status: 409 }
          )
        }

        // Similarity match
        const score = similarity(newQ, existingQ)

        if (score > 0.7) {
          return NextResponse.json(
            { error: 'A similar trusted answer already exists.' },
            { status: 409 }
          )
        }
      }
    }

    // ✅ INSERT
    const { error } = await supabaseAdmin.from('trusted_answers').insert({
      question,
      answer,
      category: category ?? null,
      answer_mode: answerMode ?? 'general',
      sources: sources ?? [],
      created_by: user.id,
      is_active: true,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown trusted answer error' },
      { status: 500 }
    )
  }
}