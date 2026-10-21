import { test, expect } from '@playwright/test'

const ADMIN = { email: 'admin@test.com', password: 'Admin@123' }

async function uiLogin(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL(/\/(admin|my-fitness|dashboard|settings)/, { timeout: 20000 })
}

async function openAdminUsersTab(page: import('@playwright/test').Page) {
  await page.goto('/admin?tab=users')
  await page.getByRole('button', { name: 'Users', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'All Users' })).toBeVisible({ timeout: 15000 })
}

async function uiLogout(page: import('@playwright/test').Page) {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL(/\/(\?.*)?$/, { timeout: 15000 })
}

test.describe('Account suspend and delete (browser UI)', () => {
  test('signup → elite → admin suspend blocks login → reactivate → delete account', async ({ page }) => {
    const ts = Date.now()
    const email = `ui-suspend-${ts}@test.com`
    const password = 'TestPass@123'
    const fullName = 'UI Suspend Test'

    // 1. Sign up via UI
    await page.goto('/signup')
    await page.getByLabel('Full Name').fill(fullName)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByLabel('Confirm Password').fill(password)
    await page.locator('#terms').check()
    await page.getByRole('button', { name: 'Create Account' }).click()
    await page.waitForURL(/\/my-fitness/, { timeout: 30000 })

    // 2. Upgrade to Elite via subscription UI
    await page.goto('/subscription')
    await page.getByRole('button', { name: 'Get Elite' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: /Confirm Payment|Continue to Stripe/ }).click()
    await expect(page.getByText(/Current plan:.*elite/i)).toBeVisible({ timeout: 15000 })

    // 3. Log out
    await uiLogout(page)

    // 4. Admin suspends the account via UI
    await uiLogin(page, ADMIN.email, ADMIN.password)
    await openAdminUsersTab(page)
    await expect(page.getByText(email)).toBeVisible({ timeout: 15000 })

    page.once('dialog', async (dialog) => {
      await dialog.accept('E2E suspension test')
    })
    const userRow = page.locator('tr', { hasText: email })
    await userRow.getByRole('button', { name: 'Suspend' }).click()
    await expect(userRow.getByText('Suspended')).toBeVisible({ timeout: 10000 })

    await uiLogout(page)

    // 5. Suspended user cannot log in via UI
    await page.goto('/login')
    await page.getByLabel('Email address').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText('Account suspended. Contact support.')).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/login/)

    // 6. Admin reactivates so user can delete account
    await uiLogin(page, ADMIN.email, ADMIN.password)
    await openAdminUsersTab(page)
    const reactivateRow = page.locator('tr', { hasText: email })
    page.once('dialog', async (dialog) => {
      await dialog.accept('E2E reactivate for deletion')
    })
    await reactivateRow.getByRole('button', { name: 'Reactivate' }).click()
    await expect(reactivateRow.getByText('Active')).toBeVisible({ timeout: 10000 })

    await uiLogout(page)

    // 7. User logs in and deletes account via Settings UI
    await uiLogin(page, email, password)
    await page.waitForURL(/\/(my-fitness|dashboard)/, { timeout: 15000 })
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByPlaceholder('Type "DELETE" to confirm').fill('DELETE')
    await page.getByRole('button', { name: 'Delete Account Permanently' }).click()
    await page.waitForURL(/\/(\?.*)?$/, { timeout: 20000 })

    // 8. Deleted account cannot log in
    await page.goto('/login')
    await page.getByLabel('Email address').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10000 })
  })
})
