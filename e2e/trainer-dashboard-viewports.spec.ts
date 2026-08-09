import { test, expect, Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const TRAINER = { email: 'ali@test.com', password: 'Trainer@123' }

const VIEWPORTS = [
  { width: 768, height: 1024, name: '768x1024' },
  { width: 820, height: 1120, name: '820x1120' },
  { width: 1024, height: 1366, name: '1024x1366' },
  { width: 853, height: 1280, name: '853x1280' },
  { width: 1024, height: 600, name: '1024x600' },
  { width: 1280, height: 800, name: '1280x800' },
  { width: 1920, height: 1080, name: '1920x1080' },
] as const

async function loginAsTrainer(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').first().fill(TRAINER.email)
  await page.locator('input[type="password"]').first().fill(TRAINER.password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/trainer-dashboard/, { timeout: 15000 })
}

interface LayoutIssue {
  type: string
  detail: string
}

async function checkLayout(page: Page): Promise<LayoutIssue[]> {
  return page.evaluate(() => {
    const issues: LayoutIssue[] = []
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Horizontal overflow
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 2) {
      issues.push({
        type: 'horizontal-overflow',
        detail: `scrollWidth ${document.documentElement.scrollWidth} > clientWidth ${document.documentElement.clientWidth}`,
      })
    }

    // Stat cards
    document.querySelectorAll('.dashboard-stat-card').forEach((card, i) => {
      const rect = card.getBoundingClientRect()
      if (rect.right > vw + 1 || rect.left < -1) {
        issues.push({ type: 'stat-card-overflow', detail: `stat-card ${i} clips viewport` })
      }
      const label = card.querySelector('.workout-label')
      const value = card.querySelector('.font-heading')
      if (label && value) {
        const lr = label.getBoundingClientRect()
        const vr = value.getBoundingClientRect()
        if (lr.bottom > vr.top + 2) {
          issues.push({ type: 'stat-card-overlap', detail: `stat-card ${i} label overlaps value` })
        }
      }
    })

    // Action tiles (Message Clients, etc.)
    document.querySelectorAll('.tile.interactive-lift').forEach((tile, i) => {
      const rect = tile.getBoundingClientRect()
      if (rect.right > vw + 1 || rect.left < -1) {
        issues.push({ type: 'action-tile-overflow', detail: `action-tile ${i} clips viewport` })
      }
    })

    // FAB overlap with bottom content
    const fabSelectors = [
      '[aria-label="AI Fitness Coach"]',
      '[aria-label="Messages"]',
    ]
    const fabs = fabSelectors
      .map((sel) => document.querySelector(sel))
      .filter(Boolean) as Element[]

    const bottomPanels = Array.from(
      document.querySelectorAll('.tile.min-h-\\[240px\\], .tile.min-h-\\[240px\\] ~ .tile'),
    )
    // Also check action tiles in bottom row
    const actionTiles = Array.from(document.querySelectorAll('.tile.interactive-lift'))
    const checkTargets = [...bottomPanels, ...actionTiles.slice(-2)]

    fabs.forEach((fab) => {
      const fr = fab.getBoundingClientRect()
      checkTargets.forEach((target, i) => {
        const tr = target.getBoundingClientRect()
        const overlaps =
          fr.left < tr.right &&
          fr.right > tr.left &&
          fr.top < tr.bottom &&
          fr.bottom > tr.top
        if (overlaps && tr.bottom > fr.top - 20) {
          issues.push({
            type: 'fab-overlap',
            detail: `${fab.getAttribute('aria-label')} overlaps content ${i}`,
          })
        }
      })
    })

    // Active Clients / Recent Messages rows
    document
      .querySelectorAll('.tile.min-h-\\[240px\\] .flex.items-center.justify-between')
      .forEach((row, i) => {
        const rect = row.getBoundingClientRect()
        if (rect.right > vw + 1) {
          issues.push({ type: 'panel-row-overflow', detail: `panel-row ${i} clips viewport` })
        }
        const children = Array.from(row.children) as HTMLElement[]
        for (let a = 0; a < children.length; a++) {
          for (let b = a + 1; b < children.length; b++) {
            const ar = children[a].getBoundingClientRect()
            const br = children[b].getBoundingClientRect()
            const overlap =
              ar.left < br.right &&
              ar.right > br.left &&
              ar.top < br.bottom &&
              ar.bottom > br.top
            if (overlap) {
              issues.push({ type: 'panel-row-overlap', detail: `panel-row ${i} children overlap` })
            }
          }
        }
      })

    return issues
  })
}

test.describe('Trainer dashboard viewport layout', () => {
  test.beforeAll(() => {
    const dir = path.join('e2e', 'screenshots')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })

  for (const vp of VIEWPORTS) {
    test(`layout at ${vp.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      })
      const page = await context.newPage()
      await loginAsTrainer(page)
      await page.goto('/trainer-dashboard')
      await page.waitForLoadState('networkidle')
      // Wait for stat cards to render
      await page.waitForSelector('.dashboard-stat-card, .dashboard-grid', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(2000)

      const screenshotPath = `e2e/screenshots/trainer-dashboard-${vp.name}.png`
      await page.screenshot({ path: screenshotPath, fullPage: true })

      const issues = await checkLayout(page)
      console.log(`[${vp.name}] issues:`, JSON.stringify(issues, null, 2))

      await context.close()

      // Soft assert — collect issues but don't fail first run
      expect(issues, `Layout issues at ${vp.name}: ${JSON.stringify(issues)}`).toEqual([])
    })
  }
})
