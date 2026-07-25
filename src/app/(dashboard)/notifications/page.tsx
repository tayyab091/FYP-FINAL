'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { useAuth } from '@/hooks/useAuth'
import { SignInGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { AppNotification } from '@/types'

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
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

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function groupNotifications(notifications: AppNotification[]) {
  const todayStart = startOfDay(new Date())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const groups: { label: string; items: AppNotification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ]

  for (const notification of notifications) {
    const created = new Date(notification.createdAt)
    if (created >= todayStart) groups[0].items.push(notification)
    else if (created >= yesterdayStart) groups[1].items.push(notification)
    else groups[2].items.push(notification)
  }

  return groups.filter((group) => group.items.length > 0)
}

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch('/api/notifications?limit=50')
      .then((r) => (r.ok ? r.json() : { notifications: [], unreadCount: 0 }))
      .then((data) => {
        setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
      })
      .finally(() => setLoading(false))
  }, [user])

  const grouped = useMemo(() => groupNotifications(notifications), [notifications])

  const markAsRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    if (!res.ok) return
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      if (!res.ok) return
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } finally {
      setMarkingAll(false)
    }
  }

  const handleClick = async (notification: AppNotification) => {
    if (!notification.isRead) await markAsRead(notification._id)
    if (notification.link) router.push(notification.link)
  }

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to view notifications" />

  return (
    <div className="min-h-screen px-4 pb-28 pt-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="page-hero mb-6 px-6 py-8 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Activity Feed</p>
              <h1 className="display-title text-3xl md:text-4xl">Notifications</h1>
              <p className="mt-2 text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
                  : "You're all caught up!"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void markAllRead()}
                disabled={markingAll}
                className="gap-1.5"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl bg-muted" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="elite-panel rounded-2xl py-16 text-center">
            <Bell className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-semibold text-white">You&apos;re all caught up!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Connection requests, messages, and plan updates will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <section key={group.label}>
                <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.items.map((notification) => {
                    const Icon = typeIcon(notification.type)
                    return (
                      <button
                        key={notification._id}
                        type="button"
                        onClick={() => void handleClick(notification)}
                        className={`elite-panel interactive-lift flex w-full items-start gap-4 rounded-2xl p-4 text-left ${
                          !notification.isRead ? 'border-primary/20 bg-primary/[.03]' : ''
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                            !notification.isRead
                              ? 'bg-primary/15 text-primary'
                              : 'bg-white/[.05] text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-semibold text-white">{notification.title}</span>
                            {!notification.isRead && (
                              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                            )}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {notification.message}
                          </span>
                          <span className="mt-2 block text-xs text-[#666]">
                            {formatTime(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
