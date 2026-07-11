'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Apple, Dumbbell, Home, LayoutDashboard, MessageCircle } from 'lucide-react'

export function BottomNav() {
  const { user } = useAuth()
  const pathname = usePathname()

  if (!user || user.role !== 'user') return null

  const hideOn = ['/admin', '/gym-owner', '/trainer-dashboard', '/login', '/signup', '/register-trainer', '/register-gym-owner']
  if (hideOn.some(p => pathname.startsWith(p))) return null

  const links = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/coaching', icon: Dumbbell, label: 'Trainers' },
    { href: '/my-fitness', icon: LayoutDashboard, label: 'Fitness' },
    { href: '/nutrition', icon: Apple, label: 'Nutrition' },
    { href: '/chat', icon: MessageCircle, label: 'Chat' },
  ]

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-2xl border border-white/[.09] bg-[#0b0e0c]/92 shadow-[0_18px_55px_rgba(0,0,0,.45)] backdrop-blur-2xl md:hidden">
      <div className="flex items-center justify-around p-1.5">
        {links.map(l => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
          const Icon = l.icon
          return (
            <Link key={l.href} href={l.href}
              className={`flex min-w-12 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all ${
                active ? 'bg-primary/[.1] text-primary' : 'text-[#5f6963] hover:text-[#a0aaa4]'
              }`}>
              <Icon className="size-4.5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[9px] font-bold">{l.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
