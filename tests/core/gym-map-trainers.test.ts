import test, { afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { gymMapSource, COMSATS_LAHORE } from '../../src/lib/gym-map'
import { withGymTrainers } from '../../src/lib/gym-trainers'
import Trainer from '../../src/models/Trainer'
import { PREVIEW_GYMS } from '../../src/lib/gyms'

afterEach(() => mock.restoreAll())
test('neutral gym maps show COMSATS Lahore without a selected gym or search marker', () => {
  const url = new URL(gymMapSource(null, null))
  assert.equal(url.searchParams.get('ll'), COMSATS_LAHORE.latitude + ',' + COMSATS_LAHORE.longitude)
  assert.equal(url.searchParams.has('q'), false)
})
test('nearby map uses the current coordinates independently of external listing results', () => {
  const url = new URL(gymMapSource(null, { latitude: 24.86, longitude: 67.01 }))
  assert.equal(url.searchParams.get('q'), 'gyms near 24.86,67.01')
  assert.equal(url.searchParams.get('ll'), '24.86,67.01')
})
test('explicit gym selection uses that gym and clearing returns to nearby search', () => {
  const center = { latitude: 31.4, longitude: 74.2 }
  assert.equal(new URL(gymMapSource(PREVIEW_GYMS[0], center)).searchParams.get('q'), PREVIEW_GYMS[0].location!.latitude + ',' + PREVIEW_GYMS[0].location!.longitude)
  assert.equal(new URL(gymMapSource(null, center)).searchParams.get('q'), 'gyms near 31.4,74.2')
})
test('keyed neutral embeds use view mode instead of selecting a business', () => {
  const url = new URL(gymMapSource(null, null, 'fixture-key'))
  assert.equal(url.pathname, '/maps/embed/v1/view')
  assert.equal(url.searchParams.get('center'), COMSATS_LAHORE.latitude + ',' + COMSATS_LAHORE.longitude)
})

test('keyed nearby map explicitly centres on the user, not a registered business', () => {
  const center = { latitude: 24.86, longitude: 67.01 }
  const url = new URL(gymMapSource(null, center, 'fixture-key', 2))
  assert.equal(url.searchParams.get('center'), '24.86,67.01')
  assert.equal(url.searchParams.get('q'), 'gyms')
  const wider = new URL(gymMapSource(null, center, 'fixture-key', 25))
  assert.ok(Number(url.searchParams.get('zoom')) > Number(wider.searchParams.get('zoom')))
})

test('key-free map keeps search origin and viewport at the browser coordinates', () => {
  const url = new URL(gymMapSource(null, { latitude: 31.4, longitude: 74.2 }, undefined, 5))
  assert.equal(url.searchParams.get('sll'), '31.4,74.2')
  assert.equal(url.searchParams.get('ll'), '31.4,74.2')
  const wider = new URL(gymMapSource(null, { latitude: 31.4, longitude: 74.2 }, undefined, 50))
  assert.ok(Number(url.searchParams.get('z')) > Number(wider.searchParams.get('z')))
})
test('gym rosters use current approved public trainers and never expose private fields or stale counts', async () => {
  mock.method(Trainer, 'find', (filter: Record<string, unknown>) => {
    assert.equal(filter.gymVerificationStatus, 'approved')
    assert.equal(filter.isFullyVerified, true)
    assert.equal(filter.isActive, true)
    return { select: (fields: string) => {
      assert.doesNotMatch(fields, /email|userId/)
      return { sort: () => ({ lean: async () => [{ _id: '000000000000000000000003', gymId: 'gym-a', name: 'Gym Coach', specialty: ['Strength'], email: 'private@example.test', userId: 'private-user-id' }] }) }
    } }
  })
  const results = await withGymTrainers([{ ...PREVIEW_GYMS[0], id: 'gym-a', trainersCount: 99 }, { ...PREVIEW_GYMS[1], id: 'gym-b' }])
  assert.equal(results[0].trainersCount, 1)
  assert.equal(results[0].trainers?.[0].name, 'Gym Coach')
  assert.match(results[0].trainers?.[0].slug || '', /gym-coach/)
  assert.equal(results[1].trainersCount, 0)
  assert.doesNotMatch(JSON.stringify(results), /private@example.test|private-user-id/)
})
