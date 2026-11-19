// Server-side chat provider. Never expose OPENROUTER_API_KEY through NEXT_PUBLIC_*.
export const DEFAULT_FREE_CHAT_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'inclusionai/ling-3.2-flash:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
] as const

const FREE_ROUTER = 'openrouter/free'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatProviderFailure = {
  reason: 'missing_api_key' | 'authentication' | 'credits' | 'forbidden' | 'rate_limited' | 'provider_unavailable' | 'invalid_request' | 'invalid_response' | 'content_filter' | 'timeout' | 'network'
  status?: number
}

function statusFailure(status: number): ChatProviderFailure {
  const reason = status === 401 ? 'authentication' : status === 402 ? 'credits'
    : status === 403 ? 'forbidden' : status === 429 ? 'rate_limited'
      : status >= 500 ? 'provider_unavailable' : 'invalid_request'
  return { reason, status }
}

export function getFreeChatModels(): string[] {
  const configured = (process.env.OPENROUTER_MODELS || '').split(',').map(model => model.trim())
    .filter(model => /^[\w.-]+\/[\w.-]+:free$/.test(model))
  const models = configured.length ? [...new Set(configured)].slice(0, 4) : [...DEFAULT_FREE_CHAT_MODELS]
  return [...models, FREE_ROUTER]
}

/** OpenRouter handles model/provider failures within each ordered models array. */
export async function requestOpenRouterChat(messages: ChatMessage[], timeoutMs: number, callerSignal?: AbortSignal, onFailure?: (failure: ChatProviderFailure) => void) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (callerSignal?.aborted) return null
  const report = (failure: ChatProviderFailure) => {
    // Only allowlisted metadata: never log prompts, keys, or upstream error bodies.
    console.warn('[ai-chat] OpenRouter unavailable', failure)
    onFailure?.(failure)
  }
  if (!apiKey) {
    report({ reason: 'missing_api_key' })
    return null
  }

  const models = getFreeChatModels()
  // Reserve time for the general free router if named models time out or return unusable output.
  const attempts = [models.slice(0, -1), [FREE_ROUTER]]
  const deadline = Date.now() + timeoutMs
  for (const [index, candidates] of attempts.entries()) {
    const remaining = deadline - Date.now()
    if (remaining <= 0 || callerSignal?.aborted) break
    const timeout = AbortSignal.timeout(Math.max(1, Math.floor(remaining / (attempts.length - index))))
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-OpenRouter-Title': 'T.E.S.T. Fitness Coach',
        },
        body: JSON.stringify({
          models: candidates,
          messages,
          max_tokens: 900,
          reasoning: index === 0 ? { effort: 'none', exclude: true } : { exclude: true },
          provider: { allow_fallbacks: true, sort: 'latency', max_price: { prompt: 0, completion: 0, request: 0 } },
          stream: false,
        }),
        cache: 'no-store',
        signal: callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout,
      })
      // Account-wide failures cannot be fixed by switching models.
      if (!response.ok) {
        report(statusFailure(response.status))
        if ([401, 402, 403].includes(response.status)) return null
        continue
      }

      const data = await response.json().catch(() => null) as {
        model?: string
        error?: { code?: unknown }
        choices?: { finish_reason?: string; message?: { content?: unknown } }[]
      } | null
      const choice = data?.choices?.[0]
      if (data?.error) {
        const status = typeof data.error.code === 'number' ? data.error.code : undefined
        report(status ? statusFailure(status) : { reason: 'invalid_response' })
        if (status && [401, 402, 403].includes(status)) return null
        continue
      }
      if (choice?.finish_reason === 'error' || choice?.finish_reason === 'content_filter') {
        report({ reason: choice.finish_reason === 'content_filter' ? 'content_filter' : 'provider_unavailable' })
        continue
      }
      const reply = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : ''
      if (reply) return { reply, model: typeof data?.model === 'string' ? data.model : candidates[0] }
      report({ reason: 'invalid_response' })
    } catch {
      if (callerSignal?.aborted) return null
      report({ reason: timeout.aborted ? 'timeout' : 'network' })
    }
  }
  return null
}
