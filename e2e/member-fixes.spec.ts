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
  await page.getByRole('button', { name: 'Rate 4 stars', exact: true }).click()
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
  await expect(page.getByRole('heading', { name: 'My Coach', exact: true })).toBeVisible()
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

test('member catalog browsing retains the member workspace', async ({ page }) => {
  await setup(page)
  for (const path of ['/exercises', '/nutrition', '/gyms']) {
    await page.goto(path)
    await expect(page.locator('header')).toHaveCount(1)
    await expect(page.locator('header').getByRole('link', { name: 'Back to site' })).toBeVisible()
    await expect(page.locator('footer')).toHaveCount(0)
    expect(new URL(page.url()).pathname).toBe(path)
  }
})

test('leaderboard uses a single header and fits a narrow screen', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/gamification/leaderboard?*', route => route.fulfill({ json: { leaders: [{ _id: id, userId: id, fullName: 'A member with a very long display name', xp: 1234567, level: 12, streak: 30 }] } }))
  await page.goto('/leaderboard')
  await expect(page.getByRole('heading', { name: /Leaderboard/ }).last()).toBeVisible()
  await expect(page.locator('header')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('empty analytics stays on its own charts page', async ({ page }) => {
  await setup(page)
  await page.goto('/analytics')
  await expect(page.getByText('Total Workouts', { exact: true })).toBeVisible()
  await expect(page.getByText('Average Macro Split', { exact: true })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/analytics')
})

test('trainer meal plans offer client management', async ({ page }) => {
  await setup(page, 'trainer')
  await page.goto('/meal-plans')
  await expect(page.getByRole('link', { name: 'Manage client plans' })).toBeVisible()
  await expect(page.getByText(/Ask your trainer/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Self-generate' })).toBeHidden()
})

test('member reviews submit in place with anonymous posting', async ({ page }) => {
  await setup(page)
  let saved = false
  await page.route('**/api/user/reviews', route => route.fulfill({ json: {
    targets: [{ id: 'coach', type: 'Trainer', name: 'Connected Coach', endpoint: '/api/trainers/coach/reviews', reviewed: saved }],
    reviews: saved ? [{ id: 'review', type: 'Trainer', name: 'Connected Coach', rating: 5, comment: 'Very helpful and consistent coaching.', anonymous: true }] : [],
  } }))
  await page.route('**/api/trainers/coach/reviews', route => {
    expect(route.request().postDataJSON().anonymous).toBe(true)
    saved = true
    return route.fulfill({ status: 201, json: { review: {} } })
  })
  await page.goto('/reviews')
  await page.getByLabel('Your experience').fill('Very helpful and consistent coaching.')
  await page.getByLabel('Post anonymously (hide my name and photo)').check()
  await page.getByRole('button', { name: 'Submit review', exact: true }).click()
  await expect(page.getByText('Trainer · Posted anonymously')).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/reviews')
})

for (const role of ['admin', 'gym_owner']) test(role + ' dashboard keeps its own workspace', async ({ page }) => {
  await setup(page, role)
  const path = role === 'admin' ? '/admin' : '/gym-owner'
  await page.goto(path)
  await expect(page.locator('header')).toHaveCount(1)
  await expect(page.locator('header').getByRole('link', { name: 'Back to site' })).toBeVisible()
  await expect(page.locator('footer')).toHaveCount(0)
  expect(new URL(page.url()).pathname).toBe(path)
})

function activityGame(xp: number) {
  return { xp, level: 1, levelTitle: 'Fitness Rookie', streak: 0, achievements: [], formCheckerSessions: 0, streakBonusXp: 0,
    progressToNextLevel: { current: xp, required: 100, percent: xp, xpRemaining: 100 - xp } }
}

test('short review submits with the redesigned selectable stars', async ({ page }) => {
  await setup(page)
  let saved = false
  await page.route('**/api/user/reviews', route => route.fulfill({ json: {
    targets: [{ id: 'coach', name: 'Connected Coach', type: 'Trainer', endpoint: '/api/trainers/coach/reviews', reviewed: saved }],
    reviews: saved ? [{ id: 'one', type: 'Trainer', name: 'Connected Coach', rating: 4, comment: 'Good' }] : [],
  } }))
  await page.route('**/api/trainers/coach/reviews', route => {
    expect(route.request().postDataJSON()).toMatchObject({ rating: 4, comment: 'Good' })
    saved = true
    return route.fulfill({ status: 201, json: { review: { rating: 4 } } })
  })
  await page.goto('/reviews')
  await page.getByRole('button', { name: 'Rate 4 stars', exact: true }).click()
  await page.getByLabel('Your experience').fill('Good')
  await page.getByRole('button', { name: 'Submit review', exact: true }).click()
  await expect(page.getByText('Your review has been saved', { exact: true })).toBeVisible()
  await expect(page.getByText('4/5 stars', { exact: true })).toBeVisible()
})

test('workout completion updates checklist history and XP without reloading', async ({ page }) => {
  await setup(page)
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const plan = { _id: 'plan-one', title: 'My strength plan', status: 'active', weeklySchedule: [{ day, isRestDay: false, exercises: [{ name: 'Squat', sets: 3, reps: '10' }] }] }
  await page.route('**/api/tracking/plans/my-plan', route => route.fulfill({ json: plan }))
  await page.route('**/api/gamification/me', route => route.fulfill({ json: activityGame(10) }))
  await page.route('**/api/tracking/logs', route => route.fulfill({ status: 201, json: { log: { _id: 'workout-one', status: 'in_progress' } } }))
  await page.route('**/api/tracking/logs/workout-one', route => route.fulfill({ json: { success: true } }))
  let completions = 0
  await page.route('**/api/tracking/logs/workout-one/complete', route => {
    completions++
    return route.fulfill({ json: {
      log: { _id: 'workout-one', status: 'completed', date: new Date().toISOString(), exercises: [{ name: 'Squat', completed: true }] },
      xpAwarded: 50, gamification: activityGame(60),
    } })
  })
  await page.goto('/my-fitness')
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Squat' }).check()
  await page.getByRole('button', { name: 'Complete Workout', exact: true }).click()
  await expect(page.getByText('60 XP', { exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Squat' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Squat' })).toBeDisabled()
  expect(completions).toBe(1)
})

test('meal logging immediately refreshes XP and calorie totals', async ({ page }) => {
  await setup(page)
  await page.route('**/api/gamification/me', route => route.fulfill({ json: activityGame(10) }))
  await page.route('**/api/nutrition/analyze?*', route => route.fulfill({ json: { results: [{ name: 'Rice', calories: 130, protein: 3, carbs: 28, fat: 0, per: '100g' }] } }))
  await page.route('**/api/tracking/meal-logs/today', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } } })
    expect(route.request().postDataJSON().requestKey).toBeTruthy()
    return route.fulfill({ status: 201, json: { _id: 'meal-one', mealType: 'breakfast', foods: [{ name: 'Rice', calories: 260 }], totalCalories: 260, totalProtein: 6, totalCarbs: 56, totalFat: 0, gamification: activityGame(25), xpAwarded: 15 } })
  })
  await page.goto('/my-fitness?tab=nutrition')
  await page.getByRole('button', { name: '+ Log a Meal', exact: true }).click()
  await page.getByPlaceholder('Search chicken, daal, roti...').fill('rice')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('button', { name: /Rice.*130 kcal/ }).click()
  await page.getByLabel('Quantity (g)').fill('200')
  await expect(page.getByText('260 kcal for 200 g', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Log Rice', exact: true }).click()
  await expect(page.getByText('25 XP', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Log a Meal', exact: true })).toHaveCount(0)
})

test('new notifications pop up through polling without navigation', async ({ page }) => {
  await setup(page)
  let arrived = false
  const notification = { _id: 'new-notification', title: 'Trainer approved', message: 'Your connection is ready.', type: 'trainer', isRead: false, link: '/chat', createdAt: new Date().toISOString() }
  await page.route('**/api/notifications?*', route => route.fulfill({ json: { notifications: arrived ? [notification] : [], unreadCount: arrived ? 1 : 0 } }))
  await page.goto('/reviews')
  await page.getByRole('button', { name: 'Notifications', exact: true }).click()
  await page.getByRole('button', { name: 'Sound on', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sound off', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('Escape')
  arrived = true
  await expect(page.getByText('Trainer approved', { exact: true })).toBeVisible({ timeout: 15000 })
  expect(new URL(page.url()).pathname).toBe('/reviews')
})

test('new conversations appear without reloading the message list', async ({ page }) => {
  await setup(page)
  let arrived = false
  await page.route('**/api/chat/conversations', route => route.fulfill({ json: arrived ? [{
    _id: 'conversation-one', otherUser: { fullName: 'New Connected Coach' }, lastMessage: 'Ready to train?', unreadCount: 1,
  }] : [] }))
  await page.goto('/chat')
  await expect(page.getByText('No conversations yet', { exact: true })).toBeVisible()
  arrived = true
  await expect(page.getByText('New Connected Coach', { exact: true })).toBeVisible({ timeout: 15000 })
})

test('trainer radius filter sends location to the project API', async ({ page, context }) => {
  await setup(page)
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 31.52, longitude: 74.35 })
  let requestedRadius = ''
  await page.route('**/api/trainers?*', route => {
    const params = new URL(route.request().url()).searchParams
    requestedRadius = params.get('radius') || ''
    return route.fulfill({ json: { trainers: [], meta: { source: 'database', connectable: true } } })
  })
  await page.goto('/coaching')
  await page.getByRole('button', { name: 'Near me', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Clear location filter', exact: true })).toBeVisible()
  await page.getByLabel('Trainer distance radius').selectOption('5')
  await expect.poll(() => requestedRadius).toBe('5')
})

test('subscription cancellation keeps paid access and offers resumption', async ({ page }) => {
  await setup(page)
  let canceled = false
  await page.route('**/api/subscription', route => {
    if (route.request().method() === 'PATCH') {
      expect(route.request().postDataJSON().action).toBe('cancel')
      canceled = true
      return route.fulfill({ json: { success: true, message: 'Cancellation scheduled. Access continues until the paid term ends.' } })
    }
    return route.fulfill({ json: { recurring: true, stripeEnabled: true, subscription: { plan: 'elite', endDate: '2026-12-20', cancelAtPeriodEnd: canceled } } })
  })
  await page.goto('/subscription')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Cancel renewal', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Keep subscription', exact: true })).toBeVisible()
})

test('progress graph and history use the same five newest records', async ({ page }) => {
  await setup(page)
  const progress = [3, 1, 6, 4, 2, 5].map(day => ({
    _id: String(day), date: '2026-07-' + String(day).padStart(2, '0') + 'T12:00:00Z',
    weight: 80 + day, bodyFat: 20 + day,
  }))
  await page.route('**/api/tracking/progress', route => route.fulfill({ json: progress }))
  await page.goto('/my-fitness?tab=progress')
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(5)
  await expect(rows.first()).toContainText('Jul 6, 2026')
  await expect(rows.last()).toContainText('Jul 2, 2026')
  await expect(page.getByText('Jul 1, 2026', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Weight (kg)', { exact: true })).toBeVisible()
  await expect(page.getByText('Body fat (%)', { exact: true })).toBeVisible()
})

test('no workout plan leads to connected trainers and their existing chats', async ({ page }) => {
  await setup(page)
  await page.route('**/api/relationships?status=active', route => route.fulfill({ json: [{
    _id: 'connection-one', canChat: true, conversationId: 'conversation-one',
    trainerId: { _id: 'coach-one', name: 'My Connected Coach', specialty: ['Strength'] },
  }] }))
  await page.goto('/my-fitness')
  await page.getByRole('link', { name: 'Ask my trainers', exact: true }).click()
  await expect(page).toHaveURL(new RegExp('/my-trainers$'), { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'My trainers', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'My Connected Coach', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ask about a plan', exact: true })).toHaveAttribute('href', '/chat/conversation-one')
  expect(new URL(page.url()).pathname).toBe('/my-trainers')
})

test('my trainers explains when no active trainer is connected', async ({ page }) => {
  await setup(page)
  await page.route('**/api/relationships?status=active', route => route.fulfill({ json: [] }))
  await page.goto('/my-trainers')
  await expect(page.getByText("You don't have any active trainer connections yet.", { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Find a trainer to connect with', exact: true })).toHaveAttribute('href', '/coaching')
})
