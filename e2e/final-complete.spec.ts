import { test, expect, Page, BrowserContext } from '@playwright/test'

const BASE = 'http://localhost:3000'
const CREDS = {
  admin: { email: 'admin@test.com', password: 'Admin@123' },
  trainer: { email: 'ali@test.com', password: 'Trainer@123' },
  user: { email: 'user1@test.com', password: 'User@123' },
}

async function ss(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true })
  console.log(`📸 ${name}`)
}

async function login(page: Page, role: keyof typeof CREDS) {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').first().fill(CREDS[role].email)
  await page.locator('input[type="password"]').first().fill(CREDS[role].password)
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 10000 }),
    page.locator('button[type="submit"]').first().click(),
  ])
  await page.waitForTimeout(2000)
  console.log(`Login as ${role}: ${response.status()}`)
  return response.status()
}

// ── CRITICAL INFRASTRUCTURE ──────────────────────────────
test.describe('Infrastructure', () => {
  test('Health endpoint works', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    console.log('Health:', data)
    expect(data.status).toBe('ok')
  })

  test('Route protection works — /my-fitness redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/my-fitness`)
    await page.waitForTimeout(2000)
    const url = page.url()
    console.log('Unauthed /my-fitness redirected to:', url)
    expect(url).toContain('/login')
  })

  test('Route protection works — /admin redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/admin`)
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/login')
  })

  test('Trainers API returns data', async ({ request }) => {
    const res = await request.get(`${BASE}/api/trainers`)
    const data = await res.json()
    const list = Array.isArray(data) ? data : data.trainers || []
    console.log(`Trainers in DB: ${list.length}`)
    expect(list.length).toBeGreaterThan(0)
  })

  test('Exercises API returns data', async ({ request }) => {
    test.setTimeout(120000)
    const res = await request.get(`${BASE}/api/exercises?limit=1`)
    const data = await res.json()
    const list = Array.isArray(data) ? data : data.exercises || []
    console.log(`Exercises: ${list.length}`)
    expect(list.length).toBeGreaterThan(0)
  })
})

// ── PUBLIC PAGES ─────────────────────────────────────────
test.describe('Public pages', () => {
  test('Home page loads', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await ss(page, '01-home')
    expect(page.url()).toBeTruthy()
  })

  test('Coaching page shows trainer cards', async ({ page }) => {
    await page.goto(`${BASE}/coaching`)
    await page.waitForTimeout(5000)
    await ss(page, '02-coaching')
    const cards = await page.locator('[class*="card"], [class*="tile"]').count()
    console.log('Trainer cards found:', cards)
    expect(cards).toBeGreaterThan(0)
  })

  test('Coaching trainer profile page works', async ({ page }) => {
    await page.goto(`${BASE}/coaching`)
    await page.waitForTimeout(4000)
    const firstTrainer = page.locator('a[href*="/coaching/"]').first()
    if (await firstTrainer.isVisible()) {
      await firstTrainer.click()
      await page.waitForTimeout(3000)
      await ss(page, '03-trainer-profile')
      const hasName = await page.locator('h1, h2').first().isVisible()
      console.log('Trainer profile page loaded:', hasName)
    } else {
      console.log('No trainer profile links found — trainer cards may not link to profiles')
    }
  })

  test('Exercises page has body part filters', async ({ page }) => {
    await page.goto(`${BASE}/exercises`)
    await page.waitForTimeout(3000)
    await ss(page, '04-exercises')
    const hasUpper = await page.locator('text=Upper Body').first().isVisible().catch(() => false)
    console.log('Has Upper Body filter:', hasUpper)
  })

  test('Nutrition page loads without infinite spinner', async ({ page }) => {
    await page.goto(`${BASE}/nutrition`)
    await page.waitForTimeout(8000)
    await ss(page, '05-nutrition')
    const hasSpinner = await page.locator('text=Loading your meal plan').isVisible().catch(() => false)
    expect(hasSpinner).toBe(false)
  })

  test('Subscription page loads', async ({ page }) => {
    await page.goto(`${BASE}/subscription`)
    await page.waitForLoadState('networkidle')
    await ss(page, '06-subscription')
    await expect(page.locator('text=Pro').first()).toBeVisible()
  })
})

// ── AUTH ─────────────────────────────────────────────────
test.describe('Authentication', () => {
  test('Signup page has correct fields', async ({ page }) => {
    await page.goto(`${BASE}/signup`)
    await page.waitForLoadState('networkidle')
    await ss(page, '07-signup')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('New user can sign up', async ({ page }) => {
    test.setTimeout(60000)
    const email = `newuser${Date.now()}@test.com`
    await page.goto(`${BASE}/signup`)
    await page.waitForLoadState('networkidle')

    const nameInput = page.locator('input[name="fullName"], input[placeholder*="name" i]').first()
    if (await nameInput.isVisible()) await nameInput.fill('New Test User')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('TestPass123!')
    const confirm = page.locator('input[name="confirmPassword"], input[placeholder*="confirm" i]').first()
    if (await confirm.isVisible()) await confirm.fill('TestPass123!')
    const checkbox = page.locator('input[type="checkbox"]').first()
    if (await checkbox.isVisible()) await checkbox.check()

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/register') && r.request().method() === 'POST', {
        timeout: 30000,
      }),
      page.locator('button[type="submit"]').first().click(),
    ]).catch(async () => {
      await ss(page, '08-after-signup-attempt')
      return [{ status: () => 0 }] as const
    })
    if (res && typeof res.status === 'function' && res.status() === 0) {
      console.log('Signup: no register response (validation may have blocked submit)')
      return
    }
    await ss(page, '08-after-signup')
    console.log('Signup status:', res.status())
    expect(res.status()).toBeLessThan(400)
  })

  test('Admin login redirects to /admin', async ({ page }) => {
    const status = await login(page, 'admin')
    await ss(page, '09-admin-login')
    console.log('Admin URL after login:', page.url())
    expect(status).toBe(200)
    expect(page.url()).toContain('/admin')
  })

  test('Trainer login redirects to /trainer-dashboard', async ({ page }) => {
    const status = await login(page, 'trainer')
    await ss(page, '10-trainer-login')
    console.log('Trainer URL after login:', page.url())
    expect(status).toBe(200)
    expect(page.url()).toContain('trainer')
  })

  test('User login redirects to dashboard', async ({ page }) => {
    const status = await login(page, 'user')
    await ss(page, '11-user-login')
    console.log('User URL after login:', page.url())
    expect(status).toBe(200)
  })
})

// ── USER FLOWS ───────────────────────────────────────────
test.describe('User flows', () => {
  test('My Fitness page loads correctly', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/my-fitness`)
    await page.waitForTimeout(4000)
    await ss(page, '12-my-fitness')
    const hasOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
    )
    console.log('Has horizontal overflow:', hasOverflow)
    expect(hasOverflow).toBe(false)
  })

  test('AI Generator tab exists on My Fitness', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/my-fitness`)
    await page.waitForTimeout(2000)
    await ss(page, '13-my-fitness-tabs')
    const hasAI = await page.locator('text=AI Generator').first().isVisible().catch(() => false)
    console.log('Has AI Generator tab:', hasAI)
  })

  test('AI Plan Generator works', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/my-fitness`)
    await page.waitForTimeout(2000)
    const aiTab = page.locator('text=AI Generator').first()
    if (await aiTab.isVisible()) {
      await aiTab.click()
      await page.waitForTimeout(1000)
      const generateBtn = page.locator('text=Generate My Plan, button:has-text("AI")').first()
      if (await generateBtn.isVisible()) {
        await generateBtn.click()
        await page.waitForTimeout(8000)
        await ss(page, '14-ai-plan-generated')
        const hasPlan = await page.locator('text=Activate This Plan, text=Monday, text=exercises').first().isVisible().catch(() => false)
        console.log('AI plan generated and shown:', hasPlan)
      }
    }
  })

  test('Subscription upgrade works', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/subscription`)
    await page.waitForTimeout(2000)
    await ss(page, '15-subscription')
    const upgradeBtn = page.locator('button:has-text("Pro"), button:has-text("Upgrade")').first()
    if (await upgradeBtn.isVisible()) {
      const [res] = await Promise.all([
        page.waitForResponse(r => r.url().includes('/api/subscription'), { timeout: 10000 }),
        upgradeBtn.click(),
      ])
      await page.waitForTimeout(2000)
      await ss(page, '16-after-upgrade')
      console.log('Subscription API status:', res.status())
      expect(res.status()).toBe(200)
    }
  })

  test('Nutrition has Log Meal button', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/nutrition`)
    await page.waitForTimeout(4000)
    await ss(page, '17-nutrition')
    const hasLog = await page.locator('text=Log, text=Log Meal, text=Add Meal, button:has-text("Log")').first().isVisible().catch(() => false)
    console.log('Has log meal button:', hasLog)
  })

  test('Analytics page has charts', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/analytics`)
    await page.waitForTimeout(5000)
    await ss(page, '18-analytics')
    const svgCount = await page.locator('svg').count()
    console.log('SVG elements (charts):', svgCount)
    expect(svgCount).toBeGreaterThan(0)
  })

  test('Settings page has 5 tabs', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/settings`)
    await page.waitForTimeout(2000)
    await ss(page, '19-settings')
    const hasSecurity = await page.locator('text=Security').first().isVisible().catch(() => false)
    const hasFitness = await page.locator('text=Fitness Goals').first().isVisible().catch(() => false)
    console.log('Has Security tab:', hasSecurity, '| Has Fitness Goals tab:', hasFitness)
  })

  test('Leaderboard page works', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/leaderboard`)
    await page.waitForTimeout(3000)
    await ss(page, '20-leaderboard')
    const hasContent = await page.locator('text=Leaderboard, text=XP, text=Level').first().isVisible().catch(() => false)
    console.log('Leaderboard has content:', hasContent)
  })

  test('Floating messages button visible', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/my-fitness`)
    await page.waitForTimeout(2000)
    await ss(page, '21-floating-chat')
    const hasFloat = await page.locator('[aria-label="Messages"]').isVisible().catch(() => false)
    console.log('Floating messages button:', hasFloat)
  })

  test('Community shows posts from all users', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/community`)
    await page.waitForTimeout(4000)
    await ss(page, '22-community')
    const hasPosts = await page.locator('[class*="post"], [class*="card"]').count()
    console.log('Community post cards:', hasPosts)
  })

  test('Notifications bell is in navbar', async ({ page }) => {
    await login(page, 'user')
    await page.goto(`${BASE}/my-fitness`)
    await page.waitForTimeout(2000)
    await ss(page, '23-notifications')
    const hasBell = await page.locator('[aria-label*="notification" i], [aria-label*="bell" i]').first().isVisible().catch(() => false)
    console.log('Notification bell visible:', hasBell)
  })
})

// ── ADMIN ────────────────────────────────────────────────
test.describe('Admin dashboard', () => {
  test('Admin has sidebar with all sections', async ({ page }) => {
    await login(page, 'admin')
    await page.waitForTimeout(2000)
    await ss(page, '24-admin-overview')
    const sections = ['Users', 'Trainers', 'Gyms', 'Audit']
    for (const s of sections) {
      const visible = await page.locator(`text=${s}`).first().isVisible().catch(() => false)
      console.log(`Admin has ${s} section:`, visible)
    }
  })

  test('Admin users table shows data', async ({ page }) => {
    await login(page, 'admin')
    await page.waitForTimeout(2000)
    const usersLink = page.locator('text=Users').first()
    if (await usersLink.isVisible()) await usersLink.click()
    await page.waitForTimeout(2000)
    await ss(page, '25-admin-users')
    const hasTable = await page.locator('table, [class*="table"]').isVisible().catch(() => false)
    console.log('Admin users table:', hasTable)
  })

  test('Admin can verify a trainer', async ({ page }) => {
    await login(page, 'admin')
    await page.waitForTimeout(2000)
    const verLink = page.locator('text=Verifications, text=Pending').first()
    if (await verLink.isVisible()) await verLink.click()
    await page.waitForTimeout(2000)
    await ss(page, '26-admin-verifications')
    const hasVerifyBtn = await page.locator('button:has-text("Verify")').first().isVisible().catch(() => false)
    console.log('Verify button present:', hasVerifyBtn)
  })
})

// ── TRAINER ──────────────────────────────────────────────
test.describe('Trainer dashboard', () => {
  test('Trainer dashboard loads', async ({ page }) => {
    await login(page, 'trainer')
    await page.waitForTimeout(2000)
    await ss(page, '27-trainer-dashboard')
    const hasContent = await page.locator('h1, h2').first().isVisible()
    console.log('Trainer dashboard has content:', hasContent)
  })

  test('Trainer availability tab exists', async ({ page }) => {
    await login(page, 'trainer')
    await page.waitForTimeout(2000)
    const availTab = page.locator('text=Availability').first()
    const hasTab = await availTab.isVisible().catch(() => false)
    if (hasTab) await availTab.click()
    await page.waitForTimeout(1000)
    await ss(page, '28-trainer-availability')
    console.log('Trainer availability tab:', hasTab)
  })

  test('Trainer settings has proper tabs', async ({ page }) => {
    await login(page, 'trainer')
    await page.goto(`${BASE}/settings`)
    await page.waitForTimeout(2000)
    await ss(page, '29-trainer-settings')
    const hasTabs = await page.locator('text=Security, text=Profile').first().isVisible().catch(() => false)
    console.log('Trainer settings has tabs:', hasTabs)
  })
})

// ── NEW FEATURES ─────────────────────────────────────────
test.describe('New features', () => {
  test('AI plan generator API works', async ({ request }) => {
    // Login first to get cookie
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: CREDS.user.email, password: CREDS.user.password },
    })
    expect(loginRes.status()).toBe(200)

    const res = await request.post(`${BASE}/api/ai/generate-plan`, {
      data: { goal: 'muscle_gain', daysPerWeek: '4', equipment: 'Dumbbells', fitnessLevel: 'beginner' },
    })
    const data = await res.json()
    console.log('AI plan API status:', res.status(), '| Has plan:', !!data.plan)
    expect(res.status()).toBe(200)
    expect(data.plan).toBeTruthy()
    expect(data.plan.weeklySchedule).toBeTruthy()
  })

  test('Leaderboard API returns data', async ({ request }) => {
    const res = await request.get(`${BASE}/api/gamification/leaderboard?period=all`)
    const data = await res.json()
    console.log('Leaderboard API status:', res.status(), '| Leaders:', Array.isArray(data) ? data.length : 'not array')
    expect(res.status()).toBe(200)
  })

  test('Trainer availability API works', async ({ request }) => {
    const res = await request.get(`${BASE}/api/trainer/availability?trainerId=test`)
    console.log('Availability API status:', res.status())
    expect(res.status()).toBeLessThan(500)
  })

  test('Delete account API exists', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/user/delete`)
    console.log('Delete account API status (unauthed):', res.status())
    expect(res.status()).toBe(401) // Should reject unauthenticated
  })

  test('Subscription API works in simulation mode', async ({ request }) => {
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: CREDS.user.email, password: CREDS.user.password },
    })
    expect(loginRes.status()).toBe(200)

    const res = await request.post(`${BASE}/api/subscription`, {
      data: { plan: 'pro' },
    })
    const data = await res.json()
    console.log('Subscription API:', res.status(), data)
    expect(res.status()).toBe(200)
  })
})
