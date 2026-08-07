import { chromium, devices } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = path.join(process.cwd(), 'screenshots', 'landing-audit')
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

async function capture(page, name, options = {}) {
  await page.screenshot({ path: path.join(OUT_DIR, `polish-v2-${name}.png`), ...options })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()

  const desktopDark = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const desktopPage = await desktopDark.newPage()
  await desktopPage.goto(`${BASE_URL}/?marketing=1`, { waitUntil: 'load', timeout: 60000 })
  await desktopPage.waitForTimeout(2000)
  await capture(desktopPage, 'desktop-dark-hero')

  const pillars = desktopPage.locator('#pillars')
  if (await pillars.count()) {
    await pillars.scrollIntoViewIfNeeded()
    await desktopPage.waitForTimeout(600)
    await capture(desktopPage, 'desktop-dark-pillars')
  }

  const stats = desktopPage.locator('#stats')
  if (await stats.count()) {
    await stats.scrollIntoViewIfNeeded()
    await desktopPage.waitForTimeout(600)
    await capture(desktopPage, 'desktop-dark-stats')
  }

  const features = desktopPage.locator('#features')
  if (await features.count()) {
    await features.scrollIntoViewIfNeeded()
    await desktopPage.waitForTimeout(600)
    await capture(desktopPage, 'desktop-dark-features')
  }

  await capture(desktopPage, 'desktop-dark-full', { fullPage: true })
  await desktopPage.close()

  const lightCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  })
  const lightPage = await lightCtx.newPage()
  await lightPage.goto(`${BASE_URL}/?marketing=1`, { waitUntil: 'load', timeout: 60000 })
  await lightPage.waitForTimeout(2000)
  await capture(lightPage, 'desktop-light-hero')
  await lightPage.locator('#pillars').scrollIntoViewIfNeeded()
  await lightPage.waitForTimeout(600)
  await capture(lightPage, 'desktop-light-pillars')
  await lightPage.locator('#features').scrollIntoViewIfNeeded()
  await lightPage.waitForTimeout(600)
  await capture(lightPage, 'desktop-light-features')
  await lightPage.close()

  const mobileCtx = await browser.newContext({ ...devices['iPhone 13'] })
  const mobilePage = await mobileCtx.newPage()
  await mobilePage.goto(`${BASE_URL}/?marketing=1`, { waitUntil: 'load', timeout: 60000 })
  await mobilePage.waitForTimeout(1500)
  await capture(mobilePage, 'mobile-dark-hero')
  await mobilePage.locator('#pillars').scrollIntoViewIfNeeded()
  await mobilePage.waitForTimeout(500)
  await capture(mobilePage, 'mobile-dark-pillars')
  await mobilePage.locator('#features').scrollIntoViewIfNeeded()
  await mobilePage.waitForTimeout(500)
  await capture(mobilePage, 'mobile-dark-features')
  await capture(mobilePage, 'mobile-dark-full', { fullPage: true })
  await mobilePage.close()

  await browser.close()
  console.log(`Saved polish-v2 screenshots to ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
