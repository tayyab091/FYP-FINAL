import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

async function enableLightMode(page: import('@playwright/test').Page) {
  await page.goto(BASE)
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light')
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
}

test.describe('Light mode visibility', () => {
  test('Home page has readable dark text on light background', async ({ page }) => {
    await enableLightMode(page)
    const html = page.locator('html')
    await expect(html).toHaveClass(/light/)

    const hero = page.locator('h1').first()
    await expect(hero).toBeVisible()
    const color = await hero.evaluate((el) => getComputedStyle(el).color)
    const rgb = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
    expect(luminance).toBeLessThan(0.45)

    const navBrand = page.getByText('T.E.S.T.').first()
    const navColor = await navBrand.evaluate((el) => getComputedStyle(el).color)
    const navRgb = navColor.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
    const navLuminance = (0.299 * navRgb[0] + 0.587 * navRgb[1] + 0.114 * navRgb[2]) / 255
    expect(navLuminance).toBeLessThan(0.45)
  })

  test('Coaching page readable in light mode', async ({ page }) => {
    await enableLightMode(page)
    await page.goto(`${BASE}/coaching`)
    await page.waitForLoadState('networkidle')
    const heading = page.getByRole('heading', { name: /Find Your Perfect Trainer/i })
    await expect(heading).toBeVisible()
    const color = await heading.evaluate((el) => getComputedStyle(el).color)
    const rgb = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
    expect(luminance).toBeLessThan(0.45)
  })

  test('Settings page readable in light mode after login', async ({ page }) => {
    await enableLightMode(page)
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').first().fill('user1@test.com')
    await page.locator('input[type="password"]').first().fill('User@123')
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login')),
      page.locator('button[type="submit"]').first().click(),
    ])
    await page.waitForTimeout(2000)
    await page.goto(`${BASE}/settings`)
    await page.waitForLoadState('networkidle')
    const heading = page.getByRole('heading', { name: /Settings/i }).first()
    await expect(heading).toBeVisible()
    const color = await heading.evaluate((el) => getComputedStyle(el).color)
    const rgb = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
    expect(luminance).toBeLessThan(0.45)
  })
})
