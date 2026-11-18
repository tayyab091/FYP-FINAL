import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const baseUrl = process.argv[2] || 'http://localhost:3100'
const output = process.argv[3] || '.perf-artifacts/audit.json'
const paths = process.argv.slice(4)
await mkdir(output.replace(/[\\/][^\\/]+$/, ''), { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
try {
  for (const path of paths.length ? paths : ['/', '/exercises', '/nutrition', '/coaching', '/gyms', '/login']) {
    const context = await browser.newContext({ viewport: { width: 1365, height: 900 } })
    const page = await context.newPage()
    const errors = []
    const failures = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }) })
    await page.addInitScript(() => {
      window.__auditLcp = 0
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__auditLcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    })
    const started = performance.now()
    let status = null
    try {
      const response = await page.goto(new URL(path, baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 45000 })
      status = response?.status()
      await page.locator('main h1, main h2, main [role="alert"]').first().waitFor({ state: 'visible', timeout: 12000 }).catch(() => {})
      await page.waitForTimeout(2000)
      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0]
        const scripts = performance.getEntriesByType('resource').filter(entry => entry.initiatorType === 'script')
        return {
          ttfbMs: Math.round(nav.responseStart - nav.requestStart),
          domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
          lcpMs: Math.round(window.__auditLcp),
          jsBytes: scripts.reduce((total, entry) => total + entry.encodedBodySize, 0),
          scriptCount: scripts.length,
          heading: document.querySelector('main h1')?.textContent,
          images: [...document.images].map(img => ({ src: img.currentSrc, loaded: img.complete && img.naturalWidth > 0 })).filter(img => img.src),
        }
      })
      results.push({ path, status, observedMs: Math.round(performance.now() - started), ...metrics, errors, failures })
    } catch (error) {
      results.push({ path, status, error: error.message, errors, failures })
    }
    await page.screenshot({ path: output.replace(/\.json$/, `-${path.replace(/[^a-z0-9]/gi, '_') || 'home'}.png`), fullPage: false }).catch(() => {})
    await context.close()
    console.log(JSON.stringify(results.at(-1)))
  }
} finally {
  await browser.close()
  await mkdir(output.replace(/[\\/][^\\/]+$/, ''), { recursive: true })
  await writeFile(output, JSON.stringify({ baseUrl, measuredAt: new Date().toISOString(), results }, null, 2))
}
