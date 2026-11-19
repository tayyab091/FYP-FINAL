import { test, expect } from '@playwright/test'
import jwt from 'jsonwebtoken'

test('all 1500 exercises paginate, and a detail page renders a working animated preview without a duplicate fetch', async ({ page, request }) => {
  const catalog = await request.get('/api/exercises?meta=true&limit=36&page=1')
  expect(catalog.ok()).toBe(true)
  const data = await catalog.json()
  expect(data.total).toBe(1500)
  expect(data.exercises).toHaveLength(36)
  const errors: string[] = []
  const duplicateRequests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.url().includes('/api/exercises?id=')) duplicateRequests.push(request.url()) })
  const exercise = data.exercises[0]
  await page.goto(`/exercises/${exercise.id}`)
  await expect(page.getByRole('heading', { level: 1, name: exercise.name })).toBeVisible()
  const demo = page.getByAltText(`${exercise.name} — ${exercise.muscle} exercise demonstration`, { exact: true })
  await expect(demo).toBeVisible()
  await expect.poll(() => demo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), { timeout: 15000 }).toBe(true)
  expect(await demo.getAttribute('src')).toMatch(/\.gif|\/api\/exercises\/[^/]+\/preview/)
  expect(duplicateRequests).toEqual([])
  expect(errors).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: '.perf-artifacts/exercise-detail-mobile.png', fullPage: true })
})

test('the chatbot loads on interaction and formats a real fallback response', async ({ page }) => {
  const scripts: string[] = []
  page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()) })
  await page.goto('/login')
  await expect(page.getByRole('dialog', { name: 'AI Fitness Coach' })).toHaveCount(0)
  const scriptCount = scripts.length
  await page.getByRole('button', { name: 'Open AI Fitness Coach', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'AI Fitness Coach' })
  await expect(panel).toBeVisible()
  expect(scripts.length).toBeGreaterThan(scriptCount)
  await panel.getByPlaceholder('Ask about fitness, nutrition...').fill('How do I lose fat?')
  await panel.getByRole('button', { name: 'Send message', exact: true }).click()
  await expect(panel.getByRole('heading', { name: 'Fitness Guidance' })).toBeVisible()
  await expect(panel.locator('ol li')).toHaveCount(3)
  await page.screenshot({ path: '.perf-artifacts/chatbot-formatted.png' })
})

test('a transient exercise image failure recovers without reloading the page', async ({ page }) => {
  let attempts = 0
  await page.route('https://static.exercisedb.dev/media/01qpYSe.gif*', route => {
    attempts++
    if (attempts === 1) return route.fulfill({ status: 503, body: 'Temporarily unavailable' })
    return route.fulfill({ contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64') })
  })
  await page.goto('/exercises/01qpYSe')
  const demo = page.getByAltText('Upward Facing Dog — Back exercise demonstration', { exact: true })
  await expect.poll(() => demo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  expect(attempts).toBeGreaterThan(1)
  await expect(page.getByText('Demo unavailable', { exact: true })).toHaveCount(0)
})

test('chat tables, code, headings, and numbered lists render consistently', async ({ page }) => {
  await page.route('**/api/ai/chat', route => route.fulfill({ json: { reply: '## Training Options\n\n| Day | Activity |\n| --- | --- |\n| Monday | Walking |\n\n### Steps\n\n1. Warm up.\n2. Begin slowly.\n\n```text\nProtein: keep this literal\n```' } }))
  await page.goto('/login')
  await page.getByRole('button', { name: 'Open AI Fitness Coach', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'AI Fitness Coach' })
  await panel.getByPlaceholder('Ask about fitness, nutrition...').fill('Show a table')
  await panel.getByRole('button', { name: 'Send message', exact: true }).click()
  await expect(panel.getByRole('table')).toBeVisible()
  await expect(panel.locator('pre code')).toHaveText('Protein: keep this literal\n')
  await expect(panel.getByRole('heading', { name: 'Steps', exact: true })).toBeVisible()
})

test('nutrition hydrates without a server/client date mismatch', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.install({ time: new Date('2040-01-02T12:00:00Z') })
  await page.goto('/nutrition')
  await expect(page.getByRole('heading', { level: 1, name: 'Fuel Every Ambition' })).toBeVisible()
  await expect(page.getByText(/Monday, January 2|Wednesday, January 2/).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('unknown image hosts and optimizer outages do not crash the library', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/exercises?**', route => route.fulfill({ json: { exercises: [{ id: 'fixture', name: 'Preview fixture', muscle: 'Legs', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: 'https://other.example/preview.png', instructions: 'Move slowly.', sets: 3, reps: '12' }], total: 1, totalPages: 1, meta: { total: 1, bodyParts: [], targetMuscles: [], equipment: [], muscles: [] } } }))
  await page.route('https://other.example/preview.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6h8AAAAASUVORK5CYII=', 'base64') }))
  await page.route('**/_next/image?**', route => route.fulfill({ status: 503, body: 'Optimizer temporarily unavailable' }))
  await page.goto('/exercises')
  await expect(page.getByRole('link', { name: 'Preview fixture', exact: true })).toBeVisible()
  const preview = page.locator('img[src="https://other.example/preview.png"]')
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  const brand = page.locator('img[src$="/brand/logo-light.png"]:visible, img[src$="/brand/logo-dark.png"]:visible').first()
  await expect.poll(() => brand.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  expect(errors).toEqual([])
})

test('dashboard sections load independently and reuse cached data on navigation', async ({ page }) => {
  const id = '000000000000000000000001'
  const token = jwt.sign({ userId: id, role: 'user', email: 'fixture@example.test' }, process.env.JWT_SECRET!, { expiresIn: '1h' })
  const host = new URL(test.info().project.use.baseURL!).hostname
  await page.context().addCookies([{ name: 'token', value: token, domain: host, path: '/' }])
  let releasePlan!: () => void
  const planPending = new Promise<void>(resolve => { releasePlan = resolve })
  let mealsRequests = 0
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    let json: unknown = {}
    if (url.pathname === '/api/auth/me') json = { user: { id, fullName: 'Fixture User', role: 'user' } }
    else if (url.pathname === '/api/tracking/plans/my-plan') { await planPending; json = { plan: null } }
    else if (url.pathname === '/api/tracking/meal-logs/today') { mealsRequests++; json = { totals: { calories: 280, protein: 20, carbs: 30, fat: 9 } } }
    else if (url.pathname === '/api/gamification/me') json = { xp: 100, streak: 2, level: 1 }
    else if (url.pathname === '/api/tracking/logs') json = { logs: [] }
    else if (url.pathname === '/api/exercises') json = { exercises: [], total: 0, totalPages: 1 }
    else if (url.pathname === '/api/notifications') json = { notifications: [], unreadCount: 0 }
    await route.fulfill({ json }).catch(() => {})
  })
  try {
    await page.goto('/dashboard')
    await expect(page.getByText('280 kcal', { exact: true })).toBeVisible()
    await expect(page.getByText('Loading...', { exact: true })).toBeVisible()
    releasePlan()
    await expect(page.getByText('No workout plan yet', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Browse Exercises', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Master Every Movement' })).toBeVisible()
    await page.goBack()
    await expect(page.getByText('280 kcal', { exact: true })).toBeVisible()
    expect(mealsRequests).toBe(1)
  } finally {
    releasePlan()
  }
})
