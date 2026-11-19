interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()
const MAX_ENTRIES = 256

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    store.delete(key)
    return null
  }
  store.delete(key)
  store.set(key, entry)
  return entry.data as T
}

export function setCached<T>(key: string, data: T, ttlMs: number): T {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return data
  const now = Date.now()
  for (const [storedKey, entry] of store) {
    if (now >= entry.expiresAt) store.delete(storedKey)
  }
  store.delete(key)
  if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value!)
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
  return data
}

export async function getOrFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = getCached<T>(key)
  if (cached !== null) return cached

  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  const promise = Promise.resolve().then(fetcher)
    .then((data) => setCached(key, data, ttlMs))
    .finally(() => inflight.delete(key))

  inflight.set(key, promise)
  return promise
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * limit
  return {
    items: items.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    totalPages,
  }
}
