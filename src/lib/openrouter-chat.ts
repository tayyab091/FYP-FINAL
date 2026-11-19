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

export function getFreeChatModels(): string[] {
  const configured = (process.env.OPENROUTER_MODELS || '').split(',').map(model => model.trim())
    .filter(model => /^[\w.-]+\/[\w.-]+:free$/.test(model))
  const models = configured.length ? [...new Set(configured)].slice(0, 4) : [...DEFAULT_FREE_CHAT_MODELS]
  return [...models, FREE_ROUTER]
}

/** OpenRouter handles model/provider failures within each ordered models array. */
export async function requestOpenRouterChat(messages: ChatMessage[], timeoutMs: number, callerSignal?: AbortSignal) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey || callerSignal?.aborted) return null

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
      if ([401, 402, 403].includes(response.status)) return null
      if (!response.ok) continue

      const data = await response.json() as {
        model?: string
        error?: unknown
        choices?: { finish_reason?: string; message?: { content?: unknown } }[]
      } | null
      const choice = data?.choices?.[0]
      if (data?.error || choice?.finish_reason === 'error' || choice?.finish_reason === 'content_filter') continue
      const reply = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : ''
      if (reply) return { reply, model: typeof data?.model === 'string' ? data.model : candidates[0] }
    } catch {
      // Do not log upstream bodies/errors: they can contain credentials or member prompts.
    }
  }
  return null
}
