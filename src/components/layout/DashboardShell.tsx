'use client'

import type { ComponentType, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Apple,
  Building2,
  Dumbbell,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  ScanLine,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type UserRole = 'user' | 'trainer' | 'gym_owner' | 'admin' | 'super_admin'

interface NavItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  exact?: boolean
}

const sharedItems: NavItem[] = [
  { label: 'Home', href: '/', icon: Home, exact: true },
  { label: 'Find Trainers', href: '/coaching', icon: Users },
  { label: 'Exercise Library', href: '/exercises', icon: Dumbbell },
  { label: 'AI Form Checker', href: '/exercise-check', icon: ScanLine },
]

const roleNavigation: Record<UserRole, NavItem[]> = {
  user: [
    { label: 'My Fitness', href: '/my-fitness', icon: LayoutDashboard },
    { label: 'Nutrition', href: '/nutrition', icon: Apple },
    { label: 'Messages', href: '/chat', icon: MessageCircle },
    { label: 'Settings', href: '/settings', icon: Settings },
    ...sharedItems,
  ],
  trainer: [
    { label: 'Trainer Dashboard', href: '/trainer-dashboard', icon: LayoutDashboard },
    { label: 'Messages', href: '/chat', icon: MessageCircle },
    { label: 'Settings', href: '/settings', icon: Settings },
    ...sharedItems,
  ],
  gym_owner: [
    { label: 'Gym Dashboard', href: '/gym-owner', icon: Building2 },
    { label: 'Messages', href: '/chat', icon: MessageCircle },
    { label: 'Settings', href: '/settings', icon: Settings },
    ...sharedItems,
  ],
  admin: [
    { label: 'Admin Console', href: '/admin', icon: Shield },
    { label: 'Settings', href: '/settings', icon: Settings },
    ...sharedItems,
  ],
  super_admin: [
    { label: 'Admin Console', href: '/admin', icon: Shield },
    { label: 'Settings', href: '/settings', icon: Settings },
    ...sharedItems,
  ],
}

const pageTitles: Record<string, string> = {
  '/my-fitness': 'My Fitness',
  '/trainer-dashboard': 'Trainer Dashboard',
  '/gym-owner': 'Gym Management',
  '/admin': 'Admin Console',
  '/chat': 'Messages',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith('/chat/')) return 'Conversation'
  return Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))?.[1] || 'Dashboard'
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const role = user?.role || 'user'
  const items = roleNavigation[role]

  return (
    <div className="flex h-full flex-col bg-[#0d0d0d]">
      <div className="flex h-20 items-center border-b border-white/5 px-6">
        <Link href="/" onClick={onNavigate} className="text-xl font-black gradient-text">
          T.E.S.T.
        </Link>
      </div>

      <div className="px-4 pt-5">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#555]">
          Workspace
        </p>
      </div>
      <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-[#00ff87]/12 text-[#00ff87]'
                  : 'text-[#888] hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-[#00ff87]' : 'text-[#555] group-hover:text-white'}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {user?.role === 'user' && user.subscription?.plan === 'basic' && (
        <div className="mx-3 mb-3 rounded-2xl border border-[#00ff87]/15 bg-[#00ff87]/5 p-4">
          <p className="text-sm font-bold text-white">Unlock Pro</p>
          <p className="mt-1 text-xs leading-relaxed text-[#777]">Advanced analytics and trainer coaching.</p>
          <Link
            href="/subscription"
            onClick={onNavigate}
            className="mt-3 inline-flex text-xs font-bold text-[#00ff87] hover:underline"
          >
            View plans →
          </Link>
        </div>
      )}

      <div className="border-t border-white/5 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00ff87] to-[#00bfff] text-sm font-black text-black">
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
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#777] transition-colors hover:bg-red-500/10 hover:text-red-400"
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#00ff87] border-t-transparent" />
      </div>
    )
  }

  if (!user) return <>{children}</>

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/5 lg:block">
        <SidebarContent />
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-[#0a0a0a]/95 px-4 backdrop-blur-xl lg:left-72 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-white/10 p-2 text-[#aaa] hover:text-white lg:hidden"
            aria-label="Open dashboard navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#555]">T.E.S.T. Workspace</p>
            <h1 className="text-base font-bold text-white">{pageTitle}</h1>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs text-[#666] sm:flex">
          <span className="h-2 w-2 rounded-full bg-[#00ff87] shadow-[0_0_10px_rgba(0,255,135,0.7)]" />
          Secure session
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
              className="absolute right-4 top-5 z-10 rounded-lg p-2 text-[#777] hover:bg-white/5 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="min-h-screen pt-16 lg:pl-72">
        {children}
      </div>
    </div>
  )
}
