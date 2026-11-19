import { test, expect } from '@playwright/test'

// Opt in because this sends a real request against the account's free quota.
test('the chatbot renders a live free OpenRouter response', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_LIVE_AI !== '1', 'Set PLAYWRIGHT_LIVE_AI=1 to verify the live provider.')
  await page.goto('/login')
  await page.getByRole('button', { name: 'Open AI Fitness Coach', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'AI Fitness Coach' })
  await expect(panel).toBeVisible()
  await panel.getByPlaceholder('Ask about fitness, nutrition...').fill('Give a beginner three practical steps for building a consistent strength-training habit.')
  const pending = page.waitForResponse(response => response.url().endsWith('/api/ai/chat') && response.request().method() === 'POST')
  await panel.getByRole('button', { name: 'Send message', exact: true }).click()
  const response = await pending
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  const data = await response.json()
  expect(data.source).toBe('openrouter')
  expect(typeof data.model).toBe('string')
  expect(data.reply).toMatch(/^#{1,3} /m)
  expect(data.reply).toContain('Note. This information')
  await expect(panel.locator('.ai-chatbot__bubble--bot').last().locator('h1, h2, h3').first()).toBeVisible()
  await expect(panel.getByPlaceholder('Ask about fitness, nutrition...')).toBeEnabled()
  await page.screenshot({ path: '.perf-artifacts/openrouter-chat.png' })
})
