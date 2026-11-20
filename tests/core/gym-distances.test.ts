import test, { mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { POST } from '../../src/app/api/gyms/distances/route'
import { routeDistances } from '../../src/lib/gym-distances'

const env = { ...process.env }
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key]
  Object.assign(process.env, env)
})
const request = (destinations = [{ latitude: 31.5, longitude: 74.3 }]) => new NextRequest('http://localhost/api/gyms/distances', {
  method: 'POST', body: JSON.stringify({ origin: { latitude: 31.4, longitude: 74.2 }, destinations }),
})
test('routes use exact road distances, response indices, and preserve unavailable routes', () => {
  assert.deepEqual(routeDistances([
    { destinationIndex: 1, condition: 'ROUTE_EXISTS', distanceMeters: 5100 },
    { condition: 'ROUTE_EXISTS', distanceMeters: 1999 },
    { destinationIndex: 2, status: { code: 5 }, condition: 'ROUTE_NOT_FOUND' },
  ], 3), [1.999, 5.1, null])
})
test('routing sends coordinates to Google and returns kilometres without rounding before filtering', async () => {
  process.env.GOOGLE_ROUTES_API_KEY = 'test-key'
  mock.method(global, 'fetch', async (url: unknown, options: RequestInit) => {
    assert.equal(url, 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix')
    assert.equal(JSON.parse(String(options.body)).travelMode, 'DRIVE')
    return Response.json([{ condition: 'ROUTE_EXISTS', distanceMeters: 5001 }])
  })
  assert.deepEqual(await (await POST(request())).json(), { provider: 'google', distances: [5.001] })
})
test('provider failure falls back explicitly rather than pretending air distance is Google distance', async () => {
  process.env.GOOGLE_ROUTES_API_KEY = 'test-key'
  mock.method(global, 'fetch', async () => new Response('', { status: 403 }))
  assert.deepEqual(await (await POST(request())).json(), { provider: 'straight-line' })
})
test('invalid coordinates never trigger paid requests', async () => {
  const fetchMock = mock.method(global, 'fetch', async () => { throw new Error('unexpected fetch') })
  assert.equal((await POST(request([{ latitude: 91, longitude: 0 }]))).status, 400)
  assert.equal(fetchMock.mock.callCount(), 0)
})
