import { NextRequest, NextResponse } from 'next/server'
import {
  getMealById,
  getMealCatalog,
  getRandomMeals,
  listAreas,
  listCategories,
  queryMeals,
  searchMeals,
} from '@/lib/meals'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    const metaOnly = searchParams.get('meta') === 'true'
    const search = searchParams.get('search') || undefined
    const category = searchParams.get('category') || undefined
    const area = searchParams.get('area') || undefined
    const letter = searchParams.get('letter') || undefined
    const random = searchParams.get('random')
    const categories = searchParams.get('categories')
    const areas = searchParams.get('areas')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10) || 24))

    if (categories === 'true') {
      const list = await listCategories()
      return NextResponse.json({ categories: list })
    }

    if (areas === 'true') {
      const list = await listAreas()
      return NextResponse.json({ areas: list })
    }

    if (id) {
      const meal = await getMealById(id)
      if (!meal) return NextResponse.json({ message: 'Meal not found' }, { status: 404 })
      return NextResponse.json(meal)
    }

    if (metaOnly) {
      const { meta } = await getMealCatalog()
      const preview = await queryMeals({
        search,
        category,
        area,
        letter,
        page: 1,
        limit: Math.min(limit, 24),
      })
      return NextResponse.json({
        meta,
        meals: preview.meals,
        total: preview.total,
        page: preview.page,
        limit: preview.limit,
        totalPages: preview.totalPages,
      })
    }

    if (search && !category && !area && !letter) {
      const remoteResults = await searchMeals(search)
      if (remoteResults.length > 0) {
        const paged = remoteResults.slice((page - 1) * limit, page * limit)
        return NextResponse.json({
          meals: paged,
          total: remoteResults.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(remoteResults.length / limit)),
        })
      }
    }

    if (random && !search && !category && !area && !letter) {
      const count = Math.min(24, Math.max(1, parseInt(random, 10) || 6))
      const meals = await getRandomMeals(count)
      return NextResponse.json({ meals, total: meals.length, page: 1, limit: count, totalPages: 1 })
    }

    const result = await queryMeals({
      search,
      category,
      area,
      letter,
      page,
      limit,
      includeMeta: searchParams.has('includeMeta'),
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ message: 'Failed to fetch meals' }, { status: 500 })
  }
}
