import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

// Ensure Playwright's webServer uses the same Atlas URI as `next dev` (.env.local).
loadEnvConfig(process.cwd())

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    timeout: 120000,
    env: {
      ...process.env,
      PLAYWRIGHT: '1',
    },
  },
})
