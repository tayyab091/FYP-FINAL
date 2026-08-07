import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const OUT = path.join(process.cwd(), 'screenshots', 'landing-audit')

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(`${BASE}/?marketing=1`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)

  const sections = [
    { id: 'stats', sel: '#stats', file: 'cards-stats-fixed.png' },
    { id: 'features', sel: '#features', file: 'cards-bento-fixed.png' },
    { id: 'pillars', sel: '#pillars', file: 'cards-pillars-fixed.png' },
    { id: 'pricing', sel: '#pricing', file: 'cards-pricing-fixed.png' },
  ]

  const results = {}
  for (const { id, sel, file } of sections) {
    const section = page.locator(sel)
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1200)
    await section.screenshot({ path: path.join(OUT, file) })

    const cardSel =
      id === 'stats'
        ? '.landing-stat'
        : id === 'features'
          ? '.landing-bento__cell'
          : id === 'pillars'
            ? '.landing-pillar'
            : '.landing-pricing__cell'

    const opacities = await page.locator(cardSel).evaluateAll((nodes) =>
      nodes.map((n) => parseFloat(getComputedStyle(n).opacity))
    )
    results[id] = {
      count: opacities.length,
      minOpacity: opacities.length ? Math.min(...opacities) : 0,
      allVisible: opacities.every((o) => o > 0.9),
    }
  }

  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}

main()
