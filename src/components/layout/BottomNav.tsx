'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export function BottomNav() {
  const { user } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const hideOn = ['/admin', '/gym-owner', '/trainer-dashboard', '/login', '/signup']
  if (hideOn.some(p => pathname.startsWith(p))) return null

  const links = [
    { href: '/', icon: '🏠', label: 'Home' },
    { href: '/coaching', icon: '🏋️', label: 'Trainers' },
    { href: '/my-fitness', icon: '📊', label: 'Fitness' },
    { href: '/nutrition', icon: '🥗', label: 'Nutrition' },
    { href: '/chat', icon: '💬', label: 'Chat' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#111]/95 backdrop-blur-xl border-t border-[#1a1a1a] pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {links.map(l => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                active ? 'text-[#00ff87] bg-[#00ff87]/10' : 'text-[#555] hover:text-[#a0a0a0]'
              }`}>
              <span className="text-xl">{l.icon}</span>
              <span className="text-[10px] font-medium">{l.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
