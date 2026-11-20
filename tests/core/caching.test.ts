import test, { afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { QueryClient } from '@tanstack/react-query'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'
import { fetchPublicData, clearPrivateQueries } from '../../src/lib/public-data-cache'
import { getCached, getOrFetch, setCached } from '../../src/lib/server-cache'
import Trainer from '../../src/models/Trainer'
import Gym from '../../src/models/Gym'
import { GET as trainers } from '../../src/app/api/trainers/route'
import { GET as gyms } from '../../src/app/api/gyms/route'

const clients: QueryClient[] = []
function client() {
  const cache = new QueryClient()
  clients.push(cache)
  return cache
}
afterEach(() => {
  mock.restoreAll()
  clients.splice(0).forEach(cache => cache.clear())
  global.mongooseCache.conn = null
})

test('server cache combines concurrent work, expires entries, and retries failures', async () => {
  let now = 1000
  mock.method(Date, 'now', () => now)
  let calls = 0
  const fetcher = async () => ({ value: ++calls })
  const [first, shared] = await Promise.all([getOrFetch('test:dedup', 50, fetcher), getOrFetch('test:dedup', 50, fetcher)])
  assert.equal(first, shared)
  assert.equal((await getOrFetch('test:dedup', 50, fetcher)).value, 1)
  now += 50
  assert.equal((await getOrFetch('test:dedup', 50, fetcher)).value, 2)
  await assert.rejects(getOrFetch('test:failure', 50, async () => { throw new Error('Offline') }))
  assert.equal(await getOrFetch('test:failure', 50, async () => 'recovered'), 'recovered')
})

test('server cache bounds memory and preserves recently used entries', () => {
  for (let index = 0; index < 256; index++) setCached(`test:lru:${index}`, index, 60_000)
  assert.equal(getCached('test:lru:0'), 0)
  setCached('test:lru:256', 256, 60_000)
  assert.equal(getCached('test:lru:1'), null)
  assert.equal(getCached('test:lru:0'), 0)
})

test('public browser cache shares equivalent URLs and concurrent requests without credentials', async () => {
  const cache = client()
  const remote = mock.method(globalThis, 'fetch', async (_url: unknown, options?: RequestInit) => {
    assert.equal(options?.credentials, 'omit')
    return Response.json({ exercises: [{ id: 'one' }] })
  })
  const [first, second] = await Promise.all([
    fetchPublicData(cache, '/api/exercises?page=1&limit=24'),
    fetchPublicData(cache, '/api/exercises?limit=24&page=1'),
  ])
  assert.deepEqual(first, second)
  await fetchPublicData(cache, '/api/exercises?page=1&limit=24')
  assert.equal(remote.mock.callCount(), 1)
  await fetchPublicData(cache, '/api/exercises?page=2&limit=24')
  assert.equal(remote.mock.callCount(), 2)
})

test('catalog entries refresh after five minutes and directories after thirty seconds', async () => {
  const cache = client()
  let now = 1000
  mock.method(Date, 'now', () => now)
  const remote = mock.method(globalThis, 'fetch', async () => Response.json({ entries: [] }))
  await fetchPublicData(cache, '/api/meals')
  await fetchPublicData(cache, '/api/gyms')
  now += 30_001
  await fetchPublicData(cache, '/api/meals')
  await fetchPublicData(cache, '/api/gyms')
  assert.equal(remote.mock.callCount(), 3)
  now += 5 * 60_000
  await fetchPublicData(cache, '/api/meals')
  assert.equal(remote.mock.callCount(), 4)
})

test('failed public requests do not poison later retries', async () => {
  const cache = client()
  let attempts = 0
  mock.method(globalThis, 'fetch', async () => ++attempts === 1 ? Response.json({}, { status: 503 }) : Response.json({ meals: [] }))
  await assert.rejects(fetchPublicData(cache, '/api/meals?search=retry'))
  assert.deepEqual(await fetchPublicData(cache, '/api/meals?search=retry'), { meals: [] })
  assert.equal(attempts, 2)
})

test('private endpoints, locations, random results, and remote URLs cannot enter the public cache', async () => {
  const cache = client()
  const remote = mock.method(globalThis, 'fetch', async () => Response.json({}))
  for (const path of ['/api/auth/me', '/api/meal-plans', '/api/gym-owner/analytics', '/api/gyms/nearby?lat=1&lng=2', '/api/meals?random=2', 'https://example.com/api/exercises']) {
    await assert.rejects(fetchPublicData(cache, path), /Only public/)
  }
  assert.equal(remote.mock.callCount(), 0)
})

test('leaving one screen stops waiting immediately without cancelling another screen', { timeout: 1000 }, async () => {
  const cache = client()
  const controller = new AbortController()
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  const remote = mock.method(globalThis, 'fetch', async () => { await pending; return Response.json({ meals: [] }) })
  const leaving = fetchPublicData(cache, '/api/meals?category=shared', controller.signal)
  const staying = fetchPublicData(cache, '/api/meals?category=shared')
  const rejected = assert.rejects(leaving, { name: 'AbortError' })
  controller.abort()
  await rejected
  release()
  assert.deepEqual(await staying, { meals: [] })
  assert.equal(remote.mock.callCount(), 1)
})

test('account changes remove and cancel private queries while retaining public catalogs', async () => {
  const cache = client()
  cache.setQueryData(['dashboard', 'meals', 'previous-member'], { calories: 999 })
  cache.setQueryData(['public', '/api/exercises', ''], { exercises: [] })
  const inFlight = cache.fetchQuery({ queryKey: ['private', 'pending'], queryFn: () => new Promise<null>(() => {}) })
  const cancelled = assert.rejects(inFlight)
  clearPrivateQueries(cache)
  await cancelled
  assert.equal(cache.getQueryData(['dashboard', 'meals', 'previous-member']), undefined)
  assert.equal(cache.getQueryCache().find({ queryKey: ['private', 'pending'] }), undefined)
  assert.deepEqual(cache.getQueryData(['public', '/api/exercises', '']), { exercises: [] })
})

test('verified trainer listings reuse the database result and have public cache headers', async () => {
  global.mongooseCache.conn = mongoose
  const find = mock.method(Trainer, 'find', () => ({ select: () => ({ limit: () => ({ lean: async () => [{ _id: '000000000000000000000001', name: 'Cache Coach', slug: 'cache-coach' }] }) }) }))
  const path = 'http://localhost/api/trainers?search=cache-fixture'
  const first = await trainers(new NextRequest(path))
  const second = await trainers(new NextRequest(path, { headers: { Cookie: 'token=ignored-for-public-listings' } }))
  assert.deepEqual(await first.json(), await second.json())
  assert.match(second.headers.get('cache-control')!, /public.*s-maxage=60/)
  assert.equal(find.mock.callCount(), 1)
})

test('directory outages are not cached and can recover on the next request', async () => {
  global.mongooseCache.conn = mongoose
  mock.method(console, 'error', () => {})
  let failed = true
  const find = mock.method(Trainer, 'find', () => {
    if (failed) throw new Error('Offline')
    return { select: () => ({ limit: () => ({ lean: async () => [{ _id: '000000000000000000000002', name: 'Recovered Coach', slug: 'recovered' }] }) }) }
  })
  const request = () => new NextRequest('http://localhost/api/trainers?search=recover-fixture')
  const fallback = await trainers(request())
  assert.match(fallback.headers.get('cache-control')!, /no-store/)
  failed = false
  const recovered = await trainers(request())
  assert.equal((await recovered.json()).meta.source, 'database')
  assert.equal(find.mock.callCount(), 2)
})

test('gym listing filters have separate cached results', async () => {
  global.mongooseCache.conn = mongoose
  mock.method(Trainer, 'find', () => ({ select: () => ({ sort: () => ({ lean: async () => [] }) }) }))
  const find = mock.method(Gym, 'find', () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ _id: '000000000000000000000003', name: 'Cache Gym', address: 'Lahore', city: 'Lahore', facilities: [], images: [] }] }) }) }))
  const request = (city: string) => new NextRequest(`http://localhost/api/gyms?city=${city}&search=cache-fixture`)
  await gyms(request('Lahore'))
  const cached = await gyms(request('Lahore'))
  assert.match(cached.headers.get('cache-control')!, /public/)
  assert.equal(find.mock.callCount(), 1)
  await gyms(request('Karachi'))
  assert.equal(find.mock.callCount(), 2)
})
