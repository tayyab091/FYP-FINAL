import { NextRequest, NextResponse } from 'next/server'

const NUTRITION_DB: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {
  'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  'chicken biryani': { calories: 195, protein: 15, carbs: 25, fat: 5 },
  'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  'daal': { calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  'roti': { calories: 71, protein: 2.6, carbs: 15, fat: 0.4 },
  'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  'milk': { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  'yogurt': { calories: 59, protein: 3.5, carbs: 3.6, fat: 3.3 },
  'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  'paneer': { calories: 265, protein: 18, carbs: 3.4, fat: 20 },
  'salmon': { calories: 208, protein: 20, carbs: 0, fat: 13 },
  'oats': { calories: 389, protein: 17, carbs: 66, fat: 7 },
  'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  'beef': { calories: 250, protein: 26, carbs: 0, fat: 15 },
  'mutton': { calories: 258, protein: 25, carbs: 0, fat: 17 },
  'fish': { calories: 136, protein: 25, carbs: 0, fat: 4 },
  'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  'paratha': { calories: 297, protein: 6, carbs: 36, fat: 14 },
  'nihari': { calories: 210, protein: 18, carbs: 8, fat: 13 },
  'haleem': { calories: 175, protein: 14, carbs: 15, fat: 7 },
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const query = searchParams.get('query')?.toLowerCase() || ''

    if (!query) {
      return NextResponse.json({ message: 'Query required' }, { status: 400 })
    }

    // Try Spoonacular if key available
    const spoonKey = process.env.SPOONACULAR_API_KEY
    if (spoonKey && spoonKey !== 'PASTE_SPOONACULAR_KEY_HERE') {
      try {
        const res = await fetch(
          `https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(query)}&number=5&apiKey=${spoonKey}`,
          { next: { revalidate: 3600 } }
        )
        if (res.ok) {
          const data = await res.json()
          if (data.results?.length > 0) {
            const results = data.results.map((item: any) => ({
              name: item.name,
              calories: Math.round(item.nutrition?.nutrients?.find((n: any) => n.name === 'Calories')?.amount || 0),
              protein: Math.round(item.nutrition?.nutrients?.find((n: any) => n.name === 'Protein')?.amount || 0),
              carbs: Math.round(item.nutrition?.nutrients?.find((n: any) => n.name === 'Carbohydrates')?.amount || 0),
              fat: Math.round(item.nutrition?.nutrients?.find((n: any) => n.name === 'Fat')?.amount || 0),
              per: '100g',
            }))
            return NextResponse.json({ results })
          }
        }
      } catch (e) {
        // Fall through to local DB
      }
    }

    // Use local nutrition DB
    const results = Object.entries(NUTRITION_DB)
      .filter(([key]) => key.includes(query) || query.includes(key))
      .map(([name, nutrition]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        ...nutrition,
        per: '100g',
      }))
      .slice(0, 5)

    if (results.length === 0) {
      // Generic fallback
      return NextResponse.json({
        results: [{
          name: query.charAt(0).toUpperCase() + query.slice(1),
          calories: 200,
          protein: 10,
          carbs: 25,
          fat: 8,
          per: '100g (estimated)',
        }]
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
