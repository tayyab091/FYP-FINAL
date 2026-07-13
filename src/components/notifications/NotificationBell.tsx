'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { Bell, CheckCheck, MessageCircle, UserPlus, Info } from 'lucide-react'
import type { AppNotification } from '@/types'

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
    case 'trainer':
      return UserPlus
    default:
      return Info
  }
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=8')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
    } catch {
      // ignore fetch errors silently for bell polling
    }
  }, [])

  useEffect(() => {
    void fetchNotifications()
    const interval = setInterval(() => void fetchNotifications(), 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    })
    socketRef.current = socket

    socket.on('notification', (notification: AppNotification) => {
      if (!notification?._id) return
      setNotifications((prev) => {
        if (prev.some((item) => item._id === notification._id)) return prev
        return [notification, ...prev].slice(0, 8)
      })
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1)
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

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
        aria-label="Notifications"
        aria-expanded={open}
        className="relative rounded-xl border border-white/[.09] bg-white/[.03] p-2 text-[#aaa] transition-colors hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/[.09] bg-[#0b0e0c]/98 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-3">
            <p className="text-sm font-bold text-white">Notifications</p>
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
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = typeIcon(notification.type)
                return (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    className={`flex w-full items-start gap-3 border-b border-white/[.04] px-4 py-3 text-left transition-colors hover:bg-white/[.03] ${
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
                        <span className="truncate text-sm font-semibold text-white">{notification.title}</span>
                        {!notification.isRead && (
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.message}</span>
                      <span className="mt-1 block text-[10px] text-[#666]">{formatTime(notification.createdAt)}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="border-t border-white/[.06] px-4 py-2.5">
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
