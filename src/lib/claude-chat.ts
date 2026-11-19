import type { ChatMessage } from './openrouter-chat'

export async function requestClaudeChat(messages: ChatMessage[], timeoutMs: number, callerSignal?: AbortSignal) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim()
  if (!apiKey || callerSignal?.aborted) return null
  const timeout = AbortSignal.timeout(timeoutMs)
  const model = process.env.CLAUDE_MODEL?.trim() || 'claude-haiku-4-5-20251001'
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 900,
        system: messages.filter(m => m.role === 'system').map(m => m.content).join('\n'),
        messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
      }),
      signal: callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout,
      cache: 'no-store',
    })
    if (!response.ok) {
      console.warn('[ai-chat] Claude unavailable', { status: response.status })
      return null
    }
    const data = await response.json() as { model?: string; error?: unknown; content?: { type?: string; text?: unknown }[] }
    if (data.error || !Array.isArray(data.content)) return null
    const reply = data.content.filter(block => block.type === 'text' && typeof block.text === 'string').map(block => block.text as string).join('\n').trim()
    return reply ? { reply, model: typeof data.model === 'string' ? data.model : model } : null
  } catch {
    if (!callerSignal?.aborted) console.warn('[ai-chat] Claude unavailable', { reason: timeout.aborted ? 'timeout' : 'invalid_response_or_network' })
    return null
  }
}
