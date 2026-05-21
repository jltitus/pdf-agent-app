import { NextResponse } from 'next/server'
import webpush from 'web-push'

// Temporary route — visit once to get VAPID keys, then delete this file.
export async function GET() {
  const keys = webpush.generateVAPIDKeys()
  return NextResponse.json({
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    instructions: 'Add both values as environment variables in Vercel, then delete this route.',
  })
}
