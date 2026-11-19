import test, { afterEach, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { DEFAULT_FREE_CHAT_MODELS, getFreeChatModels, requestOpenRouterChat, type ChatMessage } from '../../src/lib/openrouter-chat'
import { POST as chat } from '../../src/app/api/ai/chat/route'

const originalEnv = { ...process.env }
const messages: ChatMessage[] = [{ role: 'system', content: 'Use readable Markdown.' }, { role: 'user', content: 'How do I build muscle?' }]
const success = () => Response.json({ model: DEFAULT_FREE_CHAT_MODELS[1], choices: [{ finish_reason: 'stop', message: { content: '## Training\n\n1. Train consistently.' } }] })

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'fixture-openrouter-key'
  process.env.PLAYWRIGHT_TEST = '1'
  delete process.env.OPENROUTER_MODELS
  delete process.env.GEMINI_API_KEY
})
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
  Object.assign(process.env, originalEnv)
})

function request(body: unknown) {
  return new NextRequest('http://localhost/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

test('configured models exclude paid models, duplicates, and external URLs', () => {
  process.env.OPENROUTER_MODELS = 'openai/gpt-paid, vendor/coach:free, vendor/coach:free, https://example.com/model:free, openrouter/auto'
  assert.deepEqual(getFreeChatModels(), ['vendor/coach:free', 'openrouter/free'])
  process.env.OPENROUTER_MODELS = 'openai/gpt-paid'
  assert.deepEqual(getFreeChatModels(), [...DEFAULT_FREE_CHAT_MODELS, 'openrouter/free'])
})

test('OpenRouter receives ordered free fallbacks, a zero price ceiling, and the conversation', async () => {
  const remote = mock.method(globalThis, 'fetch', async (url: unknown, init?: RequestInit) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions')
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture-openrouter-key')
    assert.equal(init?.cache, 'no-store')
    const body = JSON.parse(init!.body as string)
    assert.deepEqual(body.models, DEFAULT_FREE_CHAT_MODELS)
    assert.deepEqual(body.messages, messages)
    assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0, request: 0 })
    assert.equal(body.provider.allow_fallbacks, true)
    return success()
  })
  const result = await requestOpenRouterChat(messages, 1000)
  assert.equal(result?.model, DEFAULT_FREE_CHAT_MODELS[1])
  assert.match(result!.reply, /^## Training/)
  assert.equal(remote.mock.callCount(), 1)
})

for (const failure of ['429', '503', 'empty', 'invalid-json', 'error-envelope', 'network']) {
  test(`${failure}: unavailable named models recover through the free router`, async () => {
    let calls = 0
    mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(init!.body as string)
      if (++calls > 1) {
        assert.deepEqual(body.models, ['openrouter/free'])
        assert.deepEqual(body.reasoning, { exclude: true })
        return success()
      }
      if (failure === 'network') throw new Error('Offline')
      if (failure === 'invalid-json') return new Response('Bad gateway', { status: 200 })
      if (failure === 'error-envelope') return Response.json({ error: { message: 'Provider failed' } })
      if (failure === 'empty') return Response.json({ choices: [{ message: { content: ' ' } }] })
      return Response.json({}, { status: Number(failure) })
    })
    assert.ok(await requestOpenRouterChat(messages, 1000))
    assert.equal(calls, 2)
  })
}

test('a timeout reserves time for a second free attempt', async () => {
  let calls = 0
  mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    if (++calls > 1) return success()
    const signal = init!.signal!
    return new Promise<Response>((_resolve, reject) => {
      const keepAlive = setTimeout(() => reject(new Error('Test request did not abort')), 2000)
      signal.addEventListener('abort', () => { clearTimeout(keepAlive); reject(signal.reason) }, { once: true })
    })
  })
  assert.ok(await requestOpenRouterChat(messages, 500))
  assert.equal(calls, 2)
})

for (const status of [401, 402, 403]) test(`${status}: account failures do not waste requests on another model`, async () => {
  const remote = mock.method(globalThis, 'fetch', async () => Response.json({}, { status }))
  assert.equal(await requestOpenRouterChat(messages, 1000), null)
  assert.equal(remote.mock.callCount(), 1)
})

test('missing credentials and cancelled callers do not contact OpenRouter', async () => {
  const remote = mock.method(globalThis, 'fetch', async () => success())
  delete process.env.OPENROUTER_API_KEY
  assert.equal(await requestOpenRouterChat(messages, 1000), null)
  process.env.OPENROUTER_API_KEY = 'fixture-only'
  assert.equal(await requestOpenRouterChat(messages, 1000, AbortSignal.abort()), null)
  assert.equal(remote.mock.callCount(), 0)
})

test('chat preserves conversation roles and formatting with an OpenRouter reply', async () => {
  mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string)
    assert.match(body.messages[0].content, /readable Markdown/)
    assert.deepEqual(body.messages.slice(1), [{ role: 'assistant', content: 'Earlier advice' }, { role: 'user', content: 'How do I build muscle?' }])
    return Response.json({ model: DEFAULT_FREE_CHAT_MODELS[0], choices: [{ message: { content: 'Train consistently.' } }] })
  })
  const response = await chat(request({ message: 'How do I build muscle?', history: [{ role: 'model', content: 'Earlier advice' }] }))
  const result = await response.json()
  assert.equal(result.source, 'openrouter')
  assert.match(result.reply, /^## Fitness Guidance/)
  assert.match(result.reply, /Note\. This information/)
  assert.doesNotMatch(JSON.stringify(result), /fixture-openrouter-key/)
})

test('all OpenRouter failures still yield formatted local guidance', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 503 }))
  const response = await chat(request({ message: 'How do I build muscle?', history: [] }))
  const result = await response.json()
  assert.equal(response.status, 200)
  assert.equal(result.source, 'local-fallback')
  assert.match(result.reply, /^## Fitness Guidance/)
  assert.match(result.reply, /surplus/)
})

test('Gemini remains available after free OpenRouter models fail', async () => {
  process.env.GEMINI_API_KEY = 'fixture-gemini-key'
  mock.method(globalThis, 'fetch', async (url: unknown) => String(url).startsWith('https://openrouter.ai/')
    ? Response.json({}, { status: 503 })
    : Response.json({ candidates: [{ content: { parts: [{ text: '## Recovery\n\n1. Sleep consistently.' }] } }] }))
  const response = await chat(request({ message: 'How should I recover?', history: [] }))
  assert.equal((await response.json()).source, 'gemini')
})

test('invalid chat inputs never reach model providers', async () => {
  const remote = mock.method(globalThis, 'fetch', async () => success())
  const response = await chat(request({ message: '', history: [] }))
  assert.equal(response.status, 400)
  assert.equal(remote.mock.callCount(), 0)
})
