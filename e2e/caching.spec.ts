import { test, expect, type Page } from '@playwright/test'
import jwt from 'jsonwebtoken'

const id = '000000000000000000000001'
const fixtureUser = { id, fullName: 'Cache Member', email: 'cache@example.test', role: 'user', subscription: { plan: 'elite', status: 'active' } }
const meal = { id: '10001', name: 'Cached lentil bowl', category: 'Vegetarian', area: 'Pakistani', thumb: '' }

async function fixture(page: Page, role?: 'trainer' | 'user') {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const requests: URL[] = []
  const cookie = { name: 'token', value: jwt.sign({ userId: id, role, email: fixtureUser.email }, process.env.JWT_SECRET!, { expiresIn: '1h' }), domain: new URL(test.info().project.use.baseURL!).hostname, path: '/' }
  if (role) await page.context().addCookies([cookie])
  await page.route('https://www.google.com/maps**', route => route.abort())
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    requests.push(url)
    let json: unknown = {}
    if (url.pathname === '/api/auth/me') json = { user: role ? { ...fixtureUser, role } : null }
    if (url.pathname === '/api/exercises') json = { exercises: [{ id: 'cache-exercise', name: url.searchParams.get('search') ? 'Cached squat' : 'Cached curl', muscle: 'Arms', equipment: 'Dumbbell', difficulty: 'Beginner', gifUrl: '', sets: 3, reps: '12', instructions: 'Move steadily.' }], total: 1, page: 1, totalPages: 1, meta: { total: 1, muscles: ['Arms'], equipment: ['Dumbbell'], bodyParts: ['arms'], targetMuscles: ['biceps'] } }
    if (url.pathname === '/api/meals') json = url.searchParams.has('id') ? { ...meal, instructions: 'Cook until tender.', ingredients: [{ name: 'Lentils', measure: '1 cup' }] } : { meals: [meal], total: 1, page: 1, totalPages: 1, meta: { total: 1, categories: ['Vegetarian'], areas: ['Pakistani'] } }
    if (url.pathname === '/api/trainers') json = { trainers: [{ _id: id, slug: 'cache-coach', name: 'Cached Coach', specialty: ['Strength'], country: 'Pakistan', isFullyVerified: true }], meta: { source: 'database', connectable: true } }
    if (url.pathname === '/api/gyms') json = { gyms: [{ id, slug: 'cache-gym', name: 'Cached Gym', address: 'Lahore', city: 'Lahore', country: 'Pakistan', facilities: [], images: [], trainersCount: 0, rating: 4, reviewsCount: 1, source: 'test', verificationStatus: 'verified' }] }
    if (url.pathname === '/api/meal-plans' || url.pathname === '/api/relationships') json = []
    if (url.pathname === '/api/notifications') json = { notifications: [], unreadCount: 0 }
    if (url.pathname === '/api/tracking/plans/my-plan') json = { plan: null }
    if (url.pathname === '/api/tracking/meal-logs/today') json = { meals: [], totals: { calories: 212, protein: 20, carbs: 30, fat: 4 } }
    if (url.pathname === '/api/tracking/logs') json = { logs: [] }
    if (url.pathname === '/api/gamification/me') json = { xp: 0, streak: 0, level: 1 }
    return route.fulfill({ json })
  })
  return { requests, cookie }
}

test('catalogs and recipe previews are reused when navigating between screens', async ({ page }) => {
  const { requests } = await fixture(page)
  await page.goto('/exercises')
  await expect(page.getByRole('link', { name: 'Cached curl', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Nutrition', exact: true }).first().click()
  await page.getByRole('button', { name: 'Quick preview' }).first().click()
  await expect(page.getByText('Lentils', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Exercises', exact: true }).first().click()
  await expect(page.getByRole('link', { name: 'Cached curl', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Nutrition', exact: true }).first().click()
  await page.getByRole('button', { name: 'Quick preview' }).first().click()
  await expect(page.getByText('Lentils', { exact: true })).toBeVisible()
  expect(requests.filter(url => url.pathname === '/api/exercises')).toHaveLength(1)
  expect(requests.filter(url => url.pathname === '/api/meals' && !url.searchParams.has('id'))).toHaveLength(1)
  expect(requests.filter(url => url.pathname === '/api/meals' && url.searchParams.has('id'))).toHaveLength(1)
})

test('returning to an earlier exercise filter uses its cached result', async ({ page }) => {
  const { requests } = await fixture(page)
  await page.goto('/exercises')
  await expect(page.getByRole('link', { name: 'Cached curl', exact: true })).toBeVisible()
  const search = page.getByPlaceholder('Search exercises by name...')
  await search.fill('squat')
  await expect(page.getByRole('link', { name: 'Cached squat', exact: true })).toBeVisible()
  await search.clear()
  await expect(page.getByRole('link', { name: 'Cached curl', exact: true })).toBeVisible()
  expect(requests.filter(url => url.pathname === '/api/exercises')).toHaveLength(2)
})

test('public gym and trainer directories reuse recent results', async ({ page }) => {
  const { requests } = await fixture(page)
  await page.goto('/gyms')
  await expect(page.getByRole('heading', { name: 'Cached Gym', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Find Trainers', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Cached Coach', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Find Gyms', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Cached Gym', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Find Trainers', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Cached Coach', exact: true })).toBeVisible()
  expect(requests.filter(url => url.pathname === '/api/gyms')).toHaveLength(1)
  expect(requests.filter(url => url.pathname === '/api/trainers')).toHaveLength(1)
})

test('trainer and public nutrition screens share the same recipe cache', async ({ page }) => {
  const { requests } = await fixture(page, 'trainer')
  const catalogRequest = page.waitForRequest('**/api/meals?**')
  await page.goto('/trainer-dashboard/nutrition')
  expect((await (await catalogRequest).allHeaders()).cookie).toBeUndefined()
  await expect(page.getByRole('link', { name: meal.name, exact: true })).toBeVisible()
  await page.locator('a[href="/nutrition"]').last().click()
  await expect(page.getByRole('heading', { name: 'Fuel Every Ambition' })).toBeVisible()
  await expect(page.getByRole('link', { name: meal.name, exact: true })).toBeVisible()
  expect(requests.filter(url => url.pathname === '/api/meals')).toHaveLength(1)
})

test('a directory timeout clears the loader and a new search can recover', async ({ page }) => {
  await fixture(page)
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/trainers**', async route => {
    if (new URL(route.request().url()).searchParams.has('search')) return route.fallback()
    await pending
    await route.fulfill({ json: { trainers: [] } }).catch(() => {})
  })
  try {
    await page.goto('/coaching')
    await expect(page.getByRole('heading', { name: 'No trainers found', exact: true })).toBeVisible({ timeout: 12000 })
    await page.getByPlaceholder('Search by name, specialty, or keyword...').fill('recovered')
    await expect(page.getByRole('heading', { name: 'Cached Coach', exact: true })).toBeVisible()
  } finally {
    release()
  }
})

test('private data refreshes after logging out and signing back in', async ({ page }) => {
  const { cookie } = await fixture(page, 'user')
  let signedIn = true
  let mealsRequests = 0
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: signedIn ? fixtureUser : null } }))
  await page.route('**/api/tracking/meal-logs/today', route => route.fulfill({ json: { meals: [], totals: { calories: ++mealsRequests === 1 ? 212 : 800, protein: 20, carbs: 30, fat: 4 } } }))
  await page.route('**/api/auth/logout', async route => {
    signedIn = false
    await page.context().clearCookies()
    await route.fulfill({ json: { success: true } })
  })
  await page.route('**/api/auth/login', async route => {
    signedIn = true
    await page.context().addCookies([cookie])
    await route.fulfill({ json: { user: fixtureUser } })
  })
  await page.goto('/dashboard')
  await expect(page.getByText('212 kcal', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click()
  await page.getByRole('link', { name: 'Sign In', exact: true }).first().click()
  await page.getByLabel('Email address', { exact: true }).fill(fixtureUser.email)
  await page.getByLabel('Password', { exact: true }).fill('cache-fixture-only')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await expect(page.getByText('800 kcal', { exact: true })).toBeVisible()
  expect(mealsRequests).toBe(2)
})

test('HTTP caches accept public catalogs and bypass account APIs', async ({ request }) => {
  for (const path of ['/api/exercises?meta=true&limit=1', '/api/meals?meta=true&limit=1', '/api/meals?page=1&limit=1']) {
    const response = await request.get(path)
    expect(response.ok()).toBe(true)
    expect(response.headers()['cache-control']).toContain('public')
    expect(response.headers()['cache-control']).toContain('s-maxage=3600')
  }
  for (const path of ['/api/auth/me', '/api/meal-plans', '/api/gym-owner/analytics']) {
    const response = await request.get(path)
    expect(response.status()).toBe(path === '/api/auth/me' ? 200 : 401)
    if (path === '/api/auth/me') expect(await response.json()).toEqual({ user: null })
    expect(response.headers()['cache-control']).toContain('private')
    expect(response.headers()['cache-control']).toContain('no-store')
  }
  const missing = await request.get('/api/exercises/cache-missing/preview')
  expect(missing.status()).toBe(404)
  expect(missing.headers()['cache-control']).toContain('no-store')
})
