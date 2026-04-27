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
Recipe Found
- Name:
- Publication guidance:

Ingredients
- Only list ingredients explicitly found in the documents.

Steps
1. Only include steps found in the documents.

Processing or Storage Notes
- Include time, temperature, pressure, storage, or preservation notes only if stated in the publications.

Safety Notes
- Include any safety warnings, required processing methods, or caution statements.

What’s Not Clear
- List missing details such as yield, jar size, processing time, altitude adjustment, storage time, or ingredients if not stated.

Bottom Line
- End with one practical takeaway.

Rules:
- Do not invent ingredients, processing times, temperatures, yields, substitutions, storage instructions, or safety guidance.
- If no recipe exists, say: "I couldn’t find a supported recipe in the selected publications."
`
  }

  if (answerMode === 'compare') {
    return `
Answer mode: Compare documents.

Use this exact structure:
Comparison Summary
- Briefly state what the publications agree on or how they differ.

Similarities
- List points that are consistent across the publications.

Differences
- List differences in guidance, scope, method, timing, temperature, storage, or safety cautions.

Conflicts or Gaps
- Note contradictions, missing details, or areas where the publications do not fully answer the question.

Bottom Line
- End with one practical takeaway based only on the publications.
`
  }

  if (answerMode === 'safety') {
    return `
Answer mode: Safety guidance.

Use this exact structure:
Safety Guidance
- State the most important safety guidance first.

Key Precautions
- List supported precautions from the publications.

What Not To Do
- List unsafe practices only if they are stated or clearly warned against in the publications.

When More Information Is Needed
- Explain what is unclear, missing, or requires checking another approved source.

Bottom Line
- End with the most conservative practical takeaway.

Rules:
- Do not soften safety warnings.
- Do not add safety guidance that is not supported by the selected publications.
`
  }

  return `
Answer mode: General question.

Use this exact structure:
Short Answer
- Give a clear 1–3 sentence answer.

Key Points
- List the most important points as short bullets.
- Keep each bullet focused and practical.

Details
- Explain what the publications say in plain language.
- Include important conditions, limitations, or context.

Safety Notes
- Include this section only when the topic involves food safety, canning, freezing, drying, pickling, smoking, storage, or recipes.
- If there are no safety notes in the publications, say: "No specific safety notes were found in the selected publications."

What’s Not Clear
- Include this section only when the publications do not fully answer the question.
- Be specific about what is missing or unclear.

Bottom Line
- End with one practical takeaway.
`
}

function getEvidenceStrength(sources: any[]) {
  const pageCount = sources.reduce(
    (total, source) => total + (source.pages?.length ?? 0),
    0
  )

  const excerptCount = sources.reduce(
    (total, source) => total + (source.excerpts?.length ?? 0),
    0
  )

  const evidenceCount = Math.max(pageCount, excerptCount)

  if (evidenceCount >= 3) {
    return {
      label: 'Strong',
      description: 'Multiple supporting pages or excerpts were found.',
    }
  }

  if (evidenceCount === 2) {
    return {
      label: 'Moderate',
      description: 'More than one supporting page or excerpt was found.',
    }
  }

  if (evidenceCount === 1) {
    return {
      label: 'Limited',
      description: 'Only one supporting page or excerpt was found.',
    }
  }

  return {
    label: 'Not found',
    description: 'No supporting source evidence was found.',
  }
}

async function generateSuggestedFollowUps({
  openai,
  question,
  answer,
  answerMode,
}: {
  openai: OpenAI
  question: string
  answer: string
  answerMode: string
}) {
  try {
    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      instructions: `
You create short suggested follow-up questions for a document-grounded food preservation assistant.

Rules:
- Return exactly 3 follow-up questions.
- Each question must be short and practical.
- Do not include numbering.
- Do not include explanations.
- Do not ask about anything unrelated to the user's original question or the answer.
- Prefer questions about storage, safety, processing, ingredients, risks, limits, or what not to do.
- If the answer says no supported answer was found, suggest ways to refine the search.
`,
      input: `
Original question:
${question}

Answer mode:
${answerMode}

Answer:
${answer}

Return only 3 follow-up questions, one per line.
`,
    })

    const text = response.output_text ?? ''

    const suggestions = text
      .split('\n')
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3)

    return suggestions.length > 0
      ? suggestions
      : [
          'What does the publication say about storage?',
          'Are there any safety notes?',
          'What should I avoid doing?',
        ]
  } catch {
    return [
      'What does the publication say about storage?',
      'Are there any safety notes?',
      'What should I avoid doing?',
    ]
  }
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

    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
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
      .select('is_active')
      .eq('id', user.id)
      .single()

    if (!profile?.is_active) {
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 })
    }

    let docsQuery = supabaseAdmin
      .from('documents')
      .select('id, title, filename, category, version, is_active')
      .eq('is_active', true)

    if (category && category !== 'all') {
      docsQuery = docsQuery.eq('category', category)
    }

    if (documentId && documentId !== 'all') {
      docsQuery = docsQuery.eq('id', documentId)
    }

    const { data: activeDocs, error: docsError } = await docsQuery

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 })
    }

    if (!activeDocs || activeDocs.length === 0) {
      return NextResponse.json({
        answer:
          "I can't answer because there are no active publications matching the selected filters.",
        sources: [],
        evidenceStrength: {
          label: 'Not found',
          description: 'No active documents were available to search.',
        },
        chatHistoryId: null,
        suggestedFollowUps: [
          'Can you search all publications?',
          'What publication should I select?',
          'How should I rephrase this question?',
        ],
      })
    }

    const activeDocumentIds = activeDocs.map((doc) => doc.id)

    const { data: activePages, error: pagesError } = await supabaseAdmin
      .from('document_pages')
      .select(`
        page_number,
        openai_file_id,
        document_id,
        documents (
          title,
          filename,
          category,
          version,
          is_active
        )
      `)
      .in('document_id', activeDocumentIds)

    if (pagesError) {
      return NextResponse.json({ error: pagesError.message }, { status: 500 })
    }

    const activePageRows =
      activePages?.filter((row: any) => {
        const documentInfo = Array.isArray(row.documents)
          ? row.documents[0]
          : row.documents

        return documentInfo?.is_active && row.openai_file_id
      }) ?? []

    if (activePageRows.length === 0) {
      return NextResponse.json({
        answer:
          "I can't answer because there are no processed pages matching the selected filters.",
        sources: [],
        evidenceStrength: {
          label: 'Not found',
          description: 'No processed pages were available to search.',
        },
        chatHistoryId: null,
        suggestedFollowUps: [
          'Can you search all publications?',
          'What publication should I select?',
          'How should I rephrase this question?',
        ],
      })
    }

    const activeFileIds = activePageRows
      .map((row: any) => row.openai_file_id)
      .filter(Boolean)

    const recentConversationContext = Array.isArray(conversationTurns)
      ? conversationTurns
          .slice(-4)
          .map(
            (turn: any, index: number) =>
              `Prior turn ${index + 1}
Question: ${turn.question}
Answer: ${turn.answer}`
          )
          .join('\n\n')
      : ''

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })

    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      include: ['output[*].file_search_call.search_results'] as any,
      instructions: `
You are a strict document-grounded assistant.

You may answer ONLY from the uploaded PDFs.
Do not use outside knowledge.
Do not guess.

If the answer is not clearly supported by the active PDFs, say:
"I can't find that in the provided documents."

Only use these active OpenAI file IDs:
${activeFileIds.join('\n')}

${
  category && category !== 'all'
    ? `The user selected this category filter: ${category}. Only answer from active documents in this category.`
    : 'The user selected all active categories.'
}

${
  documentId && documentId !== 'all'
    ? 'The user selected one specific publication. Only answer from that selected publication.'
    : 'The user selected all active publications matching the category filter.'
}

Conversation context:
${recentConversationContext || 'No prior conversation context.'}

Use prior conversation context only to understand follow-up questions.
Do not use prior answers as evidence.
The final answer must still be supported by active PDF search results.

${getModeInstructions(answerMode)}

Global formatting:
- Use clear section headings.
- Use "-" for bullets, not markdown stars.
- Use numbered lists only for steps or procedures.
- Keep answers readable for non-technical users.
- Do NOT include sources in the answer text.
- Do NOT list documents or page numbers in the answer text.
- Sources are shown separately in the UI.
- Do not use markdown tables unless the user explicitly asks for a table.

Evidence rules:
- If file search does not return relevant support, do not answer from memory.
- If the retrieved support is only loosely related, say you can't find a clear answer in the provided documents.
- For food safety, canning, drying, freezing, pickling, smoking, storage, or recipes, be conservative.
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

    const citedFileIds = new Set<string>()
    const excerptsByFileId: Record<string, string[]> = {}

    for (const item of response.output as any[]) {
      if (item.type === 'message') {
        for (const content of item.content ?? []) {
          if (content.type === 'output_text' && content.annotations) {
            for (const ann of content.annotations) {
              if (ann.file_id && activeFileIds.includes(ann.file_id)) {
                citedFileIds.add(ann.file_id)
              }
            }
          }
        }
      }

      if (item.type === 'file_search_call') {
        const results = item.search_results ?? item.results ?? []

        for (const result of results) {
          if (!result.file_id) continue
          if (!activeFileIds.includes(result.file_id)) continue

          citedFileIds.add(result.file_id)

          const text = cleanExcerpt(getSearchResultText(result))
          if (!text) continue

          if (!excerptsByFileId[result.file_id]) {
            excerptsByFileId[result.file_id] = []
          }

          if (!excerptsByFileId[result.file_id].includes(text)) {
            excerptsByFileId[result.file_id].push(text)
          }
        }
      }
    }

    const groupedSources: Record<
      string,
      {
        title: string
        filename: string
        category: string | null
        version: string | null
        pages: Set<number>
        excerpts: string[]
      }
    > = {}

    for (const row of activePageRows as any[]) {
      if (!citedFileIds.has(row.openai_file_id)) continue

      const documentInfo = Array.isArray(row.documents)
        ? row.documents[0]
        : row.documents

      if (!documentInfo) continue

      const key = documentInfo.filename

      if (!groupedSources[key]) {
        groupedSources[key] = {
          title: documentInfo.title,
          filename: documentInfo.filename,
          category: documentInfo.category,
          version: documentInfo.version,
          pages: new Set<number>(),
          excerpts: [],
        }
      }

      groupedSources[key].pages.add(row.page_number)

      const excerpts = excerptsByFileId[row.openai_file_id] ?? []
      for (const excerpt of excerpts) {
        if (!groupedSources[key].excerpts.includes(excerpt)) {
          groupedSources[key].excerpts.push(excerpt)
        }
      }
    }

    const sources = Object.values(groupedSources).map((doc) => ({
      title: doc.title,
      filename: doc.filename,
      category: doc.category,
      version: doc.version,
      pages: Array.from(doc.pages).sort((a, b) => a - b),
      excerpts: doc.excerpts.slice(0, 3),
    }))

    const answerText = response.output_text ?? ''

    const modelSaysNotFound = answerText
      .toLowerCase()
      .includes("i can't find that in the provided documents")

    const noEvidence =
      sources.length === 0 || citedFileIds.size === 0 || modelSaysNotFound

    if (noEvidence) {
      const fallbackAnswer = `I couldn’t find a supported answer in the selected publications.

Try:
- Rephrasing your question
- Selecting “All categories”
- Selecting “All publications”
- Asking about a specific publication title
- Checking whether the publication has been uploaded and processed

Because this app is source-grounded, it will only answer when it can find support in the uploaded documents.`

      const evidenceStrength = {
        label: 'Not found',
        description:
          'No relevant supporting content was found in the selected publications.',
      }

      const { data: historyRow } = await supabaseAdmin
        .from('chat_history')
        .insert({
          user_id: user.id,
          question,
          answer: fallbackAnswer,
          category: category ?? null,
          answer_mode: answerMode ?? 'general',
          sources: [],
          evidence_strength: evidenceStrength,
        })
        .select('id')
        .single()

      return NextResponse.json({
        answer: fallbackAnswer,
        sources: [],
        evidenceStrength,
        chatHistoryId: historyRow?.id ?? null,
        suggestedFollowUps: [
          'Can you search all publications?',
          'What publication should I select?',
          'How should I rephrase this question?',
        ],
      })
    }

    const evidenceStrength = getEvidenceStrength(sources)

    const { data: historyRow } = await supabaseAdmin
      .from('chat_history')
      .insert({
        user_id: user.id,
        question,
        answer: answerText,
        category: category ?? null,
        answer_mode: answerMode ?? 'general',
        sources,
        evidence_strength: evidenceStrength,
      })
      .select('id')
      .single()

    const suggestedFollowUps = await generateSuggestedFollowUps({
      openai,
      question,
      answer: answerText,
      answerMode,
    })

    return NextResponse.json({
      answer: answerText,
      sources,
      evidenceStrength,
      chatHistoryId: historyRow?.id ?? null,
      suggestedFollowUps,
    })
  } catch (error: any) {
    console.error('CHAT ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}