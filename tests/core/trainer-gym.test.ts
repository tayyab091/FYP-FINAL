import test, { afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'
import { createToken } from '../../src/lib/auth'
import User from '../../src/models/User'
import Trainer from '../../src/models/Trainer'
import Gym from '../../src/models/Gym'
import { GET } from '../../src/app/api/trainers/my-gym/route'

const originalEnv = { ...process.env }
const userId = '000000000000000000000001'
const gymId = '000000000000000000000002'
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
  Object.assign(process.env, originalEnv)
  global.mongooseCache.conn = null
})
function request(role = 'trainer') {
  process.env.JWT_SECRET = 'gym-affiliation-test-key'
  process.env.PLAYWRIGHT_TEST = '1'
  global.mongooseCache.conn = mongoose
  mock.method(User, 'findById', () => ({ select: () => ({ lean: async () => ({ _id: userId, role, email: 'fixture@example.test', isActive: true }) }) }))
  return new NextRequest('http://localhost/api/trainers/my-gym?gymId=unrelated-gym', { headers: { Authorization: 'Bearer ' + createToken({ userId, role, email: 'fixture@example.test' }) } })
}
function trainerRow(row: unknown) {
  return mock.method(Trainer, 'findOne', (filter: unknown) => {
    assert.deepEqual(filter, { userId })
    return { select: () => ({ lean: async () => row }) }
  })
}

test('trainer gym details reject guests before querying a profile', async () => {
  const lookup = mock.method(Trainer, 'findOne', () => { throw new Error('Should not query') })
  assert.equal((await GET(new NextRequest('http://localhost/api/trainers/my-gym'))).status, 401)
  assert.equal(lookup.mock.callCount(), 0)
})

for (const role of ['user', 'admin', 'gym_owner']) test(`${role} cannot read trainer affiliation through this endpoint`, async () => {
  const req = request(role)
  const lookup = mock.method(Trainer, 'findOne', () => { throw new Error('Should not query') })
  assert.equal((await GET(req)).status, 403)
  assert.equal(lookup.mock.callCount(), 0)
})

test('only the signed-in trainer saved gym is returned, with no owner or internal data', async () => {
  const req = request()
  trainerRow({ gymId, gymName: 'Connected Gym', gymVerificationStatus: 'approved', adminVerificationStatus: 'approved', isFullyVerified: true })
  mock.method(Gym, 'findById', (id: unknown) => {
    assert.equal(id, gymId)
    return { select: () => ({ lean: async () => ({ _id: gymId, name: 'Connected Gym', address: 'Public gym address', city: 'Lahore', ownerId: 'private-owner-id', privateNote: 'private-gym-note', verificationStatus: 'verified', facilities: ['Free weights'], trainers: ['trainer-a'], rating: 4, reviewsCount: 2 }) }) }
  })
  const response = await GET(req)
  const data = await response.json()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(data.gym.id, gymId)
  assert.equal(data.gym.trainersCount, 1)
  assert.deepEqual(data.gym.facilities, ['Free weights'])
  assert.equal(data.connection.gymApproval, 'approved')
  assert.doesNotMatch(JSON.stringify(data), /private-owner-id|private-gym-note|unrelated-gym/)
})

test('an unlinked trainer gets an empty connection without guessing by gym name', async () => {
  const req = request()
  trainerRow({ gymName: 'Requested name', gymVerificationStatus: 'pending' })
  const lookup = mock.method(Gym, 'findById', () => { throw new Error('No gym ID') })
  const response = await GET(req)
  const data = await response.json()
  assert.equal(response.status, 200)
  assert.equal(data.gym, null)
  assert.equal(data.connection.gymName, 'Requested name')
  assert.equal(data.connection.gymApproval, 'pending')
  assert.equal(lookup.mock.callCount(), 0)
})

test('a deleted gym does not fail the trainer workspace', async () => {
  const req = request()
  trainerRow({ gymId, gymVerificationStatus: 'pending' })
  mock.method(Gym, 'findById', () => ({ select: () => ({ lean: async () => null }) }))
  const response = await GET(req)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).gym, null)
})

test('missing trainer profiles have an explicit not-found response', async () => {
  const req = request()
  trainerRow(null)
  assert.equal((await GET(req)).status, 404)
})

test('database failures return a safe error without internal details', async () => {
  const req = request()
  mock.method(Trainer, 'findOne', () => { throw new Error('Private connection error') })
  const response = await GET(req)
  assert.equal(response.status, 500)
  assert.doesNotMatch(JSON.stringify(await response.json()), /Private connection error/)
})
