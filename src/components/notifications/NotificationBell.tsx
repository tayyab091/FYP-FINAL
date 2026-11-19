'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Pusher from 'pusher-js'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  CheckCheck,
  CreditCard,
  Dumbbell,
  Info,
  MessageCircle,
  Settings,
  UserPlus,
} from 'lucide-react'
import type { AppNotification } from '@/types'
import { useAuth } from '@/hooks/useAuth'

const FETCH_LIMIT = 10
const POLL_MS = 5_000
const FETCH_TIMEOUT_MS = 8_000

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

function typeIcon(type: AppNotification['type']) {
  switch (type) {
    case 'chat':
      return MessageCircle
    case 'workout':
      return Dumbbell
    case 'trainer':
      return UserPlus
    case 'payment':
      return CreditCard
    case 'system':
      return Settings
    case 'community':
      return MessageCircle
    default:
      return Info
  }
}

export function NotificationBell() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const seen = useRef(new Set<string>())
  const initialized = useRef(false)
  const fetching = useRef(false)
  const audio = useRef<AudioContext | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const soundPreference = useRef(true)

  useEffect(() => {
    const enabled = localStorage.getItem('notification-sound') !== 'off'
    setSoundEnabled(enabled)
    soundPreference.current = enabled
    const unlock = () => {
      try {
        audio.current ||= new AudioContext()
        void audio.current.resume()
      } catch { /* Browsers can block audio until interaction. */ }
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      void audio.current?.close()
      audio.current = null
    }
  }, [])

  useEffect(() => {
    abortRef.current?.abort()
    seen.current.clear()
    initialized.current = false
    setNotifications([])
    setUnreadCount(0)
  }, [user?.id])

  const announce = useCallback((notification: AppNotification) => {
    toast(notification.title, {
      description: notification.message,
      action: notification.link ? { label: 'View', onClick: () => router.push(notification.link!) } : undefined,
      duration: 6000,
    })
    window.dispatchEvent(new CustomEvent('app:activity', { detail: notification }))
    void queryClient.invalidateQueries()
    const context = audio.current
    if (!soundPreference.current || !context || context.state !== 'running') return
    const gain = context.createGain()
    const oscillator = context.createOscillator()
    oscillator.connect(gain)
    gain.connect(context.destination)
    gain.gain.setValueAtTime(0.08, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35)
    oscillator.frequency.setValueAtTime(660, context.currentTime)
    oscillator.frequency.setValueAtTime(880, context.currentTime + 0.12)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.35)
  }, [queryClient, router])

  const fetchNotifications = useCallback(async () => {
    if (fetching.current) return
    fetching.current = true
    const controller = new AbortController()
    abortRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const res = await fetch(`/api/notifications?limit=${FETCH_LIMIT}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) return
      const data = await res.json()
      if (controller.signal.aborted) return
      const items: AppNotification[] = Array.isArray(data.notifications) ? data.notifications : []
      for (const item of [...items].reverse()) {
        if (initialized.current && !seen.current.has(item._id) && !item.isRead) announce(item)
        seen.current.add(item._id)
      }
      initialized.current = true
      setNotifications(items)
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
    } catch {
      // ignore fetch errors / aborts silently for bell polling
    } finally {
      clearTimeout(timeoutId)
      fetching.current = false
    }
  }, [announce])

  useEffect(() => {
    if (!user) return
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') void fetchNotifications()
    }
    refreshVisible()
    const interval = setInterval(refreshVisible, POLL_MS)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshVisible)
      abortRef.current?.abort()
    }
  }, [fetchNotifications, user])

  useEffect(() => {
    const userId = user?.id || user?._id
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    if (!userId || !key || !cluster) return

    const pusher = new Pusher(key, {
      cluster,
      authEndpoint: '/api/pusher/auth',
    })
    const channelName = `private-user-${userId}`
    const channel = pusher.subscribe(channelName)

    channel.bind('notification', (notification: AppNotification) => {
      if (!notification?._id || seen.current.has(notification._id)) return
      seen.current.add(notification._id)
      announce(notification)
      setNotifications((prev) => {
        if (prev.some((item) => item._id === notification._id)) return prev
        return [notification, ...prev].slice(0, FETCH_LIMIT)
      })
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1)
      }
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      pusher.disconnect()
    }
  }, [user?.id, user?._id, announce])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggleSound = () => {
    const enabled = !soundEnabled
    setSoundEnabled(enabled)
    soundPreference.current = enabled
    localStorage.setItem('notification-sound', enabled ? 'on' : 'off')
  }

  const handleOpen = async () => {
    setOpen((prev) => !prev)
    if (!open) await fetchNotifications()
  }

  const markAsRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    if (!res.ok) return
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      if (!res.ok) return
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) await markAsRead(notification._id)
    setOpen(false)
    if (notification.link) router.push(notification.link)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => void handleOpen()}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-controls="notifications-panel"
        aria-haspopup="dialog"
        className="relative rounded-xl border border-border bg-muted/40 p-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div id="notifications-panel" role="dialog" aria-label="Notifications" className="absolute right-0 top-[calc(100%+.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card/98 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-foreground">Notifications</p>
              <button type="button" onClick={toggleSound} className="text-xs text-primary" aria-pressed={soundEnabled}>{soundEnabled ? 'Sound on' : 'Sound off'}</button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={loading}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                You&apos;re all caught up!
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = typeIcon(notification.type)
                return (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                      !notification.isRead ? 'bg-primary/[.04]' : ''
                    }`}
                  >
                    <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                      !notification.isRead ? 'bg-primary/15 text-primary' : 'bg-white/[.05] text-muted-foreground'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{notification.title}</span>
                        {!notification.isRead && (
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.message}</span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">{formatTime(notification.createdAt)}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-bold text-primary hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
