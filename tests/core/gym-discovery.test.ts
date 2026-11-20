import test, { afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { mergeNearbyGyms } from '../../src/lib/gym-discovery'
import { photoMetadata, readPhotoToken } from '../../src/lib/google-gym-photos'
import { GET } from '../../src/app/api/gyms/nearby/route'
import { GET as photoGET } from '../../src/app/api/gyms/photo/route'
import { PREVIEW_GYMS, type PublicGym } from '../../src/lib/gyms'

const oldEnv = { ...process.env }
const center = { latitude: 31.52, longitude: 74.35 }
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in oldEnv)) delete process.env[key]
  Object.assign(process.env, oldEnv)
})
const gym = (id: string, extra: Partial<PublicGym> = {}): PublicGym => ({ ...PREVIEW_GYMS[0], id, name: id, location: center, ...extra })
const req = (query = 'lat=31.52&lng=74.35&radius=2000') => new NextRequest('http://localhost/api/gyms/nearby?' + query)

test('nearby discovery keeps external gyms, removes exact linked duplicates, and sorts by distance', () => {
  const results = mergeNearbyGyms([gym('registered', { googlePlaceId: 'place-a' })], [gym('google-a', { source: 'google', googlePlaceId: 'place-a' }), gym('google-b', { source: 'google', location: { ...center, latitude: 31.525 } })], center, 2)
  assert.deepEqual(results.map(row => row.id), ['registered', 'google-b'])
  assert.equal(results[1].source, 'google')
})
test('nearby discovery matches exact names only at the same location, not branches across town', () => {
  const results = mergeNearbyGyms([gym('a', { name: 'Real Gym' })], [gym('duplicate', { name: 'Real Gym', source: 'google' }), gym('branch', { name: 'Real Gym', source: 'google', location: { ...center, latitude: 31.53 } })], center, 2)
  assert.deepEqual(results.map(row => row.id), ['a', 'branch'])
})
test('nearby discovery excludes missing locations and results beyond the radius', () => {
  const results = mergeNearbyGyms([gym('far', { location: { latitude: 0, longitude: 0 } })], [gym('missing', { location: undefined }), gym('inside')], center, 2)
  assert.deepEqual(results.map(row => row.id), ['inside'])
})
test('Google nearby rejects missing or invalid coordinates before making a paid request', async () => {
  const fetchMock = mock.method(global, 'fetch', () => { throw new Error('Must not fetch') })
  for (const query of ['', 'lat=x&lng=2', 'lat=91&lng=2']) assert.equal((await GET(req(query))).status, 400)
  assert.equal(fetchMock.mock.callCount(), 0)
})
test('Google nearby has an explicit unconfigured response', async () => {
  delete process.env.GOOGLE_MAPS_API_KEY
  const response = await GET(req())
  assert.equal(response.status, 503)
  assert.equal((await response.json()).configured, false)
})
test('Google nearby uses meters, distance ranking and real attributed photos without exposing keys', async () => {
  process.env.GOOGLE_MAPS_API_KEY = 'private-fixture-key'
  process.env.JWT_SECRET = 'photo-fixture-signing-key'
  process.env.PLAYWRIGHT_TEST = '1'
  mock.method(global, 'fetch', async (_url: unknown, options: RequestInit) => {
    const body = JSON.parse(String(options.body))
    assert.equal(body.locationRestriction.circle.radius, 2000)
    assert.equal(body.rankPreference, 'DISTANCE')
    assert.equal(body.maxResultCount, 20)
    assert.ok((options.headers as Record<string, string>)['X-Goog-FieldMask'].includes('places.photos'))
    return Response.json({ places: [{ id: 'place-a', displayName: { text: 'Nearby Gym' }, location: center, googleMapsUri: 'https://maps.google.com/', photos: [{ name: 'places/place-a/photos/photo-a', authorAttributions: [{ displayName: 'Photographer', uri: 'https://maps.google.com/contributor' }] }] }] })
  })
  const response = await GET(req())
  const data = await response.json()
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(data.places[0].source, 'google')
  assert.deepEqual(data.places[0].images, [])
  assert.equal(data.places[0].googlePhoto.authors[0].name, 'Photographer')
  assert.match(data.places[0].coverImage, /^\/api\/gyms\/photo\?token=/)
  assert.doesNotMatch(JSON.stringify(data), /private-fixture-key/)
})
test('Google errors do not leak provider messages or secrets', async () => {
  process.env.GOOGLE_MAPS_API_KEY = 'fixture'
  process.env.PLAYWRIGHT_TEST = '1'
  mock.method(global, 'fetch', async () => Response.json({ error: { message: 'private key details' } }, { status: 403 }))
  const response = await GET(req())
  assert.equal(response.status, 502)
  assert.doesNotMatch(JSON.stringify(await response.json()), /private key details/)
})
test('photo tokens reject tampering, arbitrary paths and unrelated credentials', async () => {
  process.env.JWT_SECRET = 'fixture-signing-key'
  const photo = photoMetadata({ name: 'places/place-a/photos/photo-a' })!
  const token = new URL(photo.url, 'http://localhost').searchParams.get('token')!
  assert.equal(readPhotoToken(token), 'places/place-a/photos/photo-a')
  assert.equal(readPhotoToken(token + 'tampered'), null)
  assert.equal(photoMetadata({ name: '../secrets' }), undefined)
  assert.equal((await photoGET(new NextRequest('http://localhost/api/gyms/photo?token=arbitrary'))).status, 400)
})
