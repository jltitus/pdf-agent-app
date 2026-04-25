import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { chatHistoryId, question, answer, sources, feedbackType } =
      await request.json()

    if (!feedbackType) {
      return NextResponse.json({ error: 'Missing feedbackType' }, { status: 400 })
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

    const { error } = await supabaseAdmin.from('chat_feedback').insert({
      user_id: user.id,
      chat_history_id: chatHistoryId ?? null,
      question,
      answer,
      sources,
      feedback_type: feedbackType,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('FEEDBACK ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown feedback error' },
      { status: 500 }
    )
  }
}