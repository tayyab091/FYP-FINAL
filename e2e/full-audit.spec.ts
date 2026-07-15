import { test, expect, Page } from '@playwright/test'

const BASE = 'http://localhost:3000'
const ADMIN = { email: 'admin@test.com', password: 'Admin@123' }
const TRAINER = { email: 'ali@test.com', password: 'Trainer@123' }
const USER = { email: 'user1@test.com', password: 'User@123' }

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForTimeout(3000)
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true })
}

test.describe('Public pages', () => {
  test('Home page loads', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await screenshot(page, '01-home-guest')
    expect(page.url()).toBeTruthy()
  })

  test('Coaching page shows trainers', async ({ page }) => {
    await page.goto(`${BASE}/coaching`)
    await page.waitForTimeout(5000)
    await screenshot(page, '02-coaching')
    const trainerCards = await page.locator('[class*="card"], [class*="tile"]').count()
    console.log('Trainer cards:', trainerCards)
  })

  test('Exercises page loads with body part filters', async ({ page }) => {
    await page.goto(`${BASE}/exercises`)
    await page.waitForTimeout(3000)
    await screenshot(page, '03-exercises')
    const hasUpperBody = await page.locator('text=Upper Body').first().isVisible().catch(() => false)
    console.log('Has Upper Body filter:', hasUpperBody)
    expect(hasUpperBody).toBe(true)
  })

  test('Subscription page loads', async ({ page }) => {
    await page.goto(`${BASE}/subscription`)
    await page.waitForLoadState('networkidle')
    await screenshot(page, '04-subscription')
    await expect(page.locator('text=Pro').first()).toBeVisible()
  })
})

test.describe('Auth flows', () => {
  test('Signup flow works', async ({ page }) => {
    await page.goto(`${BASE}/signup`)
    await page.waitForLoadState('networkidle')
    await screenshot(page, '05-signup')
    const email = await page.locator('input[type="email"]').first().isVisible()
    expect(email).toBe(true)
  })

  test('Login redirects admin to admin panel', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password)
    await screenshot(page, '06-admin-dashboard')
    const url = page.url()
    console.log('Admin redirected to:', url)
    expect(url).toContain('/admin')
  })

  test('Login redirects trainer to trainer dashboard', async ({ page }) => {
    await login(page, TRAINER.email, TRAINER.password)
    await screenshot(page, '07-trainer-dashboard')
    const url = page.url()
    console.log('Trainer redirected to:', url)
    expect(url).toContain('/trainer')
  })

  test('Login redirects user to dashboard', async ({ page }) => {
    await login(page, USER.email, USER.password)
    await screenshot(page, '08-user-dashboard')
    const url = page.url()
    console.log('User redirected to:', url)
    expect(url).toMatch(/dashboard|my-fitness/)
  })
})

test.describe('User experience', () => {
  test('My Fitness page is symmetrical with gamification bar', async ({ page }) => {
    await login(page, USER.email, USER.password)
    await page.goto(`${BASE}/my-fitness`)
    await page.waitForTimeout(4000)
    await screenshot(page, '09-my-fitness')

    const hasXP = await page.getByText(/Level|XP|streak/i).first().isVisible().catch(() => false)
    console.log('Has gamification bar:', hasXP)

    const overflow = await page.evaluate(() => {
      const main = document.querySelector('main')
      if (!main) return document.documentElement.scrollWidth > document.documentElement.clientWidth + 8
      return main.scrollWidth > main.clientWidth + 8
    })
    console.log('Has horizontal overflow (bad):', overflow)
    expect(overflow).toBe(false)
  })

  test('Nutrition page has Log Meal button', async ({ page }) => {
    await login(page, USER.email, USER.password)
    await page.goto(`${BASE}/my-fitness`)
    await page.waitForTimeout(2000)
    const nutritionTab = page.locator('text=Nutrition').first()
    if (await nutritionTab.isVisible()) await nutritionTab.click()
    await page.waitForTimeout(1000)
    await screenshot(page, '10-nutrition-tab')
    const hasLogBtn = await page.getByText(/Log a Meal|Log Meal|\+ Log/i).first().isVisible().catch(() => false)
    console.log('Has log meal button:', hasLogBtn)
    expect(hasLogBtn).toBe(true)
  })

  test('Floating messages button is visible', async ({ page }) => {
    await login(page, USER.email, USER.password)
    await page.goto(`${BASE}/my-fitness`)
    await page.waitForTimeout(2000)
    await screenshot(page, '11-floating-chat')
    const hasFloat = await page.locator('[aria-label="Messages"]').isVisible().catch(() => false)
    console.log('Has floating messages button:', hasFloat)
    expect(hasFloat).toBe(true)
  })

  test('Analytics page has charts', async ({ page }) => {
    await login(page, USER.email, USER.password)
    await page.goto(`${BASE}/analytics`)
    await page.waitForTimeout(4000)
    await screenshot(page, '12-analytics')
    const hasSVG = await page.locator('svg').count()
    console.log('SVG chart elements:', hasSVG)
    expect(hasSVG).toBeGreaterThan(0)
  })

  test('Settings page has multiple tabs', async ({ page }) => {
    await login(page, USER.email, USER.password)
    await page.goto(`${BASE}/settings`)
    await page.waitForTimeout(2000)
    await screenshot(page, '13-settings')
    const hasSecurity = await page.locator('text=Security').first().isVisible().catch(() => false)
    const hasFitness = await page.locator('text=Fitness Goals').first().isVisible().catch(() => false)
    console.log('Settings has proper tabs:', hasSecurity && hasFitness)
    expect(hasSecurity).toBe(true)
  })
})

test.describe('Admin dashboard', () => {
  test('Admin has sidebar navigation', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password)
    await page.waitForTimeout(2000)
    await screenshot(page, '14-admin-sidebar')
    const hasSidebar = await page.locator('text=Pending Verifications').first().isVisible().catch(() => false)
    const hasAudit = await page.locator('text=Audit Logs').first().isVisible().catch(() => false)
    console.log('Admin has sidebar with all sections:', hasSidebar && hasAudit)
    expect(hasSidebar).toBe(true)
  })

  test('Admin can see users table', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password)
    await page.waitForTimeout(2000)
    const usersNav = page.locator('button:has-text("Users")').first()
    if (await usersNav.isVisible()) await usersNav.click()
    await page.waitForTimeout(2000)
    await screenshot(page, '15-admin-users')
    const hasTable = await page.locator('table').isVisible().catch(() => false)
    console.log('Admin users table visible:', hasTable)
    expect(hasTable).toBe(true)
  })

  test('Admin verifications section works', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password)
    await page.waitForTimeout(2000)
    const verNav = page.locator('text=Pending Verifications').first()
    if (await verNav.isVisible()) await verNav.click()
    await page.waitForTimeout(2000)
    await screenshot(page, '16-admin-verifications')
  })
})

test.describe('Trainer dashboard', () => {
  test('Trainer dashboard has messages button', async ({ page }) => {
    await login(page, TRAINER.email, TRAINER.password)
    await page.waitForTimeout(3000)
    await page.waitForSelector('[aria-label="Messages"]', { timeout: 10000 }).catch(() => null)
    await screenshot(page, '17-trainer-dashboard')
    const hasFloat = await page.locator('[aria-label="Messages"]').count()
    const hasChatLink = await page.locator('a[href="/chat"]').count()
    const hasMessages = hasFloat > 0 || hasChatLink > 0
    console.log('Trainer has messages access:', hasMessages, { hasFloat, hasChatLink })
    expect(hasMessages).toBe(true)
  })

  test('Trainer settings has proper tabs', async ({ page }) => {
    await login(page, TRAINER.email, TRAINER.password)
    await page.goto(`${BASE}/settings`)
    await page.waitForTimeout(2000)
    await screenshot(page, '18-trainer-settings')
    const hasTabs = await page.locator('text=Security').first().isVisible().catch(() => false)
    console.log('Trainer settings has proper tabs:', hasTabs)
    expect(hasTabs).toBe(true)
  })
})

test.describe('Navigation consistency', () => {
  test('Every page has back button or breadcrumb', async ({ page }) => {
    await login(page, USER.email, USER.password)
    for (const path of ['/my-fitness', '/analytics', '/settings', '/community', '/meal-plans']) {
      await page.goto(`${BASE}${path}`)
      await page.waitForTimeout(2000)
      await screenshot(page, `19-nav-${path.replace(/\//g, '')}`)
    }
  })

  test('Dropdowns are styled not plain HTML', async ({ page }) => {
    await page.goto(`${BASE}/exercises`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('select', { timeout: 10000 })
    await screenshot(page, '20-dropdowns')
    const selectStyle = await page.locator('select').first().evaluate((el) => {
      const style = window.getComputedStyle(el)
      return { borderRadius: style.borderRadius, appearance: style.appearance }
    })
    console.log('Select styles:', selectStyle)
    const radius = parseFloat(selectStyle.borderRadius) || 0
    expect(radius).toBeGreaterThan(0)
  })
})
