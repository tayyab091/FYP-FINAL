import test, { afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import User from '../../src/models/User'
import { addMonths } from '../../src/lib/calendar'
import { createToken, verifyToken } from '../../src/lib/auth'
import { resolveSubscriptionFromUser } from '../../src/lib/subscription'
import { getStripe, isStripeConfigured, canSimulatePayments } from '../../src/lib/stripe'
import { parseJsonBody, profileUpdateSchema, trainerAvailabilitySchema, aiPlanRequestSchema, mealPlanUpdateSchema } from '../../src/lib/validation'
import { setCached } from '../../src/lib/server-cache'
import { GET as exercisesGET } from '../../src/app/api/exercises/route'
import { POST as checkoutPOST } from '../../src/app/api/subscription/route'
import { activateUserPlan } from '../../src/lib/subscription-server'
import WorkoutLog from '../../src/models/WorkoutLog'
import { PUT as completeWorkout } from '../../src/app/api/tracking/logs/[id]/complete/route'
import { PATCH as editWorkout } from '../../src/app/api/tracking/logs/[id]/route'
import { POST as generatePlan } from '../../src/app/api/ai/generate-plan/route'

const originalEnv = { ...process.env }
const memberId = '000000000000000000000001'
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
  Object.assign(process.env, originalEnv)
  global.mongooseCache.conn = null
})

function authenticatedRequest(body: string, role = 'user') {
  process.env.JWT_SECRET = 'regression-test-secret-only'
  global.mongooseCache.conn = mongoose
  mock.method(User, 'findById', () => ({ select: () => ({ lean: async () => ({ _id: memberId, role, email: 'test@example.test', isActive: true }) }) }))
  return new NextRequest('http://localhost/api/subscription', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${createToken({ userId: memberId, role, email: 'test@example.test' })}` }, body,
  })
}

test('calendar month terms clamp month ends and retain UTC time', () => {
  assert.equal(addMonths(new Date('2026-01-31T12:30:00Z'), 1).toISOString(), '2026-02-28T12:30:00.000Z')
  assert.equal(addMonths(new Date('2028-01-31T12:30:00Z'), 1).toISOString(), '2028-02-29T12:30:00.000Z')
  assert.equal(addMonths(new Date('2026-12-31T12:30:00Z'), 1).toISOString(), '2027-01-31T12:30:00.000Z')
})

for (const subscription of [
  { plan: 'elite', status: 'inactive', endDate: new Date('2099-01-01') },
  { plan: 'pro', status: 'active', endDate: new Date('2020-01-01') },
  { plan: 'pro', status: 'active', endDate: new Date('invalid') },
]) test(`paid gates fail closed: ${subscription.status}, ${subscription.endDate}`, () => {
  assert.equal(resolveSubscriptionFromUser({ subscription }).plan, 'basic')
})

test('active paid membership retains access', () => {
  assert.equal(resolveSubscriptionFromUser({ subscription: { plan: 'pro', status: 'active', endDate: new Date('2099-01-01') } }).plan, 'pro')
})

test('JWT rejects invalid identity payloads and unexpected signing algorithms', () => {
  process.env.JWT_SECRET = 'regression-test-secret-only'
  const payload = { userId: memberId, role: 'user', email: 'test@example.test' }
  assert.equal(verifyToken(createToken(payload))?.userId, memberId)
  assert.equal(verifyToken(jwt.sign({ ...payload, userId: { $ne: null } }, process.env.JWT_SECRET)), null)
  assert.equal(verifyToken(jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS384' })), null)
})

test('account recovery secrets are excluded from default database projections', () => {
  for (const field of ['resetPasswordToken', 'resetPasswordExpires', 'verifyEmailToken', 'verifyEmailExpires']) {
    assert.equal(User.schema.path(field).options.select, false)
  }
})

test('profile validation rejects unsupported activity levels before database writes', async () => {
  const result = await parseJsonBody(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ fullName: 'Test User', activityLevel: 'unsupported' }) }), profileUpdateSchema)
  assert.ok('error' in result)
  assert.equal(result.error.status, 400)
})

test('hosted Stripe checkout requires only the server key; production never simulates', () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture'
  delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  assert.equal(isStripeConfigured(), true)
  assert.equal(canSimulatePayments(), false)
  delete process.env.STRIPE_SECRET_KEY
  Object.assign(process.env, { NODE_ENV: 'production' })
  assert.equal(canSimulatePayments(), false)
  Object.assign(process.env, { NODE_ENV: 'development' })
  assert.equal(canSimulatePayments(), true)
})

test('checkout rejects malformed JSON and non-member accounts', async () => {
  const badBody = await checkoutPOST(authenticatedRequest('{'))
  assert.equal(badBody.status, 400)
  mock.restoreAll()
  const trainer = await checkoutPOST(authenticatedRequest('{"plan":"pro"}', 'trainer'))
  assert.equal(trainer.status, 403)
})

for (const withPrice of [false, true]) test(`Stripe failure cannot grant a free plan (configured price: ${withPrice})`, async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture'
  delete process.env.STRIPE_PRO_PRICE_ID
  if (withPrice) process.env.STRIPE_PRO_PRICE_ID = 'price_fixture'
  const req = authenticatedRequest('{"plan":"pro"}')
  const write = mock.method(User, 'findByIdAndUpdate', async () => { throw new Error('Unexpected subscription write') })
  mock.method(getStripe().checkout.sessions, 'create', async () => { throw new Error('Test payment provider failure') })
  mock.method(console, 'error', () => {})
  const response = await checkoutPOST(req)
  assert.equal(response.status, 502)
  assert.equal(write.mock.callCount(), 0)
})

test('production without payment credentials cannot grant a paid plan', async () => {
  Object.assign(process.env, { NODE_ENV: 'production' })
  delete process.env.STRIPE_SECRET_KEY
  const response = await checkoutPOST(authenticatedRequest('{"plan":"elite"}'))
  assert.equal(response.status, 503)
})

test('payment replay uses an atomic chronological guard and a payment-anchored expiry', async () => {
  const created = Math.floor(Date.now() / 1000)
  const existing = { subscription: { plan: 'elite' } }
  mock.method(User, 'findById', () => ({ select: async () => existing }))
  const update = mock.method(User, 'findOneAndUpdate', () => ({ select: async () => null }))
  assert.equal(await activateUserPlan(memberId, 'pro', { id: 'cs_replay', created }), existing)
  const [filter, values] = update.mock.calls[0].arguments as unknown as [Record<string, unknown>, { subscription: { endDate: Date } }]
  assert.deepEqual(filter.$or, [{ lastStripeCheckoutCreatedAt: { $exists: false } }, { lastStripeCheckoutCreatedAt: { $lt: new Date(created * 1000) } }])
  assert.equal(values.subscription.endDate.toISOString(), addMonths(new Date(created * 1000), 1).toISOString())
})

test('metadata does not change exercise page size or skip exercises', async () => {
  const exercises = Array.from({ length: 80 }, (_, i) => ({ id: String(i), name: `Exercise ${i}`, muscle: 'Legs', equipment: 'Bodyweight', bodyParts: ['legs'], targetMuscles: ['quads'] }))
  setCached('exercise-catalog-v5', { exercises, meta: { total: 80 } }, 60_000)
  const first = await (await exercisesGET(new NextRequest('http://localhost/api/exercises?meta=true&limit=36&page=1'))).json()
  const second = await (await exercisesGET(new NextRequest('http://localhost/api/exercises?meta=true&limit=36&page=2'))).json()
  assert.equal(first.exercises.length, 36)
  assert.equal(second.page, 2)
  assert.equal(second.exercises[0].id, '36')
  assert.equal(new Set([...first.exercises, ...second.exercises].map((e: { id: string }) => e.id)).size, 72)
  const empty = await (await exercisesGET(new NextRequest('http://localhost/api/exercises?search=does-not-exist'))).json()
  assert.deepEqual(empty.exercises, [])
})

test('a cancelled workout cannot be completed and awarded XP', async () => {
  const req = authenticatedRequest('{"exercises":[]}')
  mock.method(WorkoutLog, 'countDocuments', async () => 0)
  const update = mock.method(WorkoutLog, 'findOneAndUpdate', async () => null)
  mock.method(WorkoutLog, 'findOne', () => ({ select: () => ({ lean: async () => ({ status: 'skipped' }) }) }))
  const response = await completeWorkout(req, { params: Promise.resolve({ id: memberId }) })
  assert.equal(response.status, 400)
  const [filter] = update.mock.calls[0].arguments as unknown as [{ status: string }]
  assert.equal(filter.status, 'in_progress')
  assert.match((await response.json()).message, /in-progress/)
})

test('checklist edits racing with completion return a conflict instead of overwriting it', async () => {
  const req = authenticatedRequest('{"exerciseIndex":0,"completed":true}')
  mock.method(WorkoutLog, 'findOne', async () => ({ _id: memberId, status: 'in_progress', exercises: [{ completed: false }] }))
  const update = mock.method(WorkoutLog, 'findOneAndUpdate', async () => null)
  const response = await editWorkout(req, { params: Promise.resolve({ id: memberId }) })
  assert.equal(response.status, 409)
  const [filter, values] = update.mock.calls[0].arguments as unknown as [{ status: string }, { $set: Record<string, boolean> }]
  assert.equal(filter.status, 'in_progress')
  assert.deepEqual(values.$set, { 'exercises.0.completed': true })
})

test('availability rejects invalid weekdays, times, reversed slots and timezone', () => {
  const slot = { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }
  assert.equal(trainerAvailabilitySchema.safeParse({ slots: [slot] }).success, true)
  for (const invalid of [{ ...slot, dayOfWeek: 7 }, { ...slot, startTime: '99:00' }, { ...slot, endTime: '08:00' }]) {
    assert.equal(trainerAvailabilitySchema.safeParse({ slots: [invalid] }).success, false)
  }
  assert.equal(trainerAvailabilitySchema.safeParse({ slots: [slot], timezone: 'not/a/timezone' }).success, false)
})

test('plan inputs reject oversized schedules and malformed nested meal data', () => {
  assert.equal(aiPlanRequestSchema.safeParse({ daysPerWeek: 8 }).success, false)
  assert.equal(aiPlanRequestSchema.safeParse({ daysPerWeek: '3' }).success, true)
  assert.equal(mealPlanUpdateSchema.safeParse({ days: [null] }).success, false)
  assert.equal(mealPlanUpdateSchema.safeParse({ days: [{ day: 'Monday', meals: [{ name: 'Food', mealType: 'lunch', calories: -1 }] }] }).success, false)
})

test('offline workout generation honors requested days and available equipment', async () => {
  delete process.env.GEMINI_API_KEY
  const response = await generatePlan(authenticatedRequest('{"daysPerWeek":"3","equipment":"Bodyweight Only","fitnessLevel":"beginner"}'))
  assert.equal(response.status, 200)
  const { plan, generated } = await response.json()
  assert.equal(generated, false)
  assert.equal(plan.weeklySchedule.length, 7)
  const active = plan.weeklySchedule.filter((day: { isRestDay: boolean }) => !day.isRestDay)
  assert.equal(active.length, 3)
  assert.equal(active[0].exercises[0].sets, 2)
  assert.doesNotMatch(JSON.stringify(active), /barbell|dumbbell|machine/i)
})

test('AI provider outage falls back to a local plan', async () => {
  process.env.GEMINI_API_KEY = 'fixture-key'
  mock.method(globalThis, 'fetch', async () => { throw new Error('Provider offline') })
  const response = await generatePlan(authenticatedRequest('{"daysPerWeek":2}'))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).generated, false)
})
