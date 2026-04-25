import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

function cleanExcerpt(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 600)
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

Use this structure:
- Recipe name
- Ingredients
- Steps
- Processing or storage notes
- Important safety notes, if stated in the documents

Rules for recipe mode:
- Only provide recipes explicitly found in the PDFs.
- Do not invent ingredients, processing times, temperatures, yields, substitutions, or storage instructions.
- If no recipe is found, say: "I can't find a recipe for that in the provided documents."
`
  }

  if (answerMode === 'compare') {
    return `
Answer mode: Compare documents.

Use this structure:
- Short comparison summary
- Similarities
- Differences
- Any conflicts or gaps
- What the documents do not clearly answer

Rules for comparison mode:
- Compare only what is supported by the active PDFs.
- Do not infer beyond the documents.
`
  }

  if (answerMode === 'safety') {
    return `
Answer mode: Safety guidance.

Use this structure:
- Safety guidance
- Key precautions
- What not to do, if stated
- When the documents do not provide enough information

Rules for safety mode:
- Be conservative.
- Do not invent safety guidance.
- Do not provide food preservation, canning, drying, freezing, smoking, or storage instructions unless clearly supported by the PDFs.
`
  }

  return `
Answer mode: General question.

Use this structure:
- Direct answer
- Key details as bullets
- Any limitations or missing information
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

export async function POST(request: Request) {
  try {
    const { question, category, answerMode = 'general' } = await request.json()

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

    const { data: activeDocs, error: docsError } = await docsQuery

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 })
    }

    if (!activeDocs || activeDocs.length === 0) {
      return NextResponse.json({
        answer:
          category && category !== 'all'
            ? `I can't answer because there are no active documents in the "${category}" category.`
            : "I can't answer because there are no active documents in the knowledge base.",
        sources: [],
        evidenceStrength: {
          label: 'Not found',
          description: 'No active documents were available to search.',
        },
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
      activePages?.filter((row: any) => row.documents?.is_active) ?? []

    if (activePageRows.length === 0) {
      return NextResponse.json({
        answer:
          category && category !== 'all'
            ? `I can't answer because there are no processed pages in the "${category}" category.`
            : "I can't answer because there are no processed pages in the knowledge base.",
        sources: [],
        evidenceStrength: {
          label: 'Not found',
          description: 'No processed pages were available to search.',
        },
      })
    }

    const activeFileIds = activePageRows
      .map((row: any) => row.openai_file_id)
      .filter(Boolean)

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })

    const modeInstructions = getModeInstructions(answerMode)

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

${category && category !== 'all' ? `The user selected this category filter: ${category}. Only answer from active documents in this category.` : 'The user selected all active documents.'}

${modeInstructions}

Global formatting:
- Use plain language.
- Use "-" for bullets, not markdown stars.
- If steps are requested, use a numbered list.
- Do NOT include sources in the answer text.
- Do NOT list documents or page numbers in the answer text.
- Sources are shown separately in the UI.

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
        },
      ],
    })

    const citedFileIds = new Set<string>()
    const excerptsByFileId: Record<string, string[]> = {}

    for (const item of response.output as any[]) {
      if (item.type === 'message') {
        for (const content of item.content ?? []) {
          if (content.type === 'output_text' && content.annotations) {
            for (const ann of content.annotations) {
              if (ann.file_id) citedFileIds.add(ann.file_id)
            }
          }
        }
      }

      if (item.type === 'file_search_call') {
        const results = item.search_results ?? item.results ?? []

        for (const r of results) {
          if (!r.file_id) continue

          citedFileIds.add(r.file_id)

          const text = cleanExcerpt(getSearchResultText(r))
          if (!text) continue

          if (!excerptsByFileId[r.file_id]) {
            excerptsByFileId[r.file_id] = []
          }

          if (!excerptsByFileId[r.file_id].includes(text)) {
            excerptsByFileId[r.file_id].push(text)
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

    const noEvidence =
      sources.length === 0 ||
      citedFileIds.size === 0 ||
      response.output_text
        .toLowerCase()
        .includes("i can't find that in the provided documents")

    if (noEvidence) {
      return NextResponse.json({
        answer: "I can't find that in the provided documents.",
        sources: [],
        evidenceStrength: {
          label: 'Not found',
          description: 'No supporting source evidence was found.',
        },
      })
    }

    const evidenceStrength = getEvidenceStrength(sources)

const { data: historyRow } = await supabaseAdmin
  .from('chat_history')
  .insert({
    user_id: user.id,
    question,
    answer: response.output_text,
    category: category ?? null,
    answer_mode: answerMode ?? 'general',
    sources,
    evidence_strength: evidenceStrength,
  })
  .select('id')
  .single()

return NextResponse.json({
  answer: response.output_text,
  sources,
  evidenceStrength,
  chatHistoryId: historyRow?.id ?? null,
})
  } catch (error: any) {
    console.error('CHAT ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}