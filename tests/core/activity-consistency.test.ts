import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'
import { createToken } from '../../src/lib/auth'
import { awardWorkoutXp, awardXp } from '../../src/lib/gamification'
import GamificationProfile from '../../src/models/GamificationProfile'
import WorkoutLog from '../../src/models/WorkoutLog'
import MealLog from '../../src/models/MealLog'
import User from '../../src/models/User'
import Relationship from '../../src/models/Relationship'
import { namePattern, normalizedName } from '../../src/lib/unique-name'
import { distanceKm, locationFilter } from '../../src/lib/location'
import { POST as register } from '../../src/app/api/auth/register/route'
import { GET as foodSearch } from '../../src/app/api/nutrition/analyze/route'
import { PATCH as manageSubscription } from '../../src/app/api/subscription/route'
import { POST as logPlannedMeal } from '../../src/app/api/meal-plans/[id]/log/route'
import MealPlan from '../../src/models/MealPlan'
import Notification from '../../src/models/Notification'

const memberId = '000000000000000000000001'
const planId = '000000000000000000000002'
const originalEnv = { ...process.env }
afterEach(() => {
  mock.restoreAll()
  Object.assign(process.env, originalEnv)
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
  global.mongooseCache.conn = null
})

function chain(data: unknown) {
  const query = {
    select: () => query, sort: () => query, limit: () => query,
    lean: async () => data,
  }
  return query
}

function session(body: unknown, path = '/api/test', method = 'POST') {
  process.env.JWT_SECRET = 'activity-regression-fixture-only'
  process.env.PLAYWRIGHT_TEST = '1'
  global.mongooseCache.conn = mongoose
  return new NextRequest('http://localhost' + path, {
    method, headers: { 'Content-Type': 'application/json', authorization: 'Bearer ' + createToken({ userId: memberId, role: 'user', email: 'fixture@example.test' }) },
    body: JSON.stringify(body),
  })
}

function rewardsFixture() {
  const profile = { _id: memberId, userId: memberId, xp: 0, achievements: [], formCheckerSessions: 0, streakBonusXp: 0 }
  const keys = new Set<string>()
  mock.method(GamificationProfile, 'findOneAndUpdate', async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
    const key = (filter.rewardKeys as { $ne?: string } | undefined)?.$ne
    if (key && keys.has(key)) return null
    if (key) keys.add(key)
    const increments = update.$inc as { xp?: number; streakBonusXp?: number } | undefined
    profile.xp += increments?.xp || 0
    profile.streakBonusXp += increments?.streakBonusXp || 0
    return { ...profile }
  })
  mock.method(GamificationProfile, 'updateOne', async () => ({ modifiedCount: 0 }))
  mock.method(GamificationProfile, 'countDocuments', async () => 0)
  mock.method(WorkoutLog, 'find', () => chain([]))
  mock.method(WorkoutLog, 'countDocuments', async () => 0)
  mock.method(MealLog, 'find', () => chain([]))
  mock.method(User, 'findById', () => chain({ _id: memberId, role: 'user', isActive: true, currentWeight: 75, fitnessGoal: 'general_fitness' }))
  mock.method(Relationship, 'exists', async () => null)
  return { profile, keys }
}

test('workout rewards are awarded once across retries and concurrent calls', async () => {
  rewardsFixture()
  const results = await Promise.all([awardWorkoutXp(memberId, 'workout:one'), awardWorkoutXp(memberId, 'workout:one')])
  assert.equal(results.reduce((sum, result) => sum + result.xpAwarded, 0), 50)
  assert.equal(results[1].gamification.xp, 50)
})

test('meal reward retries return the same XP total without another award', async () => {
  rewardsFixture()
  const first = await awardXp(memberId, 15, 'meal:one')
  const retry = await awardXp(memberId, 15, 'meal:one')
  assert.equal(first.xp, 15)
  assert.equal(retry.xp, 15)
  assert.equal(retry.lastAwardedXp, 0)
})

test('name checks normalize case and spacing while treating regex characters literally', () => {
  assert.equal(normalizedName('  Mohsin-Fitness   Gym '), 'mohsin-fitness gym')
  assert.ok(namePattern('Mohsin-Fitness Gym').test(' MOHSIN-FITNESS   GYM '))
  assert.ok(namePattern('Coach [A]').test('Coach [A]'))
  assert.equal(namePattern('Coach [A]').test('Coach A'), false)
})

test('registration rejects a taken public name before creating the account', async () => {
  const request = session({ fullName: 'Existing Member', email: 'new@example.test', password: 'Strong@123', country: 'Pakistan' }, '/api/auth/register')
  mock.method(User, 'findOne', async () => null)
  mock.method(User, 'exists', async () => ({ _id: memberId }))
  const create = mock.method(User, 'create', async () => { throw new Error('Should not create') })
  const response = await register(request)
  assert.equal(response.status, 409)
  assert.match((await response.json()).message, /another username/)
  assert.equal(create.mock.callCount(), 0)
})

test('unknown food search never invents a generic 200 kcal result', async () => {
  delete process.env.SPOONACULAR_API_KEY
  const response = await foodSearch(new NextRequest('http://localhost/api/nutrition/analyze?query=unlisted-fixture-food'))
  assert.deepEqual((await response.json()).results, [])
})

test('distance filters validate coordinates and use kilometres', () => {
  assert.equal(distanceKm({ latitude: 31, longitude: 74 }, { latitude: 31, longitude: 74 }), 0)
  assert.ok(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) > 111)
  assert.ok('error' in locationFilter(new URLSearchParams('lat=91&lng=0&radius=10'))!)
  assert.equal(locationFilter(new URLSearchParams()), null)
})

test('members cancel at the paid term end without discarding their plan', async () => {
  const request = session({ action: 'cancel' }, '/api/subscription', 'PATCH')
  mock.method(User, 'findById', () => chain({ _id: memberId, role: 'user', email: 'fixture@example.test', subscription: { plan: 'pro', endDate: new Date(Date.now() + 86400000) } }))
  mock.method(Notification, 'create', async (payload: Record<string, unknown>) => ({
    ...payload, _id: planId, isRead: false, createdAt: new Date(), updatedAt: new Date(),
  }))
  const update = mock.method(User, 'updateOne', async () => ({}))
  const response = await manageSubscription(request)
  assert.equal(response.status, 200)
  assert.deepEqual(update.mock.calls[0].arguments[1], { $set: { 'subscription.cancelAtPeriodEnd': true } })
})

test('logging a plan uses exact saved serving macros and a stable daily request key', async () => {
  const request = session({ dayIndex: 0, mealIndex: 0 })
  rewardsFixture()
  mock.method(MealPlan, 'findOne', () => chain({ days: [{ meals: [{ mealType: 'lunch', name: 'Chicken bowl', calories: 616, protein: 40, carbs: 65, fat: 22 }] }] }))
  const saved: Record<string, unknown>[] = []
  mock.method(MealLog, 'findOneAndUpdate', async (_query: unknown, update: { $setOnInsert: Record<string, unknown> }) => {
    saved.push(update.$setOnInsert)
    return { _id: planId, toObject: () => update.$setOnInsert }
  })
  const response = await logPlannedMeal(request, { params: Promise.resolve({ id: planId }) })
  assert.equal(response.status, 201)
  assert.equal(saved[0].totalCalories, 616)
  assert.equal((saved[0].foods as Array<{ quantity: number }>)[0].quantity, 1)
  assert.match(String(saved[0].requestKey), /^plan:/)
})

test('signed renewal webhooks synchronize the authoritative paid period', async () => {
  const { getStripe } = await import('../../src/lib/stripe')
  const { POST: webhook } = await import('../../src/app/api/webhooks/stripe/route')
  session({})
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture_only'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fixture_only'
  const stripe = getStripe()
  const start = Math.floor(Date.now() / 1000)
  const end = start + 30 * 86400
  const subscription = {
    id: 'sub_fixture', customer: 'cus_fixture', created: start, start_date: start,
    status: 'active', cancel_at_period_end: false, metadata: { userId: memberId, plan: 'pro' },
    items: { data: [{ current_period_start: start, current_period_end: end }] },
  }
  mock.method(stripe.subscriptions, 'retrieve', async () => subscription)
  mock.method(User, 'findOne', () => chain({ _id: memberId, stripeSubscriptionId: 'sub_fixture', subscription: { plan: 'pro' } }))
  mock.method(User, 'findById', () => chain({ _id: memberId, role: 'user', email: 'fixture@example.test' }))
  const updates: Array<{ $set: { subscription: { plan: string; endDate: Date } } }> = []
  mock.method(User, 'findByIdAndUpdate', async (_id: unknown, update: { $set: { subscription: { plan: string; endDate: Date } } }) => {
    updates.push(update)
    return { _id: memberId, subscription: update.$set.subscription }
  })
  mock.method(Notification, 'findOneAndUpdate', async (_query: unknown, update: { $setOnInsert: Record<string, unknown> }) => ({
    ...update.$setOnInsert, _id: planId, isRead: false, createdAt: new Date(), updatedAt: new Date(),
  }))
  const payload = JSON.stringify({ id: 'evt_renewal', type: 'invoice.paid', data: { object: { parent: { subscription_details: { subscription: 'sub_fixture' } } } } })
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET })
  const response = await webhook(new NextRequest('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload }))
  assert.equal(response.status, 200)
  assert.equal(updates[0].$set.subscription.plan, 'pro')
  assert.equal(updates[0].$set.subscription.endDate.getTime(), end * 1000)
})

test('billing webhooks reject unsigned events', async () => {
  const { POST: webhook } = await import('../../src/app/api/webhooks/stripe/route')
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fixture_only'
  const response = await webhook(new NextRequest('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' }))
  assert.equal(response.status, 400)
})

test('trainer radius results exclude distant and unlocated profiles', async () => {
  session({})
  const Trainer = (await import('../../src/models/Trainer')).default
  const { GET } = await import('../../src/app/api/trainers/route')
  const rows = [
    { _id: planId, name: 'Nearby', gymId: { location: { coordinates: [74.35, 31.52] } } },
    { _id: memberId, name: 'Distant', gymId: { location: { coordinates: [67, 24] } } },
    { _id: '000000000000000000000003', name: 'Unknown' },
  ]
  const query = { select: () => query, limit: () => query, populate: () => query, lean: async () => rows }
  mock.method(Trainer, 'find', () => query)
  const response = await GET(new NextRequest('http://localhost/api/trainers?lat=31.52&lng=74.35&radius=2'))
  const body = await response.json()
  assert.equal(body.trainers.length, 1)
  assert.equal(body.trainers[0].name, 'Nearby')
  assert.equal(body.trainers[0].distanceKm, 0)
  assert.match(response.headers.get('cache-control')!, /private/)
})

test('gym registration rejects a duplicate gym name before starting a transaction', async () => {
  const { POST } = await import('../../src/app/api/auth/register-gym-owner/route')
  const Gym = (await import('../../src/models/Gym')).default
  const request = session({ fullName: 'New Owner', email: 'owner@example.test', password: 'Strong@123', gymName: 'Mohsin-Fitness Gym', gymAddress: 'Lahore', country: 'Pakistan' })
  mock.method(User, 'findOne', async () => null)
  mock.method(User, 'exists', async () => null)
  mock.method(Gym, 'exists', async () => ({ _id: planId }))
  const response = await POST(request)
  assert.equal(response.status, 409)
  assert.match((await response.json()).message, /gym name already exists/)
})

test('renewing an existing paid term preserves time before recurring billing starts', async () => {
  const { getStripe } = await import('../../src/lib/stripe')
  const { POST: checkout } = await import('../../src/app/api/subscription/route')
  const request = session({ plan: 'pro' }, '/api/subscription')
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture_only'
  delete process.env.STRIPE_PRO_PRICE_ID
  const endDate = new Date(Date.now() + 14 * 86400000)
  mock.method(User, 'findById', () => chain({
    _id: memberId, role: 'user', email: 'fixture@example.test',
    subscription: { plan: 'pro', status: 'active', endDate },
  }))
  let payload: Record<string, unknown> = {}
  mock.method(getStripe().checkout.sessions, 'create', async (input: Record<string, unknown>) => {
    payload = input
    return { id: 'cs_fixture', url: 'https://checkout.stripe.com/fixture' }
  })
  const response = await checkout(request)
  assert.equal(response.status, 200)
  assert.equal(payload.mode, 'subscription')
  assert.equal((payload.subscription_data as { trial_end: number }).trial_end, Math.floor(endDate.getTime() / 1000))
})
