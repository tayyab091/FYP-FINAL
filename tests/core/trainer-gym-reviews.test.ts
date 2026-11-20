import test, { afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'
import { createToken } from '../../src/lib/auth'
import User from '../../src/models/User'
import Trainer from '../../src/models/Trainer'
import Gym from '../../src/models/Gym'
import GymReview from '../../src/models/GymReview'
import { POST } from '../../src/app/api/gyms/[slug]/reviews/route'

const savedEnv = { ...process.env }
const userId = '000000000000000000000001'
const gymId = new mongoose.Types.ObjectId('000000000000000000000002')
const params = { params: Promise.resolve({ slug: 'connected-gym' }) }
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]
  Object.assign(process.env, savedEnv)
  global.mongooseCache.conn = null
})
function request(ownerId = 'another-owner') {
  process.env.JWT_SECRET = 'trainer-review-fixture-key'
  process.env.PLAYWRIGHT_TEST = '1'
  global.mongooseCache.conn = mongoose
  mock.method(User, 'findById', () => ({ select: () => ({ lean: async () => ({ _id: userId, role: 'trainer', email: 'fixture@example.test', fullName: 'Trainer', notificationPreferences: { connectionRequests: false } }) }) }))
  mock.method(Gym, 'findOne', () => ({ lean: async () => ({ _id: gymId, ownerId }) }))
  return new NextRequest('http://localhost/api/gyms/connected-gym/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', authorization: 'Bearer ' + createToken({ userId, role: 'trainer', email: 'fixture@example.test' }) }, body: JSON.stringify({ rating: 4, comment: 'Well maintained equipment and coaching space.', anonymous: true }) })
}

test('approved connected trainers can review their gym once and update its aggregate rating', async () => {
  const req = request()
  mock.method(Trainer, 'exists', async (filter: unknown) => { assert.deepEqual(filter, { userId, gymId, gymVerificationStatus: 'approved' }); return { _id: userId } })
  mock.method(GymReview, 'create', async (payload: Record<string, unknown>) => { assert.equal(payload.anonymous, true); return { _id: gymId, createdAt: new Date(), ...payload } })
  mock.method(GymReview, 'aggregate', async () => [{ rating: 4, count: 1 }])
  const update = mock.method(Gym, 'updateOne', async () => ({}))
  const response = await POST(req, params)
  const data = await response.json()
  assert.equal(response.status, 201)
  assert.equal(data.averageRating, 4)
  assert.equal(update.mock.callCount(), 1)
  assert.equal(data.review.userId, undefined)
  assert.doesNotMatch(data.review.authorName, /Trainer/)
})
test('unconnected or pending trainers cannot write gym reviews', async () => {
  const req = request()
  mock.method(Trainer, 'exists', async (filter: { gymVerificationStatus: string }) => { assert.equal(filter.gymVerificationStatus, 'approved'); return null })
  const create = mock.method(GymReview, 'create', async () => { throw new Error('Must not write') })
  assert.equal((await POST(req, params)).status, 403)
  assert.equal(create.mock.callCount(), 0)
})
test('trainer role cannot bypass the own-gym review restriction', async () => {
  const req = request(userId)
  const create = mock.method(GymReview, 'create', async () => { throw new Error('Must not write') })
  assert.equal((await POST(req, params)).status, 403)
  assert.equal(create.mock.callCount(), 0)
})
test('duplicate trainer gym reviews retain the existing one-review limit', async () => {
  const req = request()
  mock.method(Trainer, 'exists', async () => ({ _id: userId }))
  mock.method(GymReview, 'create', async () => { throw Object.assign(new Error('Duplicate'), { code: 11000 }) })
  assert.equal((await POST(req, params)).status, 409)
})
