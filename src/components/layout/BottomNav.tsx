'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Home, LayoutDashboard, MessageCircle, Users, UtensilsCrossed } from 'lucide-react'
import { isAuthPath } from '@/lib/shell-routes'

function BottomNavInner() {
  const { user } = useAuth()
  const pathname = usePathname()

  if (!user || user.role !== 'user') return null

  if (
    isAuthPath(pathname) ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/gym-owner') ||
    pathname.startsWith('/trainer-dashboard')
  ) {
    return null
  }

  const showOn =
    pathname === '/dashboard' ||
    pathname.startsWith('/my-fitness') ||
    pathname.startsWith('/community') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/meal-plans') ||
    pathname.startsWith('/live-sessions') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/settings')

  if (!showOn) return null

  const links = [
    { href: '/dashboard', icon: Home, label: 'Home', active: pathname === '/dashboard' },
    {
      href: '/my-fitness',
      icon: LayoutDashboard,
      label: 'Fitness',
      active: pathname.startsWith('/my-fitness'),
    },
    {
      href: '/meal-plans',
      icon: UtensilsCrossed,
      label: 'Meals',
      active: pathname.startsWith('/meal-plans'),
    },
    {
      href: '/community',
      icon: Users,
      label: 'Community',
      active: pathname.startsWith('/community'),
    },
    {
      href: '/chat',
      icon: MessageCircle,
      label: 'Chat',
      active: pathname.startsWith('/chat'),
    },
  ]

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-2xl border border-white/[.09] bg-[#0b0e0c]/92 shadow-[0_18px_55px_rgba(0,0,0,.45)] backdrop-blur-2xl md:hidden">
      <div className="flex items-center justify-around p-1.5">
        {links.map((l) => {
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex min-w-12 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all ${
                l.active ? 'bg-primary/[.1] text-primary' : 'text-[#5f6963] hover:text-[#a0aaa4]'
              }`}
            >
              <Icon className="size-4.5" strokeWidth={l.active ? 2.5 : 2} />
              <span className="text-[9px] font-bold">{l.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  )
}
