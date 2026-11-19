import test, { afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { Writable } from 'node:stream'
import mongoose from 'mongoose'
import { v2 as cloudinary } from 'cloudinary'
import { NextRequest } from 'next/server'
import User from '../../src/models/User'
import Trainer from '../../src/models/Trainer'
import { createToken } from '../../src/lib/auth'
import { queryExercises, fetchExerciseById } from '../../src/lib/exercises-api'
import { bypassImageOptimization } from '../../src/lib/image-optimization'
import { isCloudinaryConfigured } from '../../src/lib/cloudinary'
import { POST as uploadAvatar } from '../../src/app/api/user/profile/avatar/route'
import { POST as uploadChat } from '../../src/app/api/chat/upload/route'
import { POST as chat } from '../../src/app/api/ai/chat/route'

const originalEnv = { ...process.env }
const memberId = '000000000000000000000001'
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
  Object.assign(process.env, originalEnv)
  global.mongooseCache.conn = null
})

test('the complete exercise library and known details work without remote requests', async () => {
  const remote = mock.method(globalThis, 'fetch', async () => { throw new Error('Network unavailable') })
  const first = await queryExercises({ limit: 36, page: 1, includeMeta: true })
  const second = await queryExercises({ limit: 36, page: 2 })
  assert.equal(first.total, 1500)
  assert.equal(first.exercises.length, 36)
  assert.equal(first.meta?.total, 1500)
  assert.equal(new Set([...first.exercises, ...second.exercises].map(item => item.id)).size, 72)
  const detail = await fetchExerciseById(first.exercises[0].id)
  assert.equal(detail?.gifUrl, first.exercises[0].gifUrl)
  const filtered = await queryExercises({ search: 'squat', equipment: 'Bodyweight', limit: 100 })
  assert.ok(filtered.total > 0)
  assert.ok(filtered.exercises.every(item => /squat/i.test(item.name) && item.equipment === 'Bodyweight'))
  assert.equal(remote.mock.callCount(), 0)
})

test('image optimization preserves GIFs, supports photos, and avoids unknown-host crashes', () => {
  assert.equal(bypassImageOptimization('https://static.exercisedb.dev/media/example.gif'), true)
  assert.equal(bypassImageOptimization('https://res.cloudinary.com/demo/image/upload/photo.jpg'), false)
  assert.equal(bypassImageOptimization('/brand/logo-light.png'), false)
  assert.equal(bypassImageOptimization('https://other.example/avatar.png'), true)
  assert.equal(bypassImageOptimization('data:image/png;base64,AAAA'), true)
})

test('Cloudinary accepts either the URL or the three server credentials', () => {
  for (const key of ['CLOUDINARY_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) delete process.env[key]
  assert.equal(isCloudinaryConfigured(), false)
  process.env.CLOUDINARY_URL = 'cloudinary://fixture-key:fixture-secret@fixture-cloud'
  assert.equal(isCloudinaryConfigured(), true)
  delete process.env.CLOUDINARY_URL
  Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: 'fixture-cloud', CLOUDINARY_API_KEY: 'fixture-key', CLOUDINARY_API_SECRET: 'fixture-secret' })
  assert.equal(isCloudinaryConfigured(), true)
  delete process.env.CLOUDINARY_API_SECRET
  assert.equal(isCloudinaryConfigured(), false)
})

function mediaSession(role: string) {
  process.env.JWT_SECRET = 'media-regression-fixture-only'
  process.env.PLAYWRIGHT_TEST = '1'
  process.env.CLOUDINARY_URL = 'cloudinary://fixture-key:fixture-secret@fixture-cloud'
  global.mongooseCache.conn = mongoose
  const user = { _id: memberId, email: 'fixture@example.test', role, isActive: true }
  mock.method(User, 'findById', () => ({ select: () => ({ lean: async () => user }) }))
  mock.method(User, 'findByIdAndUpdate', (_id: unknown, values: unknown) => ({ select: () => ({ lean: async () => ({ ...user, ...values as object }) }) }))
  mock.method(Trainer, 'updateOne', async () => ({}))
  mock.method(cloudinary.uploader, 'upload_stream', (_options: unknown, callback: (error: null, result: unknown) => void) => new Writable({
    write(_chunk, _encoding, done) { done() },
    final(done) { callback(null, { secure_url: 'https://res.cloudinary.com/fixture-cloud/image/upload/avatar.png', public_id: 'fixture-avatar' }); done() },
  }))
  return (field: string) => {
    const form = new FormData()
    form.set(field, new File([new Uint8Array([137, 80, 78, 71])], 'fixture.png', { type: 'image/png' }))
    return new NextRequest('http://localhost/api/upload', { method: 'POST', headers: { authorization: `Bearer ${createToken({ userId: memberId, role, email: user.email })}` }, body: form })
  }
}

for (const role of ['user', 'trainer', 'gym_owner', 'admin', 'super_admin']) {
  test(`${role}: avatar upload reaches storage and persists the returned URL (mocked provider)`, async () => {
    const request = mediaSession(role)
    const response = await uploadAvatar(request('avatar'))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.match(body.avatarUrl, /res\.cloudinary\.com/)
    assert.equal(body.user.avatarPublicId, 'fixture-avatar')
  })
  test(`${role}: chat images reach storage (mocked provider)`, async () => {
    const request = mediaSession(role)
    const response = await uploadChat(request('image'))
    assert.equal(response.status, 200)
    assert.match((await response.json()).url, /res\.cloudinary\.com/)
  })
  test(`${role}: missing image credentials report unavailable storage`, async () => {
    const request = mediaSession(role)
    for (const key of ['CLOUDINARY_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) delete process.env[key]
    const response = await uploadAvatar(request('avatar'))
    assert.equal(response.status, 503)
  })
}

for (const message of ['How do I gain weight?', 'How do I lose fat?', 'Tell me about protein', 'How should I squat?', 'How can I sleep better?', 'Calculate my calories', 'I am 25, 75 kg, 178 cm, male', 'Hello']) {
  test(`chat never returns canned advice without provider credentials: ${message}`, async () => {
    process.env.PLAYWRIGHT_TEST = '1'
    delete process.env.GEMINI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.CLAUDE_API_KEY
    delete process.env.OPENROUTER_API_KEY
    const response = await chat(new NextRequest('http://localhost/api/ai/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, history: [] }) }))
    assert.equal(response.status, 503)
    const { reply } = await response.json()
    assert.match(reply, /temporarily unavailable/)
  })
}

test('a failed AI provider returns an explicit error instead of local advice', async () => {
  process.env.GEMINI_API_KEY = 'fixture-key'
  process.env.PLAYWRIGHT_TEST = '1'
  mock.method(globalThis, 'fetch', async () => { throw new Error('Upstream timeout') })
  const response = await chat(new NextRequest('http://localhost/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: 'How should I recover?', history: [] }) }))
  const body = await response.json()
  assert.equal(response.status, 503)
  assert.equal(body.source, 'unavailable')
  assert.doesNotMatch(body.reply, /^## |1\. /)
})
