import { chromium, devices } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = path.join(process.cwd(), 'screenshots', 'landing-audit')
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

async function capture(page, name, options = {}) {
  await page.screenshot({ path: path.join(OUT_DIR, `fixed-${name}.png`), ...options })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const mobile = await browser.newContext({ ...devices['iPhone 13'] })

  for (const [label, context] of [
    ['desktop-dark', desktop],
    ['mobile-dark', mobile],
  ]) {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(1500)

    await capture(page, `${label}-hero`)
    await capture(page, `${label}-full`, { fullPage: true })

    const features = page.locator('#features')
    if (await features.count()) {
      await features.scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
      await capture(page, `${label}-features`)
    }

    const trainers = page.locator('#trainers')
    if (await trainers.count()) {
      await trainers.scrollIntoViewIfNeeded()
      await page.waitForTimeout(800)
      await capture(page, `${label}-trainers`)
    }

    await page.close()
  }

  const lightDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  })
  const lightPage = await lightDesktop.newPage()
  await lightPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
  await lightPage.waitForTimeout(1500)
  await capture(lightPage, 'desktop-light-hero')
  await capture(lightPage, 'desktop-light-full', { fullPage: true })
  await lightPage.close()

  await browser.close()
  console.log(`Saved fixed screenshots to ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
