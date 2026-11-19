import { NextRequest, NextResponse } from 'next/server'
import { getExerciseCatalog } from '@/lib/exercises-api'

/** Only catalog IDs can be proxied; clients cannot supply an upstream URL. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const exercise = (await getExerciseCatalog()).exercises.find(item => item.id === id)
  if (!exercise) return NextResponse.json({ message: 'Exercise not found' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
  try {
    const response = await fetch(`https://static.exercisedb.dev/media/${encodeURIComponent(id)}.gif`, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 }, redirect: 'error' })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
      return NextResponse.json({ message: 'Preview temporarily unavailable' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } })
    }
    return new Response(response.body, { headers: { 'Content-Type': response.headers.get('content-type')!, 'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400', 'X-Content-Type-Options': 'nosniff' } })
  } catch { return NextResponse.json({ message: 'Preview temporarily unavailable' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } }) }
}
