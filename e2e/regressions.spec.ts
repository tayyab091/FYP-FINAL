import { test, expect, type Page } from '@playwright/test'
import jwt from 'jsonwebtoken'

const exercise = { id: 'audit-exercise', name: 'Controlled Squat', muscle: 'Legs', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: '/missing-audit-preview.png', bodyParts: ['legs'], targetMuscles: ['quads'] }
const exercisePage = { exercises: [exercise], total: 1, page: 1, totalPages: 1, meta: { total: 1, muscles: ['Legs'], bodyParts: ['legs'], equipment: ['Bodyweight'], targetMuscles: ['quads'] } }
const meal = { id: '10001', name: 'Test lentil bowl', category: 'Vegetarian', area: 'Pakistani', thumb: '/missing-audit-preview.png' }

async function fixtureSession(page: Page, role: 'trainer' | 'user' | null) {
  if (role) {
    const token = jwt.sign({ userId: '000000000000000000000001', role, email: 'fixture@example.test' }, process.env.JWT_SECRET!, { expiresIn: '1h' })
    await page.context().addCookies([{ name: 'token', value: token, domain: 'localhost', path: '/' }])
  }
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    let data: unknown = {}
    if (url.pathname === '/api/auth/me') data = { user: role ? { id: '000000000000000000000001', fullName: 'Audit User', role, email: 'fixture@example.test', subscription: { plan: 'pro', status: 'active' } } : null }
    else if (url.pathname === '/api/exercises') data = exercisePage
    else if (url.pathname === '/api/meals') data = url.searchParams.has('id') ? { ...meal, ingredients: [{ name: 'Lentils', measure: '1 cup' }], instructions: 'Rinse the lentils. Cook until tender. Serve warm.' } : { meals: [meal], total: 1, page: 1, totalPages: 1, categories: ['Vegetarian'], areas: ['Pakistani'], meta: { total: 1, categories: ['Vegetarian'], areas: ['Pakistani'] } }
    else if (url.pathname === '/api/meal-plans') data = []
    else if (url.pathname === '/api/notifications') data = { notifications: [], unreadCount: 0 }
    else if (url.pathname === '/api/chat/conversations') data = []
    else if (url.pathname === '/api/trainers') data = { trainers: [], total: 0 }
    await route.fulfill({ json: data })
  })
}

test.describe('Offline UI regressions — explicit API fixtures', () => {
  test('exercise fetch failure offers recovery and broken media has a fallback', async ({ page }) => {
    await fixtureSession(page, 'trainer')
    let fail = true
    await page.route('**/api/exercises?**', (route) => route.fulfill(fail ? { status: 503, json: { message: 'unavailable' } } : { json: exercisePage }))
    await page.goto('/trainer-dashboard/exercises')
    await expect(page.getByRole('alert').filter({ hasText: 'Unable to load exercises' })).toBeVisible()
    fail = false
    await page.getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(page.getByRole('heading', { name: exercise.name })).toBeVisible()
    await expect(page.getByRole('img', { name: `${exercise.name}: preview unavailable` })).toBeVisible()
  })

  test('a slow old exercise search cannot overwrite a newer result', async ({ page }) => {
    await fixtureSession(page, 'trainer')
    let releaseOld!: () => void
    const oldPending = new Promise<void>((resolve) => { releaseOld = resolve })
    await page.route('**/api/exercises?**', async (route) => {
      const search = new URL(route.request().url()).searchParams.get('search')
      if (search === 'old') await oldPending
      await route.fulfill({ json: { ...exercisePage, exercises: [{ ...exercise, name: search || exercise.name }] } }).catch(() => {})
    })
    await page.goto('/trainer-dashboard/exercises')
    const search = page.getByRole('textbox', { name: 'Search exercises' })
    await search.fill('old')
    await page.waitForRequest((req) => req.url().includes('search=old'))
    await search.fill('new')
    await expect(page.getByRole('heading', { name: 'new', exact: true })).toBeVisible()
    releaseOld()
    await expect(page.getByRole('heading', { name: 'new', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'old', exact: true })).toHaveCount(0)
  })

  for (const path of ['/nutrition', '/trainer-dashboard/nutrition']) {
    test(`${path}: failed recipe preview can be retried`, async ({ page }) => {
      await fixtureSession(page, path.startsWith('/trainer') ? 'trainer' : null)
      let fail = true
      await page.route('**/api/meals?id=*', (route) => route.fulfill(fail ? { status: 503, json: {} } : { json: { ...meal, ingredients: [{ name: 'Lentils', measure: '1 cup' }], instructions: 'Rinse. Cook. Serve.' } }))
      await page.goto(path)
      const preview = page.getByRole('button', { name: 'Quick preview' }).first()
      await preview.click()
      await expect(page.getByRole('button', { name: 'Hide preview' }).first()).toHaveAttribute('aria-expanded', 'true')
      await expect(page.getByRole('alert').filter({ hasText: 'Unable to load this recipe preview' })).toBeVisible()
      fail = false
      await page.getByRole('button', { name: 'Retry preview' }).click()
      await expect(page.getByText('Lentils', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Retry preview' })).toHaveCount(0)
      await expect(page.locator('img[src*="missing-audit-preview"]')).toHaveCount(0)
      await page.setViewportSize({ width: 390, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: `test-results/${path.includes('trainer') ? 'trainer' : 'public'}-recipe-mobile.png`, fullPage: true })
    })
  }

  test('subscription return URLs cannot falsely claim activation', async ({ page }) => {
    await fixtureSession(page, null)
    await page.goto('/subscription?success=true&plan=elite')
    await expect(page.getByText('Missing payment confirmation. Please check your current plan.')).toBeVisible()
    await expect(page.getByText('Elite plan activated!')).toHaveCount(0)
    await page.goto('/subscription?cancelled=true')
    await expect(page.getByText('Payment canceled. No charges were made.')).toBeVisible()
  })

  for (const mode of ['stripe', 'demo', 'unavailable'] as const) {
    test(`checkout displays the server's ${mode} mode`, async ({ page }) => {
      await fixtureSession(page, 'user')
      await page.route('**/api/subscription', (route) => route.fulfill({ json: { stripeEnabled: mode === 'stripe', simulationEnabled: mode === 'demo' } }))
      await page.goto('/subscription')
      await page.getByRole('button', { name: 'Get Elite', exact: true }).click()
      const dialog = page.getByRole('dialog')
      if (mode === 'unavailable') {
        await expect(dialog.getByText('Checkout is currently unavailable. Please try again later.')).toBeVisible()
        await expect(dialog.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
      } else {
        await expect(dialog.getByRole('button', { name: mode === 'stripe' ? 'Continue to Stripe' : 'Activate Demo Plan' })).toBeEnabled()
      }
    })
  }

  test('exercise workspace is usable in dark mode on desktop', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
    await fixtureSession(page, 'trainer')
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/trainer-dashboard/exercises')
    await expect(page.getByRole('heading', { name: exercise.name })).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/dark/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.screenshot({ path: 'test-results/exercise-desktop-dark.png', fullPage: true })
  })
})

test.describe('Public page and protected-route smoke checks', () => {
  for (const path of ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/register-trainer', '/register-gym-owner', '/exercises', '/nutrition', '/coaching', '/gyms', '/subscription', '/exercise-check', '/privacy', '/terms']) {
    test(`renders ${path} on mobile without a client crash`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user: null } }))
      await page.setViewportSize({ width: 390, height: 844 })
      const response = await page.goto(path)
      expect(response?.status()).toBeLessThan(400)
      await expect(page.locator('main')).toBeVisible()
      await expect(page.getByRole('heading').first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      expect(errors).toEqual([])
    })
  }
  for (const path of ['/dashboard', '/my-fitness', '/meal-plans', '/community', '/chat', '/leaderboard', '/analytics', '/live-sessions', '/notifications', '/settings', '/trainer-dashboard', '/gym-owner', '/admin']) {
    test(`guest cannot access ${path}`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 })
      expect([302, 307]).toContain(response.status())
      expect(response.headers().location).toContain('/login?redirect=')
    })
  }
})
