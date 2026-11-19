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
import WorkoutPlan from '../../src/models/WorkoutPlan'
import { GET as getMyPlan } from '../../src/app/api/tracking/plans/my-plan/route'
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

test('member plan selection prioritizes an active plan over a newer draft', async () => {
  const request = session()
  mock.method(WorkoutPlan, 'findOne', (filter: Record<string, unknown>) => {
    assert.deepEqual(filter.status, { $in: ['active', 'draft'] })
    return { sort: (sort: Record<string, number>) => {
      const candidates = [
        { title: 'Newer draft', status: 'draft', updatedAt: 200 },
        { title: 'Trainer plan', status: 'active', updatedAt: 100 },
      ]
      candidates.sort((a, b) => {
        for (const [key, direction] of Object.entries(sort)) {
          const left = a[key as keyof typeof a]
          const right = b[key as keyof typeof b]
          if (left !== right) return (left < right ? -1 : 1) * direction
        }
        return 0
      })
      return { lean: async () => candidates[0] }
    } }
  })
  const response = await getMyPlan(request('/api/tracking/plans/my-plan', {}))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).plan.title, 'Trainer plan')
})

test('chat still answers when an authenticated member profile cannot be read', async () => {
  const request = session()
  delete process.env.GEMINI_API_KEY
  mock.method(User, 'findById', () => { throw new Error('Database unavailable') })
  process.env.OPENROUTER_API_KEY = 'fixture-openrouter'
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.CLAUDE_API_KEY
  mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: '## Training\n\nUse a modest surplus.' } }] }))
  const response = await chat(request('/api/ai/chat', { message: 'How do I gain muscle?', history: [] }))
  assert.equal(response.status, 200)
  assert.match((await response.json()).reply, /surplus/i)
})

test('chat returns a retryable error when its AI providers fail', async () => {
  const request = session()
  process.env.GEMINI_API_KEY = 'fixture-only'
  mock.method(globalThis, 'fetch', async () => { throw new Error('Provider unavailable') })
  const response = await chat(request('/api/ai/chat', { message: 'How do I lose fat?', history: [] }))
  assert.equal(response.status, 503)
  assert.equal((await response.json()).source, 'unavailable')
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

test('anonymous gym reviews persist privacy and hide the author in their response', async () => {
  const request = session()
  mock.method(Gym, 'findOne', () => ({ lean: async () => ({ _id: new mongoose.Types.ObjectId(gymId), ownerId: 'another-user' }) }))
  mock.method(GymReview, 'create', async (payload: Record<string, unknown>) => {
    assert.equal(payload.anonymous, true)
    assert.equal(payload.userId, memberId)
    return { _id: gymId, createdAt: new Date(), ...payload }
  })
  mock.method(GymReview, 'aggregate', async () => [{ rating: 5, count: 1 }])
  mock.method(Gym, 'updateOne', async () => ({}))
  const response = await reviewGym(request('/api/gyms/fixture/reviews', { rating: 5, comment: 'Clean equipment and friendly helpful staff.', anonymous: true }), { params: Promise.resolve({ slug: 'fixture' }) })
  assert.equal(response.status, 201)
  const body = await response.json()
  assert.equal(body.review.authorName, 'Anonymous member')
  assert.equal(body.review.userId, undefined)
})

test('exercise links preserve case-sensitive identifiers and support legacy IDs', async () => {
  const { exerciseDetailPath, exerciseIdFromPath } = await import('../../src/lib/exercise-slug')
  const exercise = { id: '01qpYSe', name: 'Barbell Bench Press' }
  assert.equal(exerciseDetailPath(exercise), '/exercises/barbell-bench-press--01qpYSe')
  assert.equal(exerciseIdFromPath('barbell-bench-press--01qpYSe'), exercise.id)
  assert.equal(exerciseIdFromPath(exercise.id), exercise.id)
})
