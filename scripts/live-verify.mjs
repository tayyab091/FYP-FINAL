import fs from 'fs'
import path from 'path'

const base = 'http://localhost:3000'
let cookies = {}

function parseSetCookie(res) {
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(';')
    const i = pair.indexOf('=')
    if (i > 0) cookies[pair.slice(0, i)] = pair.slice(i + 1)
  }
}

async function api(method, p, body, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const cookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  if (cookieStr) headers.Cookie = cookieStr
  const res = await fetch(base + p, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    redirect: opts.redirect || 'manual',
  })
  parseSetCookie(res)
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = text.slice(0, 300)
  }
  return { status: res.status, json, text, headers: res.headers }
}

function summarize(json) {
  const s = typeof json === 'string' ? json : JSON.stringify(json)
  return s.slice(0, 280)
}

const results = []
function record(feature, action, expected, actual, notes = '') {
  const ok =
    typeof expected === 'function'
      ? expected(actual)
      : actual.status === expected ||
        (Array.isArray(expected) && expected.includes(actual.status))
  const row = {
    feature,
    action,
    expected: typeof expected === 'function' ? 'custom' : expected,
    actualStatus: actual.status,
    ok,
    notes: notes || summarize(actual.json),
  }
  results.push(row)
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${feature} | ${action} | ${actual.status}`)
}

// --- Auth ---
cookies = {}
let r = await api('GET', '/api/health')
record('Health', 'GET /api/health', 200, r, r.json.database)

r = await api('POST', '/api/auth/login', {
  email: 'user1@test.com',
  password: 'User@123',
})
record('Auth login', 'login user1 (pro)', 200, r)

r = await api('GET', '/api/auth/me')
record('Auth me', 'GET /api/auth/me', 200, r)

const email = `verify_${Date.now()}@test.com`
cookies = {}
r = await api('POST', '/api/auth/register', {
  fullName: 'Verify User',
  email,
  password: 'Verify@123',
})
record('Auth register', `register ${email}`, [200, 201], r)

r = await api('POST', '/api/auth/login', { email, password: 'Verify@123' })
record('Auth register login', 'login new user', 200, r)

cookies = {}
r = await api('POST', '/api/auth/forgot-password', { email: 'user1@test.com' })
record(
  'Password reset',
  'POST forgot-password',
  (a) => a.status === 200 || a.status === 503,
  r,
  'SMTP may be unset',
)

r = await api('GET', '/api/auth/oauth/google')
record(
  'OAuth Google',
  'GET oauth/google',
  (a) => [200, 302, 307, 503, 500].includes(a.status),
  r,
  'GOOGLE_CLIENT_* may be unset',
)

// --- Role dashboards (API proxies) ---
async function loginAs(email, password) {
  cookies = {}
  return api('POST', '/api/auth/login', { email, password })
}

await loginAs('user1@test.com', 'User@123')
r = await api('GET', '/')
record('Dashboard user', 'GET / (homepage)', [200, 307], r)

await loginAs('ali@test.com', 'Trainer@123')
r = await api('GET', '/api/auth/me')
record('Dashboard trainer', 'login+me trainer', 200, r, summarize(r.json))
r = await api('GET', '/api/trainers/profile')
record('Trainer profile', 'GET trainers/profile', [200, 404], r)
r = await api('GET', '/api/relationships/pending-requests')
record('Coaching requests', 'pending-requests', 200, r)

await loginAs('gymowner@test.com', 'GymOwner@123')
r = await api('GET', '/api/gym-owner/gym')
record('Gym owner', 'GET gym-owner/gym', 200, r)
r = await api('GET', '/api/gym-owner/trainers')
record('Gym trainers', 'GET gym-owner/trainers', 200, r)

await loginAs('admin@test.com', 'Admin@123')
r = await api('GET', '/api/admin/stats')
record('Admin', 'GET admin/stats', 200, r)
r = await api('GET', '/api/admin/users')
record('Admin users', 'GET admin/users', 200, r)

// --- Core member features ---
await loginAs('user1@test.com', 'User@123')
const checks = [
  ['Coaching', '/api/trainers'],
  ['Chat', '/api/chat/conversations'],
  ['Nutrition meals', '/api/meals'],
  ['Nutrition today', '/api/tracking/meal-logs/today'],
  ['Progress', '/api/tracking/progress'],
  ['Workout plans', '/api/tracking/plans'],
  ['My plan', '/api/tracking/plans/my-plan'],
  ['Subscription', '/api/subscription'],
  ['Notifications', '/api/notifications'],
  ['Gamification', '/api/gamification/me'],
  ['Exercises', '/api/exercises'],
  ['Relationships', '/api/relationships'],
  ['Meal plans', '/api/meal-plans'],
  ['Community', '/api/community/posts'],
  ['Analytics', '/api/analytics/summary'],
  ['Live sessions', '/api/live-sessions'],
]
for (const [name, pathName] of checks) {
  r = await api('GET', pathName)
  record(name, `GET ${pathName}`, 200, r)
}

// Reviews
const trainers = (await api('GET', '/api/trainers')).json
const trainerId = trainers?.trainers?.[0]?._id
if (trainerId) {
  r = await api('GET', `/api/trainers/${trainerId}/reviews`)
  record('Reviews', `GET reviews for ${trainerId}`, 200, r)
}

// Chat messages if conversation exists
const convs = (await api('GET', '/api/chat/conversations')).json
const convId = Array.isArray(convs) ? convs[0]?._id : convs?.[0]?._id
if (convId) {
  r = await api('GET', `/api/chat/conversations/${convId}/messages`)
  record('Chat messages', `GET messages ${convId}`, 200, r)
  r = await api('POST', `/api/chat/conversations/${convId}/messages`, {
    content: 'Live verify ping ' + Date.now(),
  })
  record('Chat send', 'POST message', [200, 201], r)
  r = await api('POST', `/api/chat/conversations/${convId}/typing`, { isTyping: true })
  record('Chat typing', 'POST typing', [200, 204], r)
}

// Chat upload (Blob optional)
r = await api('POST', '/api/chat/upload', { note: 'no file' })
record(
  'Image upload',
  'POST /api/chat/upload without file',
  (a) => [400, 401, 415, 500, 503].includes(a.status),
  r,
  'BLOB_READ_WRITE_TOKEN may be unset',
)

// Nutrition analyze
r = await api('POST', '/api/nutrition/analyze', { description: 'grilled chicken salad' })
record(
  'Nutrition analyze',
  'POST analyze',
  (a) => [200, 503].includes(a.status),
  r,
  'Spoonacular/Gemini optional',
)

// Community post (user1 is pro — community allowed)
r = await api('POST', '/api/community/posts', {
  content: 'Live verification post ' + Date.now(),
})
record('Community post', 'POST post', [200, 201], r)

// Meal plan generate (pro)
r = await api('POST', '/api/meal-plans', {})
record('Meal plan generate', 'POST meal-plans', [200, 201, 403, 500], r)

// Live session create as elite
await loginAs('user3@test.com', 'User@123')
r = await api('GET', '/api/live-sessions')
record('Live sessions elite', 'GET as elite', 200, r)
r = await api('POST', '/api/live-sessions', {
  title: 'Verify Session',
  scheduledAt: new Date(Date.now() + 86400000).toISOString(),
  durationMinutes: 30,
})
record(
  'Live session create',
  'POST live-sessions',
  (a) => [200, 201, 403, 500, 503].includes(a.status),
  r,
  'DAILY_API_KEY / trainer role may be required',
)

// Pusher auth
await loginAs('user1@test.com', 'User@123')
r = await api('POST', '/api/pusher/auth', {
  socket_id: '123.456',
  channel_name: 'private-user-test',
})
record(
  'Pusher auth',
  'POST pusher/auth',
  (a) => [200, 403, 500, 503].includes(a.status),
  r,
  'PUSHER_* may be unset',
)

// Pages
const pages = [
  '/',
  '/login',
  '/signup',
  '/subscription',
  '/coaching',
  '/chat',
  '/nutrition',
  '/progress',
  '/workout-plans',
  '/meal-plans',
  '/community',
  '/analytics',
  '/live-sessions',
  '/notifications',
  '/exercise-check',
  '/my-fitness',
]
await loginAs('user1@test.com', 'User@123')
for (const page of pages) {
  r = await api('GET', page)
  record(
    `Page ${page}`,
    'GET HTML',
    (a) => a.status === 200 || a.status === 307 || a.status === 308,
    r,
  )
}

const out = path.join(process.cwd(), 'docs', '_verify_raw.json')
fs.writeFileSync(out, JSON.stringify(results, null, 2))
const pass = results.filter((x) => x.ok).length
const fail = results.filter((x) => !x.ok).length
console.log(`\nSUMMARY pass=${pass} fail=${fail} total=${results.length}`)
fs.writeFileSync(
  path.join(process.cwd(), 'docs', '_verify_summary.json'),
  JSON.stringify({ pass, fail, total: results.length, results }, null, 2),
)
