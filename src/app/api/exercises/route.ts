import { NextRequest, NextResponse } from 'next/server'
import { fetchExerciseById, getExerciseCatalog, getLastFilteredRemovedCount, queryExercises } from '@/lib/exercises-api'

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
      const { meta } = await getExerciseCatalog()
      const preview = await queryExercises({
        search,
        muscle,
        bodyPart,
        target,
        equipment,
        page: 1,
        limit: Math.min(limit, 24),
      })
      return NextResponse.json({
        meta: { ...meta, filteredRemoved: getLastFilteredRemovedCount() },
        exercises: preview.exercises,
        total: preview.total,
        page: preview.page,
        limit: preview.limit,
        totalPages: preview.totalPages,
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
