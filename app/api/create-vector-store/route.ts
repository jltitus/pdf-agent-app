import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY in .env.local' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const vectorStore = await openai.vectorStores.create({
      name: 'PDF Agent Page-Aware Knowledge Base',
    })

    return NextResponse.json({
      vector_store_id: vectorStore.id,
    })
  } catch (error: any) {
    console.error('CREATE VECTOR STORE ERROR:', error)

    return NextResponse.json(
      { error: error.message ?? 'Unknown error creating vector store' },
      { status: 500 }
    )
  }
}