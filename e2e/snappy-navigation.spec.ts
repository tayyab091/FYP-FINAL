import { test, expect, type Page } from '@playwright/test'
import jwt from 'jsonwebtoken'

const exercise = { id: 'snappy-fixture', name: 'Controlled Squat', muscle: 'Legs', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: '', instructions: 'Move slowly.', sets: 3, reps: '8' }
const meal = { id: '10001', name: 'Lentil bowl', category: 'Vegetarian', area: 'Pakistani', thumb: '' }

async function fixtureSession(page: Page, role?: 'trainer' | 'gym_owner' | 'admin', onRequest?: (url: URL) => void) {
  const id = '000000000000000000000001'
  if (role) {
    const token = jwt.sign({ userId: id, role, email: 'fixture@example.test' }, process.env.JWT_SECRET!, { expiresIn: '1h' })
    await page.context().addCookies([{ name: 'token', value: token, domain: new URL(test.info().project.use.baseURL!).hostname, path: '/' }])
  }
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    onRequest?.(url)
    let json: unknown = {}
    if (url.pathname === '/api/auth/me') json = { user: role ? { id, fullName: 'Fixture User', role, email: 'fixture@example.test' } : null }
    else if (url.pathname === '/api/exercises') json = { exercises: [exercise], total: 1, page: 1, totalPages: 1, meta: { total: 1, muscles: ['Legs'], bodyParts: ['upper legs'], equipment: ['Bodyweight'], targetMuscles: ['quads'] } }
    else if (url.pathname === '/api/meals') json = { meals: [meal], total: 1, page: 1, totalPages: 1, meta: { total: 1, categories: ['Vegetarian'], areas: ['Pakistani'] } }
    else if (url.pathname === '/api/meal-plans') json = []
    else if (url.pathname === '/api/notifications') json = { notifications: [], unreadCount: 0 }
    await route.fulfill({ json })
  })
}

test('typing an exercise search makes one debounced request', async ({ page }) => {
  const requests: string[] = []
  await fixtureSession(page, undefined, url => { if (url.pathname === '/api/exercises') requests.push(url.searchParams.get('search') || '') })
  await page.goto('/exercises')
  await expect(page.getByRole('link', { name: exercise.name, exact: true }).first()).toBeVisible()
  const initialRequests = requests.length
  const search = page.getByPlaceholder('Search exercises by name...')
  await search.pressSequentially('squat', { delay: 25 })
  expect(requests).toHaveLength(initialRequests)
  await expect.poll(() => requests.at(-1)).toBe('squat')
  expect(requests).toHaveLength(initialRequests + 1)
})

for (const [role, path] of [['trainer', '/trainer-dashboard/nutrition'], ['gym_owner', '/gym-owner/nutrition'], ['admin', '/admin/nutrition']] as const) {
  test(`${role}: nutrition filters load with one catalog request`, async ({ page }) => {
    const requests: URL[] = []
    await fixtureSession(page, role, url => { if (url.pathname === '/api/meals') requests.push(url) })
    await page.goto(path)
    await expect(page.getByRole('link', { name: meal.name, exact: true }).first()).toBeVisible()
    await expect(page.getByRole('option', { name: 'Vegetarian', exact: true })).toBeAttached()
    expect(requests).toHaveLength(1)
    expect(requests[0].searchParams.get('meta')).toBe('true')
  })
}

test('notification polling pauses in a hidden tab and refreshes on return', async ({ page }) => {
  await page.clock.install()
  let notifications = 0
  await fixtureSession(page, 'trainer', url => { if (url.pathname === '/api/notifications') notifications++ })
  await page.goto('/trainer-dashboard/exercises')
  await expect.poll(() => notifications).toBe(1)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.fastForward(120_000)
  expect(notifications).toBe(1)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => notifications).toBe(2)
})

test('a previously loaded public exercise response is reused while offline', async ({ page, context }) => {
  await page.goto('/login')
  const first = await page.evaluate(async () => {
    const response = await fetch('/api/exercises?meta=true&limit=2')
    return { cacheControl: response.headers.get('cache-control'), data: await response.json() }
  })
  expect(first.cacheControl).toContain('public')
  expect(first.data.exercises).toHaveLength(2)
  await context.setOffline(true)
  try {
    const cached = await page.evaluate(async () => (await fetch('/api/exercises?meta=true&limit=2')).json())
    expect(cached.exercises).toEqual(first.data.exercises)
  } finally {
    await context.setOffline(false)
  }
})
