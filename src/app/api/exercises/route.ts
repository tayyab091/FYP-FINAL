import { NextRequest, NextResponse } from 'next/server'
import { fetchExerciseById, getLastFilteredRemovedCount, queryExercises } from '@/lib/exercises-api'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    const metaOnly = searchParams.get('meta') === 'true'
    const search = searchParams.get('search') || undefined
    const muscle = searchParams.get('muscle') || undefined
    const bodyPart = searchParams.get('bodyPart') || undefined
    const target = searchParams.get('target') || undefined
    const equipment = searchParams.get('equipment') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10) || 24))

    if (id) {
      const exercise = await fetchExerciseById(id)
      if (!exercise) return NextResponse.json({ message: 'Exercise not found' }, { status: 404 })
      return NextResponse.json(exercise)
    }

    if (metaOnly) {
      const result = await queryExercises({
        search,
        muscle,
        bodyPart,
        target,
        equipment,
        page: 1,
        limit: Math.min(limit, 24),
        includeMeta: true,
      })
      // #region agent log
      fetch('http://127.0.0.1:7893/ingest/3b5841b0-46ed-4652-9b9f-279e38a5ba27',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1483ff'},body:JSON.stringify({sessionId:'1483ff',hypothesisId:'H1-H2',location:'api/exercises/route.ts:meta',message:'exercises meta response',data:{exerciseCount:result.exercises.length,total:result.total},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return NextResponse.json({
        meta: { ...result.meta!, filteredRemoved: getLastFilteredRemovedCount() },
        exercises: result.exercises,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      })
    }

    const result = await queryExercises({
      search,
      muscle,
      bodyPart,
      target,
      equipment,
      page,
      limit,
      includeMeta: searchParams.get('meta') === 'true' || searchParams.has('includeMeta'),
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ message: 'Failed to fetch exercises' }, { status: 500 })
  }
}
