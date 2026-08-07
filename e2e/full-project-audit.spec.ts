import { test, expect, Page, APIRequestContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const BASE = 'http://localhost:3000'
const OUT_DIR = path.join(process.cwd(), 'e2e', 'audit-output')
const OUT_JSON = path.join(OUT_DIR, 'audit-results.json')
const OUT_MD = path.join(process.cwd(), 'FULL_PROJECT_AUDIT.md')

type AuditStatus = 'PASS' | 'FAIL' | 'SKIP' | 'WARN'

interface AuditEntry {
  category: string
  role?: string
  route?: string
  test: string
  status: AuditStatus
  detail: string
  metrics?: Record<string, number | string | boolean>
}

const auditLog: AuditEntry[] = []
const suggestions: string[] = []

function log(entry: AuditEntry) {
  auditLog.push(entry)
  console.log(`[${entry.status}] ${entry.category} | ${entry.test}: ${entry.detail}`)
}

async function login(page: Page, email: string, password: string, home = '/dashboard'): Promise<boolean> {
  await page.context().clearCookies()
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
  })
  if (!res.ok()) {
    // Fallback to UI login for parity checks
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
      const emailInput = page.locator('input[type="email"]').first()
      if (!(await emailInput.isVisible({ timeout: 10000 }).catch(() => false))) {
        if (!page.url().includes('/login')) return true
        continue
      }
      await emailInput.fill(email)
      await page.locator('input[type="password"]').first().fill(password)
      await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }).catch(() => null),
        page.locator('button[type="submit"]').first().click(),
      ])
      await page.waitForTimeout(1000)
      if (!page.url().includes('/login')) return true
    }
    return false
  }
  await page.goto(`${BASE}${home}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  return !page.url().includes('/login')
}

async function logout(page: Page) {
  await page.request.post(`${BASE}/api/auth/logout`).catch(() => {})
  const btn = page.getByRole('button', { name: /Sign out|Logout/i }).first()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await page.waitForTimeout(1000)
  }
  await page.context().clearCookies()
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
}

async function auditPage(
  page: Page,
  category: string,
  route: string,
  role: string,
  options?: { expectUrl?: RegExp; allowRedirect?: boolean },
) {
  const consoleErrors: string[] = []
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  }
  page.on('console', onConsole)

  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(2000)

    const finalUrl = page.url()
    const hasErrorBoundary =
      (await page.getByText(/Application error|Something went wrong/i).isVisible().catch(() => false)) ||
      (await page.getByText(/Internal Server Error/i).isVisible().catch(() => false))

    const buttons = await page.locator('button:visible').count()
    const inputs = await page.locator('input:visible, textarea:visible, select:visible').count()
    const links = await page.locator('a[href]:visible').count()
    const forms = await page.locator('form').count()
    const switches = await page.locator('[role="switch"]:visible').count()

    let status: AuditStatus = 'PASS'
    let detail = `Loaded OK — ${buttons} buttons, ${inputs} inputs, ${links} links, ${forms} forms`

    if (hasErrorBoundary) {
      status = 'FAIL'
      detail = 'Error boundary or 500 visible on page'
    } else if (options?.expectUrl && !options.expectUrl.test(finalUrl)) {
      if (options.allowRedirect) {
        status = 'WARN'
        detail = `Redirected to ${finalUrl} (expected pattern ${options.expectUrl})`
      } else {
        status = 'FAIL'
        detail = `Wrong URL: ${finalUrl}`
      }
    } else if (consoleErrors.length > 0) {
      status = 'WARN'
      detail += `; console errors: ${consoleErrors.slice(0, 2).join(' | ')}`
    }

    log({
      category,
      role,
      route,
      test: `Page load: ${route}`,
      status,
      detail,
      metrics: { buttons, inputs, links, forms, switches },
    })
  } catch (e) {
    log({
      category,
      role,
      route,
      test: `Page load: ${route}`,
      status: 'FAIL',
      detail: String(e),
    })
  } finally {
    page.off('console', onConsole)
  }
}

const ROLES = {
  user_pro: { label: 'user (Pro)', email: 'user1@test.com', password: 'User@123', home: '/dashboard' },
  user_basic: { label: 'user (Basic)', email: 'user2@test.com', password: 'User@123', home: '/dashboard' },
  user_elite: { label: 'user (Elite)', email: 'user3@test.com', password: 'User@123', home: '/dashboard' },
  trainer: { label: 'trainer', email: 'ali@test.com', password: 'Trainer@123', home: '/trainer-dashboard' },
  gym_owner: { label: 'gym_owner', email: 'gymowner@test.com', password: 'GymOwner@123', home: '/gym-owner' },
  admin: { label: 'admin', email: 'admin@test.com', password: 'Admin@123', home: '/admin' },
  super_admin: {
    label: 'super_admin',
    email: 'superadmin@test.com',
    password: 'SuperAdmin@12345',
    home: '/admin',
  },
} as const

const PUBLIC_ROUTES = [
  '/',
  '/coaching',
  '/exercises',
  '/nutrition',
  '/subscription',
  '/login',
  '/signup',
  '/register-trainer',
  '/register-gym-owner',
  '/forgot-password',
]

const ROLE_ROUTES: Record<string, string[]> = {
  user_pro: [
    '/dashboard',
    '/my-fitness',
    '/meal-plans',
    '/community',
    '/chat',
    '/leaderboard',
    '/analytics',
    '/live-sessions',
    '/notifications',
    '/settings',
    '/exercise-check',
  ],
  user_basic: ['/dashboard', '/my-fitness', '/community', '/analytics', '/exercise-check', '/live-sessions'],
  user_elite: ['/dashboard', '/live-sessions', '/exercise-check', '/analytics'],
  trainer: [
    '/trainer-dashboard',
    '/trainer-dashboard/exercises',
    '/trainer-dashboard/nutrition',
    '/meal-plans',
    '/live-sessions',
    '/chat',
    '/settings',
  ],
  gym_owner: ['/gym-owner', '/gym-owner/exercises', '/gym-owner/nutrition', '/chat', '/settings'],
  admin: [
    '/admin',
    '/admin?tab=users',
    '/admin?tab=trainers',
    '/admin?tab=gyms',
    '/admin?tab=verifications',
    '/admin?tab=audit',
    '/admin?tab=subscriptions',
    '/admin/exercises',
    '/admin/nutrition',
    '/settings',
  ],
  super_admin: ['/admin?tab=super', '/admin?tab=users'],
}

const SECURITY_MATRIX: Array<{
  role: keyof typeof ROLES
  route: string
  expectBlocked: boolean
  expectHome?: RegExp
}> = [
  { role: 'user_pro', route: '/admin', expectBlocked: true, expectHome: /dashboard/ },
  { role: 'user_pro', route: '/trainer-dashboard', expectBlocked: true, expectHome: /dashboard/ },
  { role: 'user_pro', route: '/gym-owner', expectBlocked: true, expectHome: /dashboard/ },
  { role: 'trainer', route: '/admin', expectBlocked: true, expectHome: /trainer-dashboard/ },
  { role: 'trainer', route: '/my-fitness', expectBlocked: true, expectHome: /trainer-dashboard/ },
  { role: 'gym_owner', route: '/admin', expectBlocked: true, expectHome: /gym-owner/ },
  { role: 'gym_owner', route: '/trainer-dashboard', expectBlocked: true, expectHome: /gym-owner/ },
  { role: 'admin', route: '/my-fitness', expectBlocked: true, expectHome: /admin/ },
]

function writeMarkdownReport() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), auditLog, suggestions }, null, 2))

  const pass = auditLog.filter((e) => e.status === 'PASS').length
  const fail = auditLog.filter((e) => e.status === 'FAIL').length
  const warn = auditLog.filter((e) => e.status === 'WARN').length
  const skip = auditLog.filter((e) => e.status === 'SKIP').length

  const byCategory = new Map<string, AuditEntry[]>()
  for (const e of auditLog) {
    const list = byCategory.get(e.category) || []
    list.push(e)
    byCategory.set(e.category, list)
  }

  let md = `# Full Project Playwright Audit\n\n`
  md += `**Generated:** ${new Date().toISOString()}  \n`
  md += `**Tool:** Playwright (Chromium) via \`e2e/full-project-audit.spec.ts\`  \n`
  md += `**Summary:** ${pass} PASS · ${warn} WARN · ${fail} FAIL · ${skip} SKIP (${auditLog.length} total checks)\n\n`

  md += `## Executive Summary\n\n`
  md += `| Area | PASS | WARN | FAIL | SKIP |\n|------|------|------|------|------|\n`
  for (const [cat, entries] of byCategory) {
    md += `| ${cat} | ${entries.filter((e) => e.status === 'PASS').length} | ${entries.filter((e) => e.status === 'WARN').length} | ${entries.filter((e) => e.status === 'FAIL').length} | ${entries.filter((e) => e.status === 'SKIP').length} |\n`
  }

  md += `\n## Test Accounts Used\n\n`
  md += `| Role | Email | Password |\n|------|-------|----------|\n`
  for (const r of Object.values(ROLES)) {
    md += `| ${r.label} | ${r.email} | ${r.password} |\n`
  }
  md += `\n*Requires seeded database (\`POST /api/seed\`). super_admin via \`scripts/verify-role-apis.mjs\` if missing.*\n\n`

  md += `## Detailed Results\n\n`
  for (const [cat, entries] of byCategory) {
    md += `### ${cat}\n\n`
    md += `| Status | Role | Route | Test | Detail |\n|--------|------|-------|------|--------|\n`
    for (const e of entries) {
      const icon = e.status === 'PASS' ? '✅' : e.status === 'WARN' ? '⚠️' : e.status === 'SKIP' ? '⏭️' : '❌'
      md += `| ${icon} | ${e.role || '—'} | ${e.route || '—'} | ${e.test} | ${e.detail.replace(/\|/g, '/').slice(0, 120)} |\n`
    }
    md += `\n`
  }

  md += `## UI Element Inventory (aggregated per role routes)\n\n`
  const pageLoads = auditLog.filter((e) => e.test.startsWith('Page load'))
  const totals = pageLoads.reduce(
    (acc, e) => {
      if (!e.metrics) return acc
      acc.buttons += Number(e.metrics.buttons || 0)
      acc.inputs += Number(e.metrics.inputs || 0)
      acc.links += Number(e.metrics.links || 0)
      acc.forms += Number(e.metrics.forms || 0)
      return acc
    },
    { buttons: 0, inputs: 0, links: 0, forms: 0 },
  )
  md += `Across audited pages: **${totals.buttons}** visible buttons, **${totals.inputs}** inputs/selects/textareas, **${totals.links}** links, **${totals.forms}** forms.\n\n`

  md += `## Security Findings\n\n`
  const sec = auditLog.filter((e) => e.category === 'Security')
  for (const e of sec) {
    md += `- **${e.status}** — ${e.test}: ${e.detail}\n`
  }

  md += `\n## Improvement Suggestions\n\n`
  for (let i = 0; i < suggestions.length; i++) {
    md += `${i + 1}. ${suggestions[i]}\n`
  }

  md += `\n## Raw Data\n\nSee \`e2e/audit-output/audit-results.json\` for machine-readable results.\n`
  fs.writeFileSync(OUT_MD, md)
  console.log(`\n📄 Audit written to ${OUT_MD}`)
}

test.describe.configure({ mode: 'serial' })

test.describe('Full project audit', () => {
  test.setTimeout(900000)

  test.afterAll(() => {
    writeMarkdownReport()
  })

  test('Infrastructure & API health', async ({ request }) => {
    // Warm up dev server — first compile can return 503 or reset connections.
    let healthStatus = 0
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const health = await request.get(`${BASE}/api/health`, { timeout: 30000 })
        healthStatus = health.status()
        if (health.ok()) break
      } catch {
        healthStatus = 0
      }
      await new Promise((r) => setTimeout(r, 3000))
    }
    log({
      category: 'Infrastructure',
      test: 'GET /api/health',
      status: healthStatus === 200 ? 'PASS' : 'FAIL',
      detail: `Status ${healthStatus || 'unreachable'}`,
    })

    let trainersStatus = 0
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const trainers = await request.get(`${BASE}/api/trainers?limit=1`, { timeout: 30000 })
        trainersStatus = trainers.status()
        if (trainers.ok()) break
      } catch {
        trainersStatus = 0
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
    log({
      category: 'Infrastructure',
      test: 'GET /api/trainers',
      status: trainersStatus === 200 ? 'PASS' : 'FAIL',
      detail: `Status ${trainersStatus || 'unreachable'}`,
    })
  })

  test('Public routes (guest)', async ({ page }) => {
    for (const route of PUBLIC_ROUTES) {
      await auditPage(page, 'Public Pages', route, 'guest')
    }
    await auditPage(page, 'Public Pages', '/exercise-check', 'guest', { allowRedirect: true })
  })

  test('Auth security — unauthenticated & bad credentials', async ({ page }) => {
    for (const route of ['/settings', '/admin', '/my-fitness', '/trainer-dashboard', '/gym-owner']) {
      await page.goto(`${BASE}${route}`)
      await page.waitForTimeout(1500)
      const blocked = page.url().includes('/login')
      log({
        category: 'Security',
        test: `Unauthenticated ${route}`,
        status: blocked ? 'PASS' : 'FAIL',
        detail: blocked ? 'Redirected to login' : `Landed on ${page.url()}`,
        route,
      })
    }

    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').first().fill('user1@test.com')
    await page.locator('input[type="password"]').first().fill('WrongPassword999!')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
    const stayedOnLogin = page.url().includes('/login')
    log({
      category: 'Security',
      test: 'Invalid password rejected',
      status: stayedOnLogin ? 'PASS' : 'FAIL',
      detail: stayedOnLogin ? 'Remains on login' : `Redirected to ${page.url()}`,
    })
  })

  test('Auth pages — form fields inventory', async ({ page }) => {
    const authForms: Array<{ route: string; minInputs: number }> = [
      { route: '/login', minInputs: 2 },
      { route: '/signup', minInputs: 2 },
      { route: '/register-trainer', minInputs: 4 },
      { route: '/register-gym-owner', minInputs: 4 },
      { route: '/forgot-password', minInputs: 1 },
    ]
    for (const { route, minInputs } of authForms) {
      await page.goto(`${BASE}${route}`)
      await page.waitForLoadState('networkidle')
      const inputs = await page.locator('input, textarea, select').count()
      const submit = await page.locator('button[type="submit"]').count()
      log({
        category: 'Auth Forms',
        route,
        test: `Form inventory ${route}`,
        status: inputs >= minInputs && submit >= 1 ? 'PASS' : 'FAIL',
        detail: `${inputs} fields, ${submit} submit button(s)`,
        metrics: { inputs, submit },
      })
    }
  })

  for (const [roleKey, creds] of Object.entries(ROLES)) {
    test(`Role: ${creds.label} — routes & UI`, async ({ page }) => {
      const ok = await login(page, creds.email, creds.password, creds.home)
      if (!ok) {
        log({
          category: 'Role Access',
          role: creds.label,
          test: 'Login',
          status: roleKey === 'super_admin' ? 'SKIP' : 'FAIL',
          detail:
            roleKey === 'super_admin'
              ? 'super_admin not in DB — run scripts/verify-role-apis.mjs'
              : 'Login failed — ensure database is seeded',
        })
        if (roleKey === 'super_admin') {
          suggestions.push(
            'Add super_admin to seed route or document one-command setup so Playwright can audit Super Admin tab without a manual script.',
          )
          return
        }
        return
      }

      log({
        category: 'Role Access',
        role: creds.label,
        test: 'Login',
        status: 'PASS',
        detail: `Landed on ${page.url()}`,
      })

      const routes = ROLE_ROUTES[roleKey] || []
      for (const route of routes) {
        await auditPage(page, 'Role Pages', route, creds.label, {
          expectUrl: new RegExp(route.split('?')[0].replace(/\//g, '\\/')),
          allowRedirect: true,
        })
      }

      // Settings tabs inventory per role
      if (routes.includes('/settings')) {
        await page.goto(`${BASE}/settings`)
        await page.waitForTimeout(1500)
        const tabButtons = await page.locator('.flex-shrink-0 button').count()
        log({
          category: 'Settings UI',
          role: creds.label,
          route: '/settings',
          test: 'Settings sidebar tabs',
          status: tabButtons >= 4 ? 'PASS' : 'WARN',
          detail: `${tabButtons} tab buttons visible`,
          metrics: { tabButtons },
        })
      }

      await logout(page)
    })
  }

  test('Security — cross-role route blocking', async ({ page }) => {
    for (const item of SECURITY_MATRIX) {
      const creds = ROLES[item.role]
      const ok = await login(page, creds.email, creds.password, creds.home)
      if (!ok) {
        log({
          category: 'Security',
          role: creds.label,
          route: item.route,
          test: 'Cross-role block (login failed)',
          status: 'SKIP',
          detail: 'Could not log in',
        })
        continue
      }
      await page.goto(`${BASE}${item.route}`)
      await page.waitForTimeout(2000)
      const url = page.url()
      const blocked = item.expectHome ? item.expectHome.test(url) : !url.includes(item.route)
      log({
        category: 'Security',
        role: creds.label,
        route: item.route,
        test: 'Cross-role access blocked',
        status: blocked === item.expectBlocked ? 'PASS' : 'FAIL',
        detail: `Final URL: ${url}`,
      })
      await logout(page)
    }
  })

  test('Plan gates — Basic vs Pro vs Elite', async ({ page }) => {
    const planChecks = [
      { role: 'user_basic' as const, route: '/exercise-check', expectGate: true },
      { role: 'user_pro' as const, route: '/exercise-check', expectGate: false },
      { role: 'user_basic' as const, route: '/analytics', expectGate: true },
      { role: 'user_pro' as const, route: '/analytics', expectGate: false },
      { role: 'user_pro' as const, route: '/live-sessions', expectGate: true },
      { role: 'user_elite' as const, route: '/live-sessions', expectGate: false },
    ]

    for (const check of planChecks) {
      const creds = ROLES[check.role]
      if (!(await login(page, creds.email, creds.password, creds.home))) continue
      await page.goto(`${BASE}${check.route}`)
      await page.waitForTimeout(2500)
      const gated = await page.getByTestId('subscription-gate').isVisible().catch(() => false)
      log({
        category: 'Plan Gates',
        role: creds.label,
        route: check.route,
        test: 'Subscription gate',
        status: gated === check.expectGate ? 'PASS' : 'WARN',
        detail: gated ? 'Gate/upgrade UI shown' : 'Feature appears accessible',
      })
      await logout(page)
    }

    if (auditLog.filter((e) => e.category === 'Plan Gates' && e.status === 'WARN').length > 0) {
      suggestions.push(
        'Add explicit data-testid markers on plan-gate overlays so Playwright can distinguish gates from normal page content.',
      )
    }
  })

  test('Trainer dashboard — tabs & availability form', async ({ page }) => {
    if (!(await login(page, ROLES.trainer.email, ROLES.trainer.password, ROLES.trainer.home))) return
    await page.goto(`${BASE}/trainer-dashboard`)
    await page.waitForTimeout(2000)
    const tabs = ['Overview', 'Client Requests', 'My Clients', 'Meal Plans', 'Availability', 'chat']
    for (const tab of tabs) {
      const tabBtn = page.getByRole('tab', { name: new RegExp(tab, 'i') })
      if (await tabBtn.isVisible().catch(() => false)) {
        await tabBtn.click()
        await page.waitForTimeout(800)
        log({
          category: 'Trainer Dashboard',
          role: 'trainer',
          test: `Tab: ${tab}`,
          status: 'PASS',
          detail: 'Tab clickable',
        })
      }
    }
    await page.getByRole('tab', { name: 'Availability' }).click()
    await page.waitForTimeout(1500)
    await page.getByTestId('availability-form').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    const timeInputs = await page.getByTestId('availability-time-input').count()
    const saveBtn = await page.getByTestId('availability-save').isVisible()
    log({
      category: 'Trainer Dashboard',
      role: 'trainer',
      test: 'Availability form',
      status: timeInputs >= 5 && saveBtn ? 'PASS' : 'FAIL',
      detail: `${timeInputs} time inputs, save visible: ${saveBtn}`,
      metrics: { timeInputs },
    })
    await logout(page)
  })

  test('Admin — users table & suspend controls', async ({ page }) => {
    if (!(await login(page, ROLES.admin.email, ROLES.admin.password, ROLES.admin.home))) return
    await page.goto(`${BASE}/admin?tab=users`)
    await page.waitForTimeout(3000)
    const rows = await page.locator('table tbody tr').count()
    const suspendBtns = await page.getByRole('button', { name: /Suspend|Reactivate/i }).count()
    log({
      category: 'Admin UI',
      role: 'admin',
      route: '/admin?tab=users',
      test: 'Users table',
      status: rows > 0 ? 'PASS' : 'WARN',
      detail: `${rows} user rows, ${suspendBtns} suspend/reactivate buttons`,
      metrics: { rows, suspendBtns },
    })
    await logout(page)
  })

  test('Generate suggestions from failures', async () => {
    const fails = auditLog.filter((e) => e.status === 'FAIL')
    if (fails.some((f) => f.route === '/nutrition')) {
      suggestions.push('Nutrition page: verify meal catalog API timeout handling for guest users.')
    }
    if (!auditLog.some((e) => e.category === 'Role Pages' && e.role?.includes('gym_owner'))) {
      suggestions.push('Expand gym_owner Playwright coverage: gym profile save, add trainer flow, approve trainer.')
    }
    suggestions.push(
      'Add data-testid attributes on critical actions (Save, Suspend, Delete, Connect) for stable selectors across theme changes.',
    )
    suggestions.push(
      'Run Playwright in CI on every PR with seeded test DB (Docker + mongo) for regression safety.',
    )
    suggestions.push(
      'Add E2E tests for password reset and email verification flows when SMTP is configured.',
    )
    suggestions.push(
      'Implement rate limiting tests on /api/auth/login and /api/auth/register to verify brute-force protection.',
    )
    suggestions.push(
      'Add visual regression (Playwright screenshots) for landing, dashboard, and settings in light/dark mode.',
    )
    suggestions.push(
      'Document super_admin bootstrap in README and include in seed for complete admin audit coverage.',
    )
    expect(auditLog.length).toBeGreaterThan(10)
  })
})
