/** Bound optional work without cancelling a shared operation such as a DB connection. */
export async function withDeadline<T>(work: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work.catch(() => fallback),
      new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), timeoutMs) }),
    ])
  } finally { clearTimeout(timer) }
}
