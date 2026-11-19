import test, { afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'
import { createToken } from '../../src/lib/auth'
import { withDeadline } from '../../src/lib/with-deadline'
import User from '../../src/models/User'
import Gym from '../../src/models/Gym'
import GymReview from '../../src/models/GymReview'
import MealPlan from '../../src/models/MealPlan'
import { POST as chat } from '../../src/app/api/ai/chat/route'
import { POST as generateDiet } from '../../src/app/api/meal-plans/route'
import { POST as reviewGym } from '../../src/app/api/gyms/[slug]/reviews/route'
import { GET as preview } from '../../src/app/api/exercises/[id]/preview/route'

const memberId = '000000000000000000000001'
const gymId = '000000000000000000000002'
const savedEnv = { ...process.env }
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]
  Object.assign(process.env, savedEnv)
  global.mongooseCache.conn = null
})

function session(plan = 'elite', role = 'user') {
  process.env.JWT_SECRET = 'member-fixes-fixture-only'
  process.env.PLAYWRIGHT_TEST = '1'
  global.mongooseCache.conn = mongoose
  const member = { _id: memberId, fullName: 'Member', email: 'fixture@example.test', role, isActive: true, fitnessGoal: 'weight_loss', currentWeight: 80, targetWeight: 70, activityLevel: 'moderate', subscription: { plan, status: 'active' } }
  mock.method(User, 'findById', () => ({ select: () => ({ lean: async () => member }) }))
  return (path: string, body: unknown) => new NextRequest(`http://localhost${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', authorization: `Bearer ${createToken({ userId: memberId, role, email: member.email })}` }, body: JSON.stringify(body) })
}

test('optional work returns on deadline and handles late failures', async () => {
  assert.equal(await withDeadline(new Promise<null>(() => {}), 10, null), null)
  assert.equal(await withDeadline(Promise.reject(new Error('Offline')), 10, null), null)
})

test('chat still answers when an authenticated member profile cannot be read', async () => {
  const request = session()
  delete process.env.GEMINI_API_KEY
  mock.method(User, 'findById', () => { throw new Error('Database unavailable') })
  const response = await chat(request('/api/ai/chat', { message: 'How do I gain muscle?', history: [] }))
  assert.equal(response.status, 200)
  assert.match((await response.json()).reply, /surplus/i)
})

test('chat has formatted fallback guidance when its AI provider fails', async () => {
  const request = session()
  process.env.GEMINI_API_KEY = 'fixture-only'
  mock.method(globalThis, 'fetch', async () => { throw new Error('Provider unavailable') })
  const response = await chat(request('/api/ai/chat', { message: 'How do I lose fat?', history: [] }))
  assert.equal(response.status, 200)
  assert.match((await response.json()).reply, /## Fitness Guidance/)
})

for (const plan of ['pro', 'elite']) test(`${plan}: a seven-day diet plan saves and activates without an AI key`, async () => {
  const request = session(plan)
  delete process.env.GEMINI_API_KEY
  const calls: string[] = []
  mock.method(MealPlan, 'create', async (payload: Record<string, unknown>) => {
    assert.equal(new MealPlan(payload).validateSync(), undefined)
    calls.push('create')
    return { _id: gymId, ...payload }
  })
  mock.method(MealPlan, 'updateMany', async (filter: Record<string, unknown>) => {
    assert.deepEqual(filter._id, { $ne: gymId })
    calls.push('archive')
    return {}
  })
  const response = await generateDiet(request('/api/meal-plans', {}))
  assert.equal(response.status, 201)
  const result = await response.json()
  assert.equal(result.goal, 'weight_loss')
  assert.equal(result.days.length, 7)
  assert.ok(result.days.every((day: { meals: unknown[] }) => day.meals.length === 4))
  assert.equal(result.status, 'active')
  assert.deepEqual(calls, ['create', 'archive'])
})

test('basic members cannot generate paid diet plans', async () => {
  const request = session('basic')
  const response = await generateDiet(request('/api/meal-plans', {}))
  assert.equal(response.status, 403)
})

test('failed diet creation preserves the current active plan', async () => {
  const request = session()
  mock.method(MealPlan, 'create', async () => { throw new Error('Write failed') })
  const archive = mock.method(MealPlan, 'updateMany', async () => ({}))
  assert.equal((await generateDiet(request('/api/meal-plans', {}))).status, 500)
  assert.equal(archive.mock.callCount(), 0)
})

test('members can rate a registered gym and update its public rating', async () => {
  const request = session()
  mock.method(Gym, 'findOne', () => ({ lean: async () => ({ _id: new mongoose.Types.ObjectId(gymId), ownerId: 'another-user' }) }))
  mock.method(GymReview, 'create', async (payload: object) => ({ _id: gymId, createdAt: new Date(), ...payload }))
  mock.method(GymReview, 'aggregate', async () => [{ rating: 4, count: 1 }])
  const update = mock.method(Gym, 'updateOne', async () => ({}))
  const response = await reviewGym(request('/api/gyms/fixture/reviews', { rating: 4, comment: 'Clean equipment and friendly helpful staff.' }), { params: Promise.resolve({ slug: 'fixture' }) })
  assert.equal(response.status, 201)
  assert.equal((await response.json()).averageRating, 4)
  assert.equal(update.mock.callCount(), 1)
})

test('gym reviews reject guests, non-member roles, and out-of-range ratings', async () => {
  const guest = new NextRequest('http://localhost/api/gyms/fixture/reviews', { method: 'POST' })
  const params = { params: Promise.resolve({ slug: 'fixture' }) }
  assert.equal((await reviewGym(guest, params)).status, 401)
  const ownerRequest = session('elite', 'gym_owner')
  assert.equal((await reviewGym(ownerRequest('/api/gyms/fixture/reviews', {}), params)).status, 403)
  mock.restoreAll()
  const memberRequest = session()
  assert.equal((await reviewGym(memberRequest('/api/gyms/fixture/reviews', { rating: 8, comment: 'A detailed experience with this gym.' }), params)).status, 400)
})

test('preview fallback streams catalog GIFs and never proxies arbitrary URLs', async () => {
  const remote = mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array([71, 73, 70, 56]), { headers: { 'Content-Type': 'image/gif' } }))
  const response = await preview(new NextRequest('http://localhost'), { params: Promise.resolve({ id: '01qpYSe' }) })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/gif')
  assert.match(response.headers.get('cache-control')!, /public/)
  assert.equal((await preview(new NextRequest('http://localhost'), { params: Promise.resolve({ id: 'https://private.test' }) })).status, 404)
  assert.equal(remote.mock.callCount(), 1)
})
