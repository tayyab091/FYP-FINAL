import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

async function apiLogin(page: import('@playwright/test').Page, email: string, password: string) {
  const res = await page.request.post(`${BASE}/api/auth/login`, { data: { email, password } })
  expect(res.ok()).toBeTruthy()
}

test.describe('Plan gate verification', () => {
  test('Basic user sees gates on exercise-check and analytics', async ({ page }) => {
    await apiLogin(page, 'user2@test.com', 'User@123')
    await page.goto(`${BASE}/exercise-check`)
    await page.waitForTimeout(2000)
    await expect(page.getByTestId('subscription-gate')).toBeVisible()
    await expect(page.getByText('Start Camera')).not.toBeVisible()

    await page.goto(`${BASE}/analytics`)
    await page.waitForTimeout(2000)
    await expect(page.getByTestId('subscription-gate')).toBeVisible()
  })

  test('Elite user has no gate on live-sessions', async ({ page }) => {
    await apiLogin(page, 'user3@test.com', 'User@123')
    await page.goto(`${BASE}/live-sessions`)
    await page.waitForTimeout(2000)
    await expect(page.getByTestId('subscription-gate')).not.toBeVisible()
  })

  test('Trainer availability form renders', async ({ page }) => {
    await apiLogin(page, 'ali@test.com', 'Trainer@123')
    await page.goto(`${BASE}/trainer-dashboard`)
    await page.getByRole('tab', { name: 'Availability' }).click()
    await page.getByTestId('availability-form').waitFor({ state: 'visible' })
    await expect(page.getByTestId('availability-time-input')).toHaveCount(10)
    await expect(page.getByTestId('availability-save')).toBeVisible()
  })
})
