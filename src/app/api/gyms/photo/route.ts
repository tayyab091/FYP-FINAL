import { NextRequest, NextResponse } from 'next/server'
import { readPhotoToken } from '@/lib/google-gym-photos'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, 'gym-photo', 100, 600_000)
  if (limited) return limited
  const name = readPhotoToken(req.nextUrl.searchParams.get('token') || '')
  if (!name) return NextResponse.json({ message: 'Invalid or expired photo request' }, { status: 400 })
  if (!process.env.GOOGLE_MAPS_API_KEY) return new NextResponse(null, { status: 503 })
  try {
    const response = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=1000&key=${encodeURIComponent(process.env.GOOGLE_MAPS_API_KEY)}`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return new NextResponse(null, { status: 502 })
    return new NextResponse(response.body, { headers: { 'Content-Type': response.headers.get('content-type')!, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch { return new NextResponse(null, { status: 502 }) }
}
