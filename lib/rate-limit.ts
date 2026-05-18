import { NextResponse } from 'next/server'

type RateLimitConfig = {
  windowMs: number
  maxRequests: number
  keyPrefix: string
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export const rateLimitConfigs = {
  chat: {
    keyPrefix: 'chat',
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  requestAccess: {
    keyPrefix: 'request-access',
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
  },
  adminInvite: {
    keyPrefix: 'admin-invite',
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
  },
  processDocument: {
    keyPrefix: 'process-document',
    windowMs: 10 * 60 * 1000,
    maxRequests: 5,
  },
} satisfies Record<string, RateLimitConfig>

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return realIp || 'unknown'
}

export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  identifier?: string | null
) {
  const now = Date.now()
  const clientIp = getClientIp(request)
  const key = `${config.keyPrefix}:${identifier || clientIp}`

  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })

    return null
  }

  if (existing.count >= config.maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    )

    return NextResponse.json(
      {
        error: 'Too many requests. Please wait a moment and try again.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(existing.resetAt),
        },
      }
    )
  }

  existing.count += 1
  rateLimitStore.set(key, existing)

  return null
}