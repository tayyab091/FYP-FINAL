'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Activity, ArrowUpRight, Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { shouldHidePublicNavbar } from '@/lib/shell-routes'
import { easeTransition } from '@/lib/motion'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { getRoleHomePath } from '@/lib/access'

const NAV_LINKS = [
  { label: 'Find Trainers', href: '/coaching' },
  { label: 'Exercises', href: '/exercises' },
  { label: 'Form Checker', href: '/exercise-check' },
  { label: 'Nutrition', href: '/nutrition' },
  { label: 'Pricing', href: '/subscription' },
] as const

export function Navbar() {
  const { user, isLoading, logout } = useAuth()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  if (shouldHidePublicNavbar(pathname)) return null

  const dashboardHref = user ? getRoleHomePath(user.role) : '/login'

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 h-16 border-b transition-colors duration-300 ${
          scrolled || menuOpen
            ? 'border-white/[.09] bg-[#070908]/92 shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur-2xl'
            : 'border-transparent bg-[#070908]/72 backdrop-blur-xl'
        }`}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href={user ? '/?marketing=1' : '/'} className="group flex shrink-0 items-center gap-2.5">
            <motion.span
              whileHover={reduceMotion ? {} : { scale: 1.05, rotate: -4 }}
              className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_28px_rgba(34,245,154,.22)]"
            >
              <Activity className="size-4.5" strokeWidth={2.6} />
            </motion.span>
            <span className="font-heading text-lg font-black tracking-[-.045em] text-white">T.E.S.T.</span>
          </Link>

          <div className="ml-2 hidden flex-1 items-center justify-center md:flex">
            <div className="flex items-center gap-0.5 rounded-xl border border-white/[.06] bg-white/[.025] p-1">
              {NAV_LINKS.map((l) => {
                const active = pathname === l.href || pathname.startsWith(`${l.href}/`)
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`relative rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      active ? 'text-primary' : 'text-muted-foreground hover:bg-white/[.04] hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg border border-primary/20 bg-primary/[.1]"
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative">{l.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="ml-auto hidden items-center gap-2.5 md:flex">
            {isLoading ? (
              <div className="h-8 w-28 animate-pulse rounded-full bg-white/[.06]" />
            ) : user ? (
              <>
                <NotificationBell />
                <Link
                  href={dashboardHref}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[.04] hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[.04] hover:text-white"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-white"
                >
                  Sign In
                </Link>
                <Link href="/signup" className="btn-accent btn-sm gap-1.5 px-4">
                  Get Started <ArrowUpRight className="size-3.5" />
                </Link>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            {!isLoading && !user && (
              <Link href="/signup" className="btn-accent btn-sm px-3.5">
                Join
              </Link>
            )}
            <button
              type="button"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              className="flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/[.08] text-primary shadow-[0_0_20px_rgba(34,245,154,.12)]"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Spacer so fixed nav does not cover page content */}
      <div className="h-16 shrink-0" aria-hidden />

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={easeTransition}
            className="fixed inset-0 z-[60] md:hidden"
          >
            <button
              type="button"
              aria-label="Close navigation overlay"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              initial={reduceMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reduceMotion ? undefined : { x: '100%' }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }}
              className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col border-l border-white/[.09] bg-[#070908] shadow-2xl"
            >
              <div className="flex h-16 items-center justify-between border-b border-white/[.08] px-4">
                <span className="font-heading text-base font-black tracking-[-.04em] text-white">Menu</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="flex size-9 items-center justify-center rounded-lg border border-white/[.08] text-muted-foreground hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  <X className="size-4.5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                {NAV_LINKS.map((l, i) => {
                  const active = pathname === l.href || pathname.startsWith(`${l.href}/`)
                  return (
                    <motion.div
                      key={l.href}
                      initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...easeTransition, delay: i * 0.035 }}
                    >
                      <Link
                        href={l.href}
                        onClick={() => setMenuOpen(false)}
                        className={`block rounded-xl px-3 py-3 text-sm font-bold transition-colors ${
                          active
                            ? 'border border-primary/20 bg-primary/[.1] text-primary'
                            : 'text-[#a0aaa4] hover:bg-white/[.04] hover:text-white'
                        }`}
                      >
                        {l.label}
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>

              <div className="space-y-2 border-t border-white/[.08] p-4">
                {user ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl border border-border py-3 text-center text-sm font-medium text-white"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl border border-border py-3 text-center text-sm font-medium text-white"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void logout()
                        setMenuOpen(false)
                      }}
                      className="w-full py-2 text-center text-sm font-medium text-red-400"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="btn-outline w-full text-sm"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="btn-accent w-full text-sm"
                    >
                      Get Started Free
                    </Link>
                  </>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
