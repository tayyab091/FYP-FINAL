/**
 * Runtime verification for role-capability APIs (super_admin, gym analytics, audit).
 * Usage: node scripts/verify-role-apis.mjs [baseUrl]
 */
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const BASE = process.argv[2] || 'http://localhost:3000'
const SUPER_EMAIL = 'superadmin@test.com'
const SUPER_PASS = 'SuperAdmin@12345'
const ADMIN_EMAIL = 'admin@test.com'
const ADMIN_PASS = 'Admin@123'
const GYM_EMAIL = 'gymowner@test.com'
const GYM_PASS = 'GymOwner@123'

const results = []

function pass(name, detail = '') {
  results.push({ ok: true, name, detail })
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail = '') {
  results.push({ ok: false, name, detail })
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const cookie = res.headers.get('set-cookie')?.split(';')[0] ?? ''
  const data = await res.json().catch(() => ({}))
  return { status: res.status, cookie, data }
}

async function api(cookie, path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function ensureSuperAdmin() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set in .env.local')
  await mongoose.connect(uri)
  const User = (await import('../src/models/User.ts')).default
  const hash = await bcrypt.hash(SUPER_PASS, 12)
  let user = await User.findOne({ email: SUPER_EMAIL })
  if (!user) {
    user = await User.create({
      fullName: 'Super Admin Test',
      email: SUPER_EMAIL,
      password: hash,
      role: 'super_admin',
      isEmailVerified: true,
    })
  } else if (user.role !== 'super_admin') {
    user.role = 'super_admin'
    user.password = hash
    await user.save()
  }
  await mongoose.disconnect()
  return user._id.toString()
}

async function main() {
  console.log(`Verifying role APIs at ${BASE}\n`)

  try {
    await ensureSuperAdmin()
    pass('ensure super_admin test user', SUPER_EMAIL)
  } catch (e) {
    fail('ensure super_admin test user', e.message)
    process.exit(1)
  }

  const health = await fetch(`${BASE}/api/health`).then((r) => r.status).catch(() => 0)
  if (health !== 200) {
    fail('dev server health', `GET /api/health returned ${health || 'unreachable'}`)
    console.error('\nStart the app first: npm run dev')
    process.exit(1)
  }
  pass('dev server health')

  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASS)
  if (adminLogin.status !== 200) {
    fail('admin login', `status ${adminLogin.status}`)
  } else {
    pass('admin login')
  }

  const superLogin = await login(SUPER_EMAIL, SUPER_PASS)
  if (superLogin.status !== 200) {
    fail('super_admin login', `status ${superLogin.status}`)
  } else {
    pass('super_admin login')
  }

  const gymLogin = await login(GYM_EMAIL, GYM_PASS)
  if (gymLogin.status !== 200) {
    fail('gym_owner login', `status ${gymLogin.status}`)
  } else {
    pass('gym_owner login')
  }

  const adminBlocked = await api(adminLogin.cookie, '/api/admin/super/admins')
  if (adminBlocked.status === 403) {
    pass('admin blocked from /api/admin/super/admins', '403')
  } else {
    fail('admin blocked from /api/admin/super/admins', `got ${adminBlocked.status}`)
  }

  const superList = await api(superLogin.cookie, '/api/admin/super/admins')
  if (superList.status === 200 && Array.isArray(superList.data)) {
    pass('super_admin lists admins', `count=${superList.data.length}`)
  } else {
    fail('super_admin lists admins', `status ${superList.status}`)
  }

  const gymAnalytics = await api(gymLogin.cookie, '/api/gym-owner/analytics')
  if (gymAnalytics.status === 200 && gymAnalytics.data?.totals) {
    pass('gym_owner analytics', JSON.stringify(gymAnalytics.data.totals))
  } else {
    fail('gym_owner analytics', `status ${gymAnalytics.status}`)
  }

  const auditLogs = await api(adminLogin.cookie, '/api/admin/audit-logs')
  if (auditLogs.status === 200 && Array.isArray(auditLogs.data)) {
    pass('audit logs readable', `entries=${auditLogs.data.length}`)
  } else {
    fail('audit logs readable', `status ${auditLogs.status}`)
  }

  const createRes = await api(superLogin.cookie, '/api/admin/super/admins', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Temp Admin Verify',
      email: `temp-admin-${Date.now()}@test.com`,
      password: 'TempAdmin@12345',
    }),
  })
  if (createRes.status === 201 && createRes.data?.admin?._id) {
    pass('super_admin creates admin', createRes.data.admin.email)
    const targetId = createRes.data.admin._id
    const suspendRes = await api(superLogin.cookie, `/api/admin/super/users/${targetId}/suspend`, {
      method: 'PUT',
      body: JSON.stringify({ suspend: true, reason: 'Verification test suspend' }),
    })
    if (suspendRes.status === 200) {
      pass('super_admin suspends admin', targetId)
    } else {
      fail('super_admin suspends admin', `status ${suspendRes.status} ${suspendRes.data?.message}`)
    }
    const reinstateRes = await api(superLogin.cookie, `/api/admin/super/users/${targetId}/suspend`, {
      method: 'PUT',
      body: JSON.stringify({ suspend: false, reason: 'Verification test reinstate' }),
    })
    if (reinstateRes.status === 200) {
      pass('super_admin reinstates admin')
    } else {
      fail('super_admin reinstates admin', `status ${reinstateRes.status}`)
    }
  } else if (createRes.status === 409) {
    pass('super_admin create admin (duplicate skipped)')
  } else {
    fail('super_admin creates admin', `status ${createRes.status} ${createRes.data?.message}`)
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
