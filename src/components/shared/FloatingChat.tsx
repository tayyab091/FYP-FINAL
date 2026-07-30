'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export function FloatingChat() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    // Uses the lightweight count-only endpoint instead of the full
    // conversations list (populated participants, last message, etc.) —
    // this badge only ever needs a number, and it re-fetches on every
    // navigation, so the heavier endpoint was a real, measured cost added
    // to every single page load across the app.
    fetch('/api/chat/unread-count', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((data: { count?: number }) => setUnread(data.count || 0))
      .catch(() => {})
    return () => controller.abort()
  }, [user, pathname])

  if (!user) return null
  if (pathname.startsWith('/chat')) return null

  return (
    <button
      type="button"
      onClick={() => router.push('/chat')}
      className="float-messages relative"
      aria-label="Messages"
      style={{ bottom: 88 }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}
