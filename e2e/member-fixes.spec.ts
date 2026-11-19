import { test, expect, type Page } from '@playwright/test'
import jwt from 'jsonwebtoken'

const id = '000000000000000000000001'
const gym = { id: '000000000000000000000002', slug: 'fixture-gym', name: 'Fixture Gym', address: 'Lahore', city: 'Lahore', description: 'A local gym.', rating: 0, reviewsCount: 0, facilities: ['Strength floor'], images: [], trainersCount: 0, verificationStatus: 'verified', source: 'test' }
const user = { id, fullName: 'Fixture Member', email: 'fixture@example.test', role: 'user', fitnessGoal: 'weight_loss', activityLevel: 'moderate', currentWeight: 80, targetWeight: 70, calorieGoal: 2100, subscription: { plan: 'elite', status: 'active' } }
const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

async function setup(page: Page, role = 'user', theme = 'light', plan = 'elite') {
  const member = { ...user, role, subscription: { plan, status: 'active' } }
  await page.addInitScript(value => localStorage.setItem('theme', value), theme)
  await page.context().addCookies([{ name: 'token', value: jwt.sign({ userId: id, role, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' }), domain: new URL(test.info().project.use.baseURL!).hostname, path: '/' }])
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    let json: unknown = {}
    if (url.pathname === '/api/auth/me') json = { user: member }
    else if (url.pathname === '/api/exercises') json = { exercises: [1, 2, 3].map(index => ({ id: `fixture-${index}`, name: `Squat ${index}`, gifUrl: `https://static.exercisedb.dev/media/fixture-${index}.gif`, muscle: 'Legs', equipment: 'Bodyweight', difficulty: 'Beginner', instructions: 'Stand tall. Bend your knees slowly. Keep your balance. Return to standing.', sets: 3, reps: '8' })), total: 3, totalPages: 1 }
    else if (url.pathname === '/api/gyms/fixture-gym') json = gym
    else if (url.pathname === '/api/gyms/fixture-gym/reviews') json = { reviews: [], averageRating: 0, reviewCount: 0, currentUserReview: null }
    else if (url.pathname === '/api/user/reviews') json = { reviews: [{ id: 'review-1', type: 'Trainer', name: 'My Coach', href: '/coaching/coach#reviews', rating: 5, comment: 'Helpful and consistent coaching.' }] }
    else if (url.pathname === '/api/gym-owner/gym') json = gym
    else if (url.pathname === '/api/gym-owner/trainers') json = []
    else if (url.pathname === '/api/gym-owner/analytics') json = { totals: {}, trainers: [], gym: { rating: 4.5, reviewsCount: 8, facilities: ['Strength floor'], galleryPhotos: 3, verificationStatus: 'verified', profileComplete: 5, profileFields: 7, ratingDistribution: [{ rating: 5, count: 4 }], sessions: { scheduled: 2, live: 1, ended: 5 } } }
    else if (url.pathname === '/api/tracking/meal-logs/today') json = { meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
    else if (url.pathname === '/api/tracking/progress' || url.pathname === '/api/meal-plans') json = []
    else if (url.pathname === '/api/notifications') json = { notifications: [], unreadCount: 0 }
    else if (url.pathname === '/api/tracking/plans/my-plan') json = { plan: null }
    else if (url.pathname === '/api/tracking/logs/active') json = { log: null }
    else if (url.pathname === '/api/tracking/logs') json = { logs: [], totalCompleted: 0, streak: 0 }
    else if (url.pathname === '/api/meals') json = { meals: [], total: 0 }
    return route.fulfill({ json })
  })
  await page.route('https://static.exercisedb.dev/**', route => route.fulfill({ contentType: 'image/gif', body: gif }))
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: exercise previews render and expanding one card preserves its neighbour height`, async ({ page }) => {
    await setup(page, 'user', theme)
    await page.goto('/exercises')
    const buttons = page.getByRole('button', { name: 'View instructions', exact: true })
    await expect(buttons).toHaveCount(3)
    const images = page.locator('img[src*="static.exercisedb.dev"]')
    await expect(images).toHaveCount(3)
    await expect.poll(() => images.evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
    const cards = page.locator('.card-athletic').filter({ has: page.getByRole('button', { name: 'View instructions', exact: true }) })
    const neighbour = cards.nth(1)
    const height = (await neighbour.boundingBox())!.height
    await buttons.first().click()
    await expect(page.getByRole('button', { name: 'Hide instructions', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await expect.poll(async () => Math.round((await neighbour.boundingBox())!.height)).toBe(Math.round(height))
    const textColor = await page.getByRole('button', { name: 'Hide instructions', exact: true }).evaluate(element => getComputedStyle(element).color)
    expect(textColor).not.toBe(theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)')
    await page.screenshot({ path: `.perf-artifacts/issues-exercises-${theme}.png`, fullPage: true })
  })

  test(`${theme}: gym heading and not-found screen use the selected theme`, async ({ page }) => {
    await setup(page, 'user', theme)
    await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' })
    await page.goto('/gyms')
    const heading = page.getByRole('heading', { name: 'Find your training ground', exact: true })
    await expect(heading).toBeVisible()
    const color = await heading.evaluate(element => getComputedStyle(element).color)
    expect(color).toBe(theme === 'light' ? 'rgb(20, 35, 28)' : 'rgb(244, 247, 245)')
    await page.goto('/missing-page-fixture')
    await expect(page.getByRole('heading', { name: 'This route missed the mark.' })).toBeVisible()
    await expect(page.locator('html')).toHaveClass(new RegExp(theme))
    await page.screenshot({ path: `.perf-artifacts/issues-not-found-${theme}.png` })
  })
}

for (const path of ['/nutrition', '/my-fitness?tab=nutrition']) test(`${path}: member nutrition details come from the shared profile`, async ({ page }) => {
  await setup(page)
  await page.goto(path)
  const profile = page.getByRole('region', { name: 'Your nutrition profile' })
  await expect(profile).toContainText('Fixture Member')
  await expect(profile).toContainText('80 kg')
  await expect(profile).toContainText('70 kg')
  await expect(profile).toContainText('2100 kcal')
})

test('Elite member generates and sees a saved diet plan from AI Generator', async ({ page }) => {
  await setup(page)
  await page.route('**/api/meal-plans', route => route.fulfill({ status: 201, json: { _id: 'diet-1', title: 'Personal diet plan', dailyCalories: 2100, days: [{ day: 'Monday', meals: [{ mealType: 'breakfast', name: 'Oatmeal and yogurt', calories: 400, protein: 25, carbs: 45, fat: 10 }] }] } }))
  await page.goto('/my-fitness?tab=ai-generator')
  await page.getByRole('button', { name: 'Generate diet plan', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Personal diet plan' })).toBeVisible()
  await page.getByText('Monday', { exact: true }).click()
  await expect(page.getByText('Oatmeal and yogurt', { exact: false })).toBeVisible()
})

test('Basic members see the diet upgrade gate', async ({ page }) => {
  await setup(page, 'user', 'light', 'basic')
  await page.goto('/my-fitness?tab=ai-generator')
  await expect(page.getByRole('link', { name: 'Get Pro or Elite for diet plans' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate diet plan', exact: true })).toHaveCount(0)
})

test('member can submit a gym review and see the new public rating', async ({ page }) => {
  await setup(page)
  await page.route('**/api/gyms/fixture-gym/reviews', async route => {
    if (route.request().method() === 'GET') return route.fallback()
    const body = route.request().postDataJSON()
    expect(body.rating).toBe(4)
    return route.fulfill({ status: 201, json: { review: { _id: 'review-1', ...body, authorName: user.fullName }, averageRating: 4, reviewCount: 1 } })
  })
  await page.goto('/gyms/fixture-gym')
  await page.getByRole('button', { name: '4 stars', exact: true }).click()
  await page.getByLabel('Your experience', { exact: true }).fill('Great equipment, clean rooms and friendly staff.')
  await page.getByRole('button', { name: 'Submit gym review' }).click()
  await expect(page.getByText('Your 4-star review has been saved.')).toBeVisible()
  await expect(page.getByText('Great equipment, clean rooms and friendly staff.')).toBeVisible()
})

test('gym analytics shows facility metrics without requiring trainers', async ({ page }) => {
  await setup(page, 'gym_owner')
  await page.goto('/gym-owner?tab=analytics')
  await expect(page.getByRole('heading', { name: 'Gym performance', exact: true })).toBeVisible()
  await expect(page.getByText('4.5 / 5', { exact: true })).toBeVisible()
  await expect(page.getByText('Gym reviews', { exact: true })).toBeVisible()
  await expect(page.getByText('Strength floor', { exact: false }).last()).toBeVisible()
  await expect(page.getByText('Add trainers to see analytics')).toHaveCount(0)
})

test('member has a dedicated ratings module', async ({ page }) => {
  await setup(page)
  await page.goto('/reviews')
  await expect(page.getByRole('heading', { name: 'My ratings and reviews' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'My Coach', exact: true })).toHaveAttribute('href', '/coaching/coach#reviews')
})

test('an external GIF connection failure recovers through the server fallback', async ({ page }) => {
  await page.route('https://static.exercisedb.dev/**', route => route.abort('connectionreset'))
  await page.goto('/exercises/01qpYSe')
  const preview = page.getByAltText('Upward Facing Dog — Back exercise demonstration', { exact: true })
  await expect(preview).toHaveAttribute('src', /\/api\/exercises\/01qpYSe\/preview$/, { timeout: 15000 })
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth > 0), { timeout: 15000 }).toBe(true)
})

test('chatbot retries a failed message and renders the recovered reply', async ({ page }) => {
  await setup(page)
  let attempts = 0
  await page.route('**/api/ai/chat', route => ++attempts === 1 ? route.abort('failed') : route.fulfill({ json: { reply: '## Recovery Advice\n\n1. Start slowly.\n2. Rest between sessions.' } }))
  await page.goto('/exercises')
  await page.getByRole('button', { name: 'Open AI Fitness Coach', exact: true }).click()
  await page.getByPlaceholder('Ask about fitness, nutrition...').fill('How do I recover?')
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await page.getByRole('button', { name: 'Retry last message' }).click()
  await expect(page.getByRole('heading', { name: 'Recovery Advice' })).toBeVisible()
  expect(attempts).toBe(2)
})

test('an active client can rate a trainer from the trainer profile', async ({ page }) => {
  await setup(page)
  const trainerId = '000000000000000000000003'
  await page.route('**/api/trainers/fixture-coach', route => route.fulfill({ json: { _id: trainerId, slug: 'fixture-coach', name: 'Fixture Coach', specialty: ['Strength'], country: 'Pakistan', rating: 0, bio: 'Patient and consistent coaching.', isFullyVerified: true, isActive: true } }))
  await page.route('**/api/relationships', route => route.fulfill({ json: [{ trainerId, status: 'active' }] }))
  let submitted = false
  const review = { _id: 'trainer-review', rating: 4, comment: 'Thoughtful programming and clear coaching advice.', authorName: user.fullName, createdAt: '2026-11-19T00:00:00Z' }
  await page.route(`**/api/trainers/${trainerId}/reviews`, route => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON().rating).toBe(4)
      submitted = true
      return route.fulfill({ status: 201, json: { review, averageRating: 4, reviewCount: 1 } })
    }
    return route.fulfill({ json: { reviews: submitted ? [review] : [], averageRating: submitted ? 4 : 0, reviewCount: submitted ? 1 : 0, currentUserReview: submitted ? review : null } })
  })
  await page.goto('/coaching/fixture-coach')
  await page.getByRole('button', { name: 'Rate 4 stars', exact: true }).click()
  await page.getByPlaceholder('What was coaching like?', { exact: false }).fill(review.comment)
  await page.getByRole('button', { name: 'Submit review', exact: true }).click()
  await expect(page.getByText(/You already reviewed this trainer on/)).toBeVisible()
})

for (const theme of ['light', 'dark']) test(`${theme}: workout plan dropdowns and placeholders have readable colors`, async ({ page }) => {
  await setup(page, 'trainer', theme)
  await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' })
  await page.route('**/api/relationships?status=active', route => route.fulfill({ json: [{ _id: 'relationship-1', userId: { _id: id, fullName: user.fullName, email: user.email }, status: 'active' }] }))
  await page.goto('/trainer-dashboard')
  await page.getByRole('tab', { name: 'My Clients', exact: true }).click()
  await page.getByRole('button', { name: 'Create Plan', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create Workout Plan', exact: true })
  await expect(dialog).toBeVisible()
  const dropdown = dialog.getByRole('combobox').first()
  const colors = await dropdown.evaluate(element => ({ text: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }))
  expect(colors.text).toBe(theme === 'light' ? 'rgb(20, 35, 28)' : 'rgb(244, 247, 245)')
  expect(colors.background).toBe(theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(16, 22, 18)')
  await dropdown.selectOption('advanced')
  await expect(dropdown).toHaveValue('advanced')
  const placeholderColor = await dialog.getByPlaceholder('8-Week Strength Builder').evaluate(element => getComputedStyle(element, '::placeholder').color)
  expect(placeholderColor).not.toBe(colors.background)
})

test('the public homepage renders while the session check is still pending', async ({ page }) => {
  let sessionRequested = false
  let releaseSession!: () => void
  const sessionPending = new Promise<void>(resolve => { releaseSession = resolve })
  await page.route('**/api/auth/me', async route => {
    sessionRequested = true
    await sessionPending
    await route.fulfill({ json: { user: null } })
  })
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => sessionRequested).toBe(true)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('perform.')
    await expect(page.getByRole('region', { name: 'Hero', exact: true })).toBeVisible()
  } finally {
    releaseSession()
  }
})
