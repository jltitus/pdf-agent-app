import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

function cleanExcerpt(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 700)
}

function getSearchResultText(result: any): string {
  if (typeof result.text === 'string') return result.text

  if (Array.isArray(result.content)) {
    return result.content
      .map((item: any) => item.text ?? item.content ?? '')
      .join(' ')
  }

  return ''
}

function getModeInstructions(answerMode: string) {
  if (answerMode === 'recipe') {
    return `
Answer mode: Find a recipe.

Use this exact structure:

Recipe
- Name:
- What the publication says:

Ingredients
- Only list ingredients explicitly found in the documents.

Steps
1. Only include steps found in the documents.

Processing / Storage Notes
- Include time, temperature, storage, or preservation notes only if stated.

Important Safety Notes
- Include safety warnings if present.

Rules:
- Do not invent anything.
- If no recipe exists, say: "I can't find a recipe for that in the provided documents."
`
  }

  if (answerMode === 'compare') {
    return `
Answer mode: Compare documents.

Use this exact structure:

Comparison Summary
- Short summary.

Similarities
- List agreements.

Differences
- List differences.

Conflicts or Gaps
- Note contradictions or missing information.

Bottom Line
- Conclusion based only on documents.
`
  }

  if (answerMode === 'safety') {
    return `
Answer mode: Safety guidance.

Use this exact structure:

Safety Guidance
- Most important point first.

Key Precautions
- Supported precautions.

What Not To Do
- Unsafe practices if stated.

When More Info Is Needed
- What is unclear.

Bottom Line
- Conservative summary.
`
  }

  return `
Answer mode: General question.

Use this exact structure:

Direct Answer
- 1–3 sentence answer.

Key Takeaways
- Bullet points.

Details from the Publications
- Supporting details.

Limitations / What Is Not Clear
- Missing information.

Bottom Line
- Short summary.
`
}

function getEvidenceStrength(sources: any[]) {
  const count = sources.reduce(
    (sum, s) => sum + (s.pages?.length ?? 0),
    0
  )

  if (count >= 3)
    return { label: 'Strong', description: 'Multiple supporting pages found.' }
  if (count === 2)
    return { label: 'Moderate', description: 'Some supporting evidence found.' }
  if (count === 1)
    return { label: 'Limited', description: 'Minimal supporting evidence.' }

  return { label: 'Not found', description: 'No supporting evidence found.' }
}

export async function POST(request: Request) {
  try {
    const {
      question,
      category,
      documentId = 'all',
      answerMode = 'general',
      conversationTurns = [],
    } = await request.json()

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const {
      data: { user },
    } = await supabase.auth.getUser(token!)

    // 🔹 Load active documents
    let docsQuery = supabase
      .from('documents')
      .select('id, title, filename, category, is_active')
      .eq('is_active', true)

    if (category && category !== 'all') {
      docsQuery = docsQuery.eq('category', category)
    }

    if (documentId && documentId !== 'all') {
      docsQuery = docsQuery.eq('id', documentId)
    }

    const { data: docs } = await docsQuery

    if (!docs || docs.length === 0) {
      return NextResponse.json({
        answer: "I can't find that in the provided documents.",
        sources: [],
        evidenceStrength: {
          label: 'Not found',
          description: 'No active documents available.',
        },
      })
    }

    const activeDocIds = docs.map((d) => d.id)

    // 🔹 Load pages
    const { data: pages } = await supabase
      .from('document_pages')
      .select('*')
      .in('document_id', activeDocIds)

    const activeFileIds =
      pages?.map((p: any) => p.openai_file_id).filter(Boolean) ?? []

    // 🔹 Build conversation context
    const context = conversationTurns
      .slice(-4)
      .map(
        (t: any, i: number) =>
          `Prior turn ${i + 1}
Question: ${t.question}
Answer: ${t.answer}`
      )
      .join('\n\n')

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })

    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      include: ['output[*].file_search_call.search_results'] as any,
      instructions: `
You are a strict document-grounded assistant.

Only answer from the PDFs.
Do not guess.

${context ? `Conversation context:\n${context}` : ''}

Use context only to understand follow-up questions.
Do NOT use prior answers as evidence.

${getModeInstructions(answerMode)}
`,
      input: question,
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [process.env.OPENAI_VECTOR_STORE_ID!],
          max_num_results: 5,
        },
      ] as any,
    })

    const sources: any[] = []

    for (const item of response.output as any[]) {
      if (item.type === 'file_search_call') {
        for (const r of item.search_results ?? []) {
          sources.push({
            title: r.filename ?? 'Document',
            filename: r.filename,
            pages: [r.page_number],
          })
        }
      }
    }

    const evidenceStrength = getEvidenceStrength(sources)

    const { data: historyRow } = await supabase
      .from('chat_history')
      .insert({
        user_id: user?.id,
        question,
        answer: response.output_text,
        answer_mode: answerMode,
        category,
        sources,
        evidence_strength: evidenceStrength,
      })
      .select('id')
      .single()

    return NextResponse.json({
      answer: response.output_text,
      sources,
      evidenceStrength,
      chatHistoryId: historyRow?.id,
    })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}