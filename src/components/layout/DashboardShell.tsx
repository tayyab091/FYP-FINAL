'use client'

import type { ComponentType, ReactNode } from 'react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Activity,
  Apple,
  BarChart3,
  Building2,
  ClipboardList,
  Dumbbell,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Radio,
  Settings,
  UtensilsCrossed,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getRoleHomePath } from '@/lib/access'
import { NotificationBell } from '@/components/notifications/NotificationBell'

type UserRole = 'user' | 'trainer' | 'gym_owner' | 'admin' | 'super_admin'

interface NavItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  exact?: boolean
}

const roleNavigation: Record<UserRole, NavItem[]> = {
  user: [
    { label: 'Home', href: '/dashboard', icon: Home, exact: true },
    { label: 'My Fitness', href: '/my-fitness', icon: LayoutDashboard },
    { label: 'Meal Plans', href: '/meal-plans', icon: UtensilsCrossed },
    { label: 'Nutrition', href: '/my-fitness?tab=nutrition', icon: Apple },
    { label: 'Messages', href: '/chat', icon: MessageCircle },
    { label: 'Community', href: '/community', icon: Users },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Live Sessions', href: '/live-sessions', icon: Radio },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  trainer: [
    { label: 'Dashboard', href: '/trainer-dashboard', icon: Home, exact: true },
    { label: 'Messages', href: '/chat', icon: MessageCircle },
    { label: 'Exercises', href: '/trainer-dashboard/exercises', icon: Dumbbell },
    { label: 'Nutrition', href: '/trainer-dashboard/nutrition', icon: Apple },
    { label: 'Meal Plans', href: '/meal-plans', icon: UtensilsCrossed },
    { label: 'Live Sessions', href: '/live-sessions', icon: Radio },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  gym_owner: [
    { label: 'Dashboard', href: '/gym-owner', icon: Home, exact: true },
    { label: 'Trainers', href: '/gym-owner?tab=trainers', icon: Users },
    { label: 'Exercises', href: '/gym-owner/exercises', icon: Dumbbell },
    { label: 'Nutrition', href: '/gym-owner/nutrition', icon: Apple },
    { label: 'Messages', href: '/chat', icon: MessageCircle },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  admin: [
    { label: 'Home', href: '/admin', icon: Home, exact: true },
    { label: 'Users', href: '/admin?tab=users', icon: Users },
    { label: 'Trainers', href: '/admin?tab=trainers', icon: ClipboardList },
    { label: 'Gyms', href: '/admin?tab=gyms', icon: Building2 },
    { label: 'Exercises', href: '/admin/exercises', icon: Dumbbell },
    { label: 'Nutrition', href: '/admin/nutrition', icon: Apple },
    { label: 'Audit', href: '/admin?tab=audit', icon: Activity },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  super_admin: [
    { label: 'Home', href: '/admin', icon: Home, exact: true },
    { label: 'Users', href: '/admin?tab=users', icon: Users },
    { label: 'Trainers', href: '/admin?tab=trainers', icon: ClipboardList },
    { label: 'Gyms', href: '/admin?tab=gyms', icon: Building2 },
    { label: 'Exercises', href: '/admin/exercises', icon: Dumbbell },
    { label: 'Nutrition', href: '/admin/nutrition', icon: Apple },
    { label: 'Audit', href: '/admin?tab=audit', icon: Activity },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Home',
  '/my-fitness': 'My Fitness',
  '/meal-plans': 'Meal Plans',
  '/community': 'Community',
  '/analytics': 'Analytics',
  '/trainer-dashboard': 'Trainer Dashboard',
  '/trainer-dashboard/exercises': 'Exercise Library',
  '/trainer-dashboard/nutrition': 'Nutrition Library',
  '/gym-owner': 'Gym Management',
  '/gym-owner/exercises': 'Exercise Library',
  '/gym-owner/nutrition': 'Nutrition Library',
  '/admin': 'Admin Console',
  '/admin/exercises': 'Exercise Library',
  '/admin/nutrition': 'Nutrition Library',
  '/nutrition': 'Nutrition',
  '/exercises': 'Exercise Library',
  '/exercise-check': 'AI Form Checker',
  '/coaching': 'Find Trainers',
  '/chat': 'Messages',
  '/live-sessions': 'Live Sessions',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith('/chat/')) return 'Conversation'
  if (pathname.startsWith('/coaching/')) return 'Trainer Profile'
  // Prefer longer/exact matches first
  const match = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || pathname.startsWith(`${path}/`))
  return match?.[1] || 'Dashboard'
}

function isNavActive(pathname: string, item: NavItem, currentTab: string | null) {
  if (item.href.includes('?')) {
    const [base, query] = item.href.split('?')
    const tab = new URLSearchParams(query).get('tab')
    if (tab) {
      return pathname === base && currentTab === tab
    }
  }
  if (item.href === '/my-fitness') {
    return pathname.startsWith('/my-fitness') && currentTab !== 'nutrition'
  }
  if (item.href === '/admin' && item.exact) {
    return pathname === '/admin' && (!currentTab || currentTab === 'overview')
  }
  if (item.href === '/trainer-dashboard' && item.exact) {
    return pathname === '/trainer-dashboard'
  }
  if (item.href === '/gym-owner' && item.exact) {
    return pathname === '/gym-owner' && (!currentTab || currentTab === 'gym')
  }
  if (item.href === '/dashboard' && item.exact) {
    return pathname === '/dashboard'
  }
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')
  const role = user?.role || 'user'
  const items = roleNavigation[role]
  const homePath = getRoleHomePath(role)

  return (
    <div className="flex h-full flex-col bg-[#090c0a]/96 backdrop-blur-2xl">
      <div className="flex h-16 items-center border-b border-white/[.06] px-5">
        <Link href={homePath} onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(34,245,154,.2)]">
            <Activity className="size-4.5" strokeWidth={2.7} />
          </span>
          <span className="font-heading text-lg font-black tracking-[-.045em] text-white">T.E.S.T.</span>
        </Link>
      </div>

      <div className="px-4 pt-5">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Workspace
        </p>
      </div>
      <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active = isNavActive(pathname, item, currentTab)
          const Icon = item.icon
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                active
                  ? 'bg-primary/[.1] text-primary shadow-[inset_0_0_0_1px_rgba(34,245,154,.08)]'
                  : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              {active && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-primary shadow-[0_0_12px_rgba(34,245,154,.7)]" />}
              <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-[#536059] group-hover:text-white'}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {user?.role === 'user' && user.subscription?.plan === 'basic' && (
        <div className="mx-3 mb-3 overflow-hidden rounded-2xl border border-primary/15 bg-[radial-gradient(circle_at_top_right,rgba(34,245,154,.14),transparent_65%),rgba(34,245,154,.035)] p-4">
          <p className="text-sm font-bold text-white">Unlock Pro</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Advanced analytics and trainer coaching.</p>
          <Link
            href="/subscription"
            onClick={onNavigate}
            className="mt-3 inline-flex text-xs font-bold text-primary hover:underline"
          >
            View plans →
          </Link>
        </div>
      )}

      <div className="border-t border-white/5 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#55ffb1] to-[#3dbdff] text-sm font-black text-[#03130b] shadow-[0_8px_25px_rgba(34,245,154,.14)]">
            {user?.fullName?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.fullName || 'Account'}</p>
            <p className="truncate text-[11px] capitalize text-[#666]">{role.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname])

  useEffect(() => setMobileOpen(false), [pathname])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <>{children}</>

  return (
    <div className="min-h-screen bg-background text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/[.06] lg:block">
        <Suspense fallback={<div className="h-full animate-pulse bg-[#090c0a]/96" />}>
          <SidebarContent />
        </Suspense>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/[.09] bg-[#070908]/92 px-4 backdrop-blur-2xl lg:left-72 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/[.08] text-primary shadow-[0_0_20px_rgba(34,245,154,.12)] lg:hidden"
            aria-label="Open dashboard navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">T.E.S.T. Workspace</p>
            <h1 className="truncate font-heading text-base font-bold tracking-tight text-white">{pageTitle}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="hidden rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[.04] hover:text-white sm:inline-flex"
          >
            Back to site
          </Link>
          <NotificationBell />
          <div className="hidden items-center gap-2 text-xs text-[#666] md:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_10px_rgba(34,245,154,.7)]" />
            Secure session
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Close dashboard navigation"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-sm border-r border-white/10 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-5 z-10 rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Suspense fallback={<div className="h-full animate-pulse bg-[#090c0a]/96" />}>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </Suspense>
          </aside>
        </div>
      )}

      <div className="min-h-screen bg-[radial-gradient(circle_at_70%_-10%,rgba(34,245,154,.055),transparent_32rem)] pt-16 lg:pl-72">
        {children}
      </div>
    </div>
  )
}
