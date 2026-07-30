import { test, expect, Page, APIRequestContext } from '@playwright/test'

const BASE = 'http://localhost:3000'
const USER = { email: 'user1@test.com', password: 'User@123' }

async function loginUI(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').first().fill(USER.email)
  await page.locator('input[type="password"]').first().fill(USER.password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForTimeout(2500)
}

async function loginAPI(request: APIRequestContext) {
  const res = await request.post(`${BASE}/api/auth/login`, { data: USER })
  expect(res.status()).toBe(200)
}

async function setPlan(request: APIRequestContext, plan: 'basic' | 'pro' | 'elite') {
  const res = await request.post(`${BASE}/api/subscription`, { data: { plan } })
  expect(res.status()).toBe(200)
}

// ── PHASE 2: Exercise-check premium gate ────────────────────────────────
test.describe('Exercise-check premium gate (Basic vs Pro/Elite)', () => {
  test('Basic plan is blocked in the UI (upgrade prompt, no camera)', async ({ page, request }) => {
    test.setTimeout(90000)
    await loginAPI(request)
    await setPlan(request, 'basic')
    await loginUI(page)

    await page.goto(`${BASE}/exercise-check`)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'e2e/screenshots/30-exercise-check-basic-gated.png', fullPage: true })

    const hasUpgradePrompt = await page
      .getByText(/Pro feature|Upgrade to Pro/i)
      .first()
      .isVisible()
      .catch(() => false)
    // Scope to the actual camera-control button — the "How it works" steps
    // section always renders the phrase "Click Start Camera..." regardless
    // of gating, so a plain text search would false-positive.
    const hasStartCamera = await page
      .getByRole('button', { name: /Start Camera/i })
      .isVisible()
      .catch(() => false)

    expect(hasUpgradePrompt).toBe(true)
    expect(hasStartCamera).toBe(false)
  })

  test('Basic plan is rejected by the form-check API with a clear 403', async ({ request }) => {
    await loginAPI(request)
    await setPlan(request, 'basic')

    const res = await request.post(`${BASE}/api/gamification/form-check`, {
      data: { exercise: 'squat', reps: 5 },
    })
    expect(res.status()).toBe(403)
    const data = await res.json()
    console.log('Basic form-check rejection message:', data.message)
    expect(typeof data.message).toBe('string')
    expect(data.message.length).toBeGreaterThan(0)
  })

  test('Pro plan unlocks the exercise-check UI (camera control visible)', async ({ page, request }) => {
    test.setTimeout(90000)
    await loginAPI(request)
    await setPlan(request, 'pro')
    await loginUI(page)

    await page.goto(`${BASE}/exercise-check`)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'e2e/screenshots/31-exercise-check-pro-unlocked.png', fullPage: true })

    const hasStartCamera = await page
      .getByRole('button', { name: /Start Camera/i })
      .isVisible()
      .catch(() => false)
    const hasUpgradePrompt = await page
      .getByText(/Pro feature/i)
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasStartCamera).toBe(true)
    expect(hasUpgradePrompt).toBe(false)
  })

  test('Pro plan is accepted by the form-check API and awards XP', async ({ request }) => {
    await loginAPI(request)
    await setPlan(request, 'pro')

    const res = await request.post(`${BASE}/api/gamification/form-check`, {
      data: { exercise: 'squat', reps: 6 },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    console.log('Pro form-check XP awarded:', data.xpAwarded)
    expect(data.xpAwarded).toBeGreaterThan(0)
  })
})

// ── PHASE 3: Workout checklist persistence + single-award XP ───────────
test.describe('Workout checklist persistence & XP-once guard', () => {
  test('Checklist toggle persists across reload; Complete Workout awards XP exactly once', async ({
    page,
    request,
  }) => {
    test.setTimeout(90000)
    await loginAPI(request)
    await setPlan(request, 'pro') // any plan works for workouts; pro avoids the weekly cap

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const exerciseNames = ['Checklist Test Exercise A', 'Checklist Test Exercise B']

    // 1. Create + activate a plan with a workout scheduled for today.
    const planRes = await request.post(`${BASE}/api/tracking/plans`, {
      data: {
        title: 'Checklist Persistence Test Plan',
        goal: 'general_fitness',
        durationWeeks: 4,
        difficulty: 'beginner',
        activateNow: true,
        weeklySchedule: [
          {
            day: today,
            isRestDay: false,
            exercises: exerciseNames.map((name) => ({ name, sets: 3, reps: '10', restSeconds: 30, notes: '' })),
          },
        ],
      },
    })
    expect(planRes.status()).toBe(201)
    const plan = await planRes.json()

    // 2. Start today's workout.
    const startRes = await request.post(`${BASE}/api/tracking/logs`, {
      data: {
        planId: plan._id,
        date: new Date().toISOString(),
        exercises: exerciseNames.map((name) => ({ name, setsCompleted: 0, repsCompleted: '10' })),
      },
    })
    expect(startRes.status()).toBe(201)
    const { log } = await startRes.json()
    const logId = log._id as string

    // 3. Toggle the first exercise's checklist item on — this must persist server-side.
    const toggleRes = await request.patch(`${BASE}/api/tracking/logs/${logId}`, {
      data: { exerciseIndex: 0, completed: true },
    })
    expect(toggleRes.status()).toBe(200)

    // 4. Simulate a reload: fetch the "active" in-progress log fresh and confirm
    //    the checklist survived (this is the core BUG_REPORT.md fix).
    const activeRes = await request.get(`${BASE}/api/tracking/logs/active`)
    expect(activeRes.status()).toBe(200)
    const { log: activeLog } = await activeRes.json()
    expect(activeLog?._id).toBe(logId)
    expect(activeLog.exercises[0].completed).toBe(true)
    expect(activeLog.exercises[1].completed).toBe(false)

    // 4b. UI-level confirmation: reload /my-fitness and check the persisted checkbox is rendered checked.
    await loginUI(page)
    await page.goto(`${BASE}/my-fitness?tab=workout`)
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'e2e/screenshots/32-my-fitness-checklist-restored.png', fullPage: true })
    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    const isChecked = await firstCheckbox.isChecked().catch(() => false)
    console.log('Restored checklist checkbox checked on reload:', isChecked)
    expect(isChecked).toBe(true)

    // 5. Complete the workout (only the checked exercise, matching "Complete
    //    Workout uses persisted state").
    const gamiBefore = await (await request.get(`${BASE}/api/gamification/me`)).json()

    const completeRes = await request.put(`${BASE}/api/tracking/logs/${logId}/complete`, {
      data: { exercises: [{ name: exerciseNames[0], setsCompleted: 3, repsCompleted: '10' }] },
    })
    expect(completeRes.status()).toBe(200)
    const completeData = await completeRes.json()
    expect(completeData.xpAwarded).toBeGreaterThan(0)

    const gamiAfter = await (await request.get(`${BASE}/api/gamification/me`)).json()
    expect(gamiAfter.xp).toBe(gamiBefore.xp + completeData.xpAwarded)

    // 6. Re-completing the SAME log must be rejected and must NOT award XP again.
    const secondCompleteRes = await request.put(`${BASE}/api/tracking/logs/${logId}/complete`, {
      data: { exercises: [{ name: exerciseNames[0], setsCompleted: 3, repsCompleted: '10' }] },
    })
    expect(secondCompleteRes.status()).toBe(400)

    const gamiFinal = await (await request.get(`${BASE}/api/gamification/me`)).json()
    expect(gamiFinal.xp).toBe(gamiAfter.xp) // unchanged — XP awarded exactly once
  })

  test('Completed workout checklist is restored (checked, read-only) on revisit — not reset to empty', async ({
    page,
    request,
  }) => {
    test.setTimeout(90000)
    await loginAPI(request)
    await setPlan(request, 'pro')

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const exerciseNames = ['Revisit Test Exercise A', 'Revisit Test Exercise B']

    const planRes = await request.post(`${BASE}/api/tracking/plans`, {
      data: {
        title: 'Revisit Persistence Test Plan',
        goal: 'general_fitness',
        durationWeeks: 4,
        difficulty: 'beginner',
        activateNow: true,
        weeklySchedule: [
          {
            day: today,
            isRestDay: false,
            exercises: exerciseNames.map((name) => ({ name, sets: 3, reps: '10', restSeconds: 30, notes: '' })),
          },
        ],
      },
    })
    expect(planRes.status()).toBe(201)
    const plan = await planRes.json()

    const startRes = await request.post(`${BASE}/api/tracking/logs`, {
      data: {
        planId: plan._id,
        date: new Date().toISOString(),
        exercises: exerciseNames.map((name) => ({ name, setsCompleted: 0, repsCompleted: '10' })),
      },
    })
    expect(startRes.status()).toBe(201)
    const { log } = await startRes.json()
    const logId = log._id as string

    // Only the first exercise is checked before completing — the completed
    // log's `exercises` array should reflect exactly that, not silently
    // default every exercise's `completed` flag to false (see BUG_REPORT.md).
    const completeRes = await request.put(`${BASE}/api/tracking/logs/${logId}/complete`, {
      data: { exercises: [{ name: exerciseNames[0], setsCompleted: 3, repsCompleted: '10' }] },
    })
    expect(completeRes.status()).toBe(200)
    const completeData = await completeRes.json()
    expect(completeData.xpAwarded).toBeGreaterThan(0)
    expect(completeData.log.exercises).toHaveLength(1)
    expect(completeData.log.exercises[0].completed).toBe(true)

    // The active endpoint must surface this as `completedToday` (distinct
    // from `log`, which stays reserved for an in-progress workout).
    const activeRes = await request.get(`${BASE}/api/tracking/logs/active`)
    const activeData = await activeRes.json()
    expect(activeData.log).toBeNull()
    expect(activeData.completedToday?._id).toBe(logId)
    expect(activeData.completedToday.exercises[0].completed).toBe(true)

    // UI-level confirmation: revisiting /my-fitness after completion must
    // show the checklist as checked (read-only) instead of empty.
    await loginUI(page)
    await page.goto(`${BASE}/my-fitness?tab=workout`)
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'e2e/screenshots/33-my-fitness-completed-checklist-restored.png', fullPage: true })

    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    const secondCheckbox = page.locator('input[type="checkbox"]').nth(1)
    expect(await firstCheckbox.isChecked().catch(() => false)).toBe(true)
    expect(await secondCheckbox.isChecked().catch(() => true)).toBe(false)
    expect(await firstCheckbox.isDisabled()).toBe(true)

    const hasCompletedBanner = await page
      .getByText(/already completed/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasCompletedBanner).toBe(true)
  })

  test('Cancelling an in-progress workout marks it skipped (no orphan "active" log)', async ({ request }) => {
    await loginAPI(request)
    await setPlan(request, 'pro')

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const planRes = await request.post(`${BASE}/api/tracking/plans`, {
      data: {
        title: 'Cancel Test Plan',
        activateNow: true,
        weeklySchedule: [
          { day: today, isRestDay: false, exercises: [{ name: 'Cancel Test Exercise', sets: 3, reps: '10' }] },
        ],
      },
    })
    expect(planRes.status()).toBe(201)
    const plan = await planRes.json()

    const startRes = await request.post(`${BASE}/api/tracking/logs`, {
      data: { planId: plan._id, exercises: [{ name: 'Cancel Test Exercise', setsCompleted: 0 }] },
    })
    expect(startRes.status()).toBe(201)
    const { log } = await startRes.json()

    const cancelRes = await request.patch(`${BASE}/api/tracking/logs/${log._id}`, {
      data: { status: 'skipped' },
    })
    expect(cancelRes.status()).toBe(200)

    const activeRes = await request.get(`${BASE}/api/tracking/logs/active`)
    const { log: activeLog } = await activeRes.json()
    expect(activeLog?._id).not.toBe(log._id)
  })
})
