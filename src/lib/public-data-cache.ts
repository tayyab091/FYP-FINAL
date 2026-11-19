import type { QueryClient } from '@tanstack/react-query'

export const PUBLIC_QUERY_KEY = 'public'

const PUBLIC_ENDPOINTS = new Set(['/api/exercises', '/api/meals', '/api/trainers', '/api/gyms'])

export interface CatalogPage<T, M> {
  exercises?: T[]
  meals?: T[]
  meta?: M
  total?: number
  totalPages?: number
  page?: number
}

/** Canonical keys let different screens share the same public request. */
function publicUrl(path: string) {
  const url = new URL(path, 'http://public-cache.local')
  if (url.origin !== 'http://public-cache.local' || !PUBLIC_ENDPOINTS.has(url.pathname) || url.searchParams.has('random')) {
    throw new Error('Only public catalog and directory data may use this cache')
  }
  url.searchParams.sort()
  return url
}

export async function fetchPublicData<T>(client: QueryClient, path: string, callerSignal?: AbortSignal): Promise<T> {
  callerSignal?.throwIfAborted()
  const url = publicUrl(path)
  const directory = url.pathname === '/api/trainers' || url.pathname === '/api/gyms'
  const pending = client.fetchQuery<T>({
    queryKey: [PUBLIC_QUERY_KEY, url.pathname, url.search],
    staleTime: directory ? 30_000 : 5 * 60_000,
    gcTime: directory ? 5 * 60_000 : 30 * 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${url.pathname}${url.search}`, {
        credentials: 'omit',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      })
      if (!response.ok) throw new Error(`Unable to load public data (${response.status})`)
      return response.json() as Promise<T>
    },
  })
  if (!callerSignal) return pending
  // Stop this screen's wait immediately without cancelling the shared request.
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => callerSignal.removeEventListener('abort', onAbort)
    const onAbort = () => { cleanup(); reject(callerSignal.reason) }
    callerSignal.addEventListener('abort', onAbort, { once: true })
    if (callerSignal.aborted) onAbort()
    pending.then(
      data => { cleanup(); resolve(data) },
      error => { cleanup(); reject(error) },
    )
  })
}

/** Personal data must not survive logout or a switch to another account. */
export function clearPrivateQueries(client: QueryClient) {
  client.removeQueries({ predicate: query => query.queryKey[0] !== PUBLIC_QUERY_KEY })
}
