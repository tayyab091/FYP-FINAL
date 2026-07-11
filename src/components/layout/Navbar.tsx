'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { Activity, ArrowUpRight, Menu, X } from 'lucide-react'
import { easeTransition } from '@/lib/motion'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export function Navbar() {
  const { user, isLoading, logout } = useAuth()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const hideOn = [
    '/admin', '/gym-owner', '/trainer-dashboard', '/my-fitness', '/chat', '/settings',
    '/login', '/signup', '/register-trainer', '/register-gym-owner',
  ]
  if (hideOn.some(p => pathname.startsWith(p))) return null

  const navLinks = [
    { label: 'Find Trainers', href: '/coaching' },
    { label: 'Exercises', href: '/exercises' },
    { label: 'Form Checker', href: '/exercise-check' },
    { label: 'Nutrition', href: '/nutrition' },
    { label: 'Pricing', href: '/subscription' },
  ]

  const getDashboardHref = () => {
    if (!user) return '/login'
    switch (user.role) {
      case 'admin': case 'super_admin': return '/admin'
      case 'trainer': return '/trainer-dashboard'
      case 'gym_owner': return '/gym-owner'
      default: return '/my-fitness'
    }
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-6 ${
      scrolled ? 'py-3' : 'py-5'
    }`}>
      <div className={`max-w-6xl mx-auto flex items-center justify-between rounded-2xl px-4 transition-all duration-300 ${
        scrolled ? 'h-14 border border-white/[.08] bg-[#090c0a]/88 shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-2xl' : 'h-12'
      }`}>
        <Link href="/" className="group flex flex-shrink-0 items-center gap-2.5">
          <motion.span
            whileHover={reduceMotion ? {} : { scale: 1.05, rotate: -4 }}
            className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_28px_rgba(34,245,154,.22)]"
          >
            <Activity className="size-4.5" strokeWidth={2.6} />
          </motion.span>
          <span className="font-heading text-lg font-black tracking-[-.045em] text-white">T.E.S.T.</span>
        </Link>

        <div className="relative hidden md:flex items-center gap-1 rounded-xl border border-white/[.055] bg-white/[.025] p-1">
          {navLinks.map(l => {
            const active = pathname.startsWith(l.href)
            return (
              <Link key={l.href} href={l.href}
                className={`relative rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:bg-white/[.04] hover:text-white'
                }`}>
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-primary/[.1] border border-primary/20"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="w-24 h-8 skeleton rounded-full" />
          ) : user ? (
            <>
              <NotificationBell />
              <Link href={getDashboardHref()}
                className="text-sm text-muted-foreground hover:text-white transition-colors font-medium">
                Dashboard
              </Link>
              <Link href="/settings"
                className="text-sm text-muted-foreground hover:text-white transition-colors font-medium">
                Settings
              </Link>
              <button onClick={logout}
                className="text-sm text-muted-foreground hover:text-[#ef4444] transition-colors font-medium">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login"
                className="text-sm text-muted-foreground hover:text-white transition-colors font-medium">
                Sign In
              </Link>
              <Link href="/signup" className="btn-accent gap-1.5 px-5 py-2 text-sm">
                Get Started <ArrowUpRight className="size-3.5" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          className="flex size-10 items-center justify-center rounded-xl border border-white/[.08] bg-white/[.035] text-white md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
            transition={easeTransition}
            className="absolute left-4 right-4 top-[calc(100%+.25rem)] space-y-2 rounded-2xl border border-white/[.09] bg-[#0b0e0c]/96 p-4 shadow-2xl backdrop-blur-2xl md:hidden"
          >
            {navLinks.map((l, i) => (
              <motion.div
                key={l.href}
                initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...easeTransition, delay: i * 0.04 }}
              >
                <Link href={l.href} onClick={() => setMenuOpen(false)}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-bold ${
                    pathname.startsWith(l.href) ? 'bg-primary/[.1] text-primary' : 'text-[#a0aaa4] hover:bg-white/[.04] hover:text-white'
                  }`}>
                  {l.label}
                </Link>
              </motion.div>
            ))}
            <div className="pt-4 border-t border-border flex flex-col gap-3">
              {user ? (
                <>
                  <Link href={getDashboardHref()} onClick={() => setMenuOpen(false)}
                    className="text-center border border-border text-white py-3 rounded-2xl font-medium">
                    Dashboard
                  </Link>
                  <Link href="/settings" onClick={() => setMenuOpen(false)}
                    className="text-center border border-border text-white py-3 rounded-2xl font-medium">
                    Settings
                  </Link>
                  <button onClick={() => { logout(); setMenuOpen(false) }}
                    className="text-center text-[#ef4444] font-medium py-2">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)}
                    className="text-center border border-border text-white py-3 rounded-2xl font-medium">
                    Sign In
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)}
                    className="btn-accent py-3 text-center font-bold">
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
