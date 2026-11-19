'use client'

import { useEffect, useRef } from 'react'

/** Push events refresh immediately, with visible-page polling as a fallback. */
export function useActivityRefresh(refresh: () => void | Promise<unknown>, enabled = true, interval = 5000) {
  const latest = useRef(refresh)
  useEffect(() => { latest.current = refresh }, [refresh])
  useEffect(() => {
    if (!enabled) return
    let pending = false
    let disposed = false
    const run = async () => {
      if (disposed || pending || document.visibilityState !== 'visible') return
      pending = true
      try { await latest.current() } catch { /* The owning view displays request errors. */ }
      finally { pending = false }
    }
    const timer = setInterval(run, interval)
    window.addEventListener('app:activity', run)
    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', run)
    return () => {
      disposed = true
      clearInterval(timer)
      window.removeEventListener('app:activity', run)
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', run)
    }
  }, [enabled, interval])
}
