import { test, expect, Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ADMIN = { email: 'admin@test.com', password: 'Admin@123' }
const INITIAL_PASSWORD = 'TrainerUI@123'
const NEW_PASSWORD = 'TrainerNew@456'

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail: string }

const results: StepResult[] = []

function record(step: string, status: 'PASS' | 'FAIL', detail: string) {
  results.push({ step, status, detail })
  console.log(`[${status}] ${step}: ${detail}`)
}

async function screenshot(page: Page, name: string) {
  const dir = path.join('e2e', 'screenshots', 'trainer-ui-audit')
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true })
}

async function login(page: Page, email: string, password: string, expectSuccess = true) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForTimeout(2500)
  if (expectSuccess) {
    await expect(page).not.toHaveURL(/\/login/)
  }
}

async function openSettingsTab(page: Page, tabLabel: string) {
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')
  await page.locator('.flex-shrink-0').getByRole('button', { name: tabLabel, exact: true }).click()
  await page.waitForTimeout(500)
}

test.describe.configure({ mode: 'serial' })

test('Trainer settings full UI audit', async ({ page }) => {
  const email = `trainer-ui-${Date.now()}@test.com`
  const fullName = 'UI Test Trainer'
  const updatedName = 'UI Trainer Updated'

  test.setTimeout(300000)

  // ── Register new trainer via UI ──
  try {
    await page.goto('/register-trainer')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('Ali Hassan').fill(fullName)
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.locator('input[placeholder="Min. 8 characters"]').fill(INITIAL_PASSWORD)
    await page.getByPlaceholder('Repeat password').fill(INITIAL_PASSWORD)
    await page.getByRole('button', { name: 'HIIT' }).click()
    await page.getByPlaceholder(/Tell clients about/).fill('Playwright UI audit trainer bio for automated testing.')
    await page.locator('select').filter({ has: page.locator('option[value="3-5 years"]') }).selectOption('3-5 years')
    await page.getByRole('button', { name: 'Register as Trainer' }).click()
    await page.waitForURL(/trainer-dashboard/, { timeout: 45000 })
    await screenshot(page, '01-registered')
    record('Create trainer account (UI)', 'PASS', `Registered ${email}`)
  } catch (e) {
    record('Create trainer account (UI)', 'FAIL', String(e))
    throw e
  }

  // ── 1. Availability save & reload ──
  try {
    await page.getByRole('tab', { name: 'Availability' }).click()
    await page.waitForTimeout(1500)
    const mondayRow = page.locator('span', { hasText: /^Monday$/ }).locator('xpath=ancestor::div[contains(@class,"border-b")]')
    await mondayRow.locator('input[type="time"]').first().fill('10:30')
    await page.getByRole('button', { name: 'Save Availability' }).click()
    await expect(page.getByText('Availability saved!')).toBeVisible({ timeout: 10000 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: 'Availability' }).click()
    await page.waitForTimeout(1500)
    const startVal = await mondayRow.locator('input[type="time"]').first().inputValue()
    expect(startVal).toBe('10:30')
    await screenshot(page, '02-availability')
    record('Availability save & show', 'PASS', `Monday start persisted as ${startVal}`)
  } catch (e) {
    await screenshot(page, '02-availability-FAIL')
    record('Availability save & show', 'FAIL', String(e))
  }

  // ── 3a. Profile Information ──
  try {
    await openSettingsTab(page, '👤 Profile')
    const nameInput = page.locator('label:has-text("Full Name") + input, label:has-text("Full Name") ~ input').first()
    await nameInput.fill(updatedName)
    await page.locator('textarea').first().fill('Updated profile bio from UI test.')
    await page.getByRole('button', { name: 'Save Profile' }).click()
    await expect(page.getByText('Profile updated successfully!')).toBeVisible({ timeout: 10000 })
    await page.reload()
    await openSettingsTab(page, '👤 Profile')
    await expect(nameInput).toHaveValue(updatedName)
    await screenshot(page, '03-profile')
    record('Profile Information save', 'PASS', `Name persisted: ${updatedName}`)
  } catch (e) {
    await screenshot(page, '03-profile-FAIL')
    record('Profile Information save', 'FAIL', String(e))
  }

  // ── 3b. Coach Profile ──
  try {
    await openSettingsTab(page, '🏋️ Coach Profile')
    const specialty = page.getByLabel(/Specialty/i).or(page.locator('input').first())
    await specialty.fill('HIIT, Strength Training')
    await page.getByRole('button', { name: 'Save Coach Profile' }).click()
    await expect(page.getByText('Trainer profile updated!')).toBeVisible({ timeout: 10000 })
    await page.reload()
    await openSettingsTab(page, '🏋️ Coach Profile')
    await expect(page.locator('input').first()).toHaveValue('HIIT, Strength Training')
    await screenshot(page, '04-coach-profile')
    record('Coach Profile save', 'PASS', 'Specialty persisted')
  } catch (e) {
    await screenshot(page, '04-coach-profile-FAIL')
    record('Coach Profile save', 'FAIL', String(e))
  }

  // ── 3c. Fitness Goals ──
  try {
    await openSettingsTab(page, '🎯 Fitness Goals')
    await page.locator('input[type="number"]').first().fill('75')
    await page.locator('input[type="number"]').nth(1).fill('70')
    await page.getByRole('button', { name: 'Save Goals' }).click()
    await expect(page.getByText('Profile updated successfully!')).toBeVisible({ timeout: 10000 })
    await page.reload()
    await openSettingsTab(page, '🎯 Fitness Goals')
    await expect(page.locator('input[type="number"]').first()).toHaveValue('75')
    await screenshot(page, '05-fitness-goals')
    record('Fitness Goals save', 'PASS', 'Weights persisted (75 / 70 kg)')
  } catch (e) {
    await screenshot(page, '05-fitness-goals-FAIL')
    record('Fitness Goals save', 'FAIL', String(e))
  }

  // ── 4. Notification Preferences ──
  try {
    await openSettingsTab(page, '🔔 Notifications')
    const firstToggle = page.getByRole('switch').first()
    const before = await firstToggle.getAttribute('aria-checked')
    await firstToggle.click()
    await page.getByRole('button', { name: 'Save Preferences' }).click()
    await expect(page.getByText('Notification preferences saved')).toBeVisible({ timeout: 10000 })
    await page.reload()
    await openSettingsTab(page, '🔔 Notifications')
    const after = await page.getByRole('switch').first().getAttribute('aria-checked')
    expect(after).not.toBe(before)
    await screenshot(page, '06-notifications')
    record('Notification Preferences', 'PASS', `Toggle changed ${before} → ${after} and persisted`)
  } catch (e) {
    await screenshot(page, '06-notifications-FAIL')
    record('Notification Preferences', 'FAIL', String(e))
  }

  // ── 5. Password change ──
  try {
    await openSettingsTab(page, '🔒 Security')
    await page.locator('input[type="password"]').nth(0).fill(INITIAL_PASSWORD)
    await page.locator('input[type="password"]').nth(1).fill(NEW_PASSWORD)
    await page.locator('input[type="password"]').nth(2).fill(NEW_PASSWORD)
    await page.getByRole('button', { name: 'Change Password' }).click()
    await expect(page.getByText('Password changed successfully!')).toBeVisible({ timeout: 10000 })
    await page.waitForURL(/\/(login)?$/, { timeout: 15000 })
    await login(page, email, NEW_PASSWORD)
    await screenshot(page, '07-password-changed')
    record('Password change (Security)', 'PASS', 'Logged in with new password after change')
  } catch (e) {
    await screenshot(page, '07-password-FAIL')
    record('Password change (Security)', 'FAIL', String(e))
  }

  // ── 2. Account suspension (admin UI) ──
  try {
    await page.getByRole('button', { name: /Sign out/i }).first().click()
    await page.waitForTimeout(1500)
    await login(page, ADMIN.email, ADMIN.password)
    await page.goto('/admin?tab=users')
    await page.waitForTimeout(3000)
    const userRow = page.locator('tr', { hasText: email })
    await expect(userRow).toBeVisible({ timeout: 15000 })
    await userRow.getByRole('button', { name: 'Suspend' }).click()
    await page.waitForTimeout(2000)
    await expect(userRow.getByText('Suspended')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Sign out/i }).first().click()
    await page.waitForTimeout(1000)
    await page.goto('/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(NEW_PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await expect(page.getByText(/Account suspended/i)).toBeVisible({ timeout: 10000 })
    await screenshot(page, '08-suspended')
    record('Account suspension', 'PASS', 'Admin suspended; trainer login blocked with message')
    // Unsuspend so account deletion can proceed
    await login(page, ADMIN.email, ADMIN.password)
    await page.goto('/admin?tab=users')
    await page.waitForTimeout(3000)
    await userRow.getByRole('button', { name: 'Reactivate' }).click()
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: /Sign out/i }).first().click()
    await login(page, email, NEW_PASSWORD)
  } catch (e) {
    await screenshot(page, '08-suspension-FAIL')
    record('Account suspension', 'FAIL', String(e))
  }

  // ── 6. Account deletion ──
  try {
    await openSettingsTab(page, '⚙️ Account')
    await page.getByPlaceholder('Type "DELETE" to confirm').fill('DELETE')
    await page.getByRole('button', { name: 'Delete Account Permanently' }).click()
    await page.waitForURL(/\/(login)?$|^\/$/, { timeout: 20000 })
    await page.goto('/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(NEW_PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2500)
    const stillOnLogin = page.url().includes('/login')
    const hasError = await page.getByText(/invalid|not found|failed|suspended/i).isVisible().catch(() => false)
    expect(stillOnLogin || hasError).toBeTruthy()
    await screenshot(page, '09-account-deleted')
    record('Account deletion', 'PASS', 'Account deleted; subsequent login fails')
  } catch (e) {
    await screenshot(page, '09-deletion-FAIL')
    record('Account deletion', 'FAIL', String(e))
  }

  // Write report
  const reportPath = path.join(process.cwd(), 'TRAINER_UI_AUDIT_RESULTS.md')
  const lines = [
    '# Trainer UI Audit Results',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Test account:** ${email}`,
    '',
    '| # | Test | Status | Detail |',
    '|---|------|--------|--------|',
    ...results.map((r, i) => `| ${i + 1} | ${r.step} | ${r.status === 'PASS' ? '✅' : '❌'} | ${r.detail.replace(/\|/g, '\\|')} |`),
    '',
    'Screenshots: `e2e/screenshots/trainer-ui-audit/`',
    '',
  ]
  fs.writeFileSync(reportPath, lines.join('\n'))
  console.log(`\nReport written to ${reportPath}`)

  const failures = results.filter((r) => r.status === 'FAIL')
  expect(failures, `Failed steps: ${failures.map((f) => f.step).join(', ')}`).toHaveLength(0)
})
