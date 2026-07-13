import { NextRequest, NextResponse } from 'next/server'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

function clientKey(req: NextRequest, scope: string): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip =
    (forwarded ? forwarded.split(',')[0]?.trim() : '') ||
    req.headers.get('x-real-ip') ||
    'unknown'
  return `${scope}:${ip}`
}

/**
 * Fixed-window in-memory rate limiter (per serverless instance).
 * Suitable for local/dev and soft production protection; use Redis for multi-instance hard limits.
 */
export function rateLimit(
  req: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const key = clientKey(req, scope)
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  existing.count += 1
  if (existing.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    return NextResponse.json(
      { message: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    )
  }

  return null
}

/** Auth endpoints: 20 attempts / 15 minutes per IP */
export function rateLimitAuth(req: NextRequest) {
  return rateLimit(req, 'auth', 20, 15 * 60 * 1000)
}

/** AI / cost endpoints: 30 requests / 10 minutes per IP */
export function rateLimitAi(req: NextRequest) {
  return rateLimit(req, 'ai', 30, 10 * 60 * 1000)
}

/** Upload endpoints: 20 uploads / 10 minutes per IP */
export function rateLimitUpload(req: NextRequest) {
  return rateLimit(req, 'upload', 20, 10 * 60 * 1000)
}
