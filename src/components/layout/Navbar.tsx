'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function Navbar() {
  const { user, isLoading, logout } = useAuth()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const hideOn = ['/admin', '/gym-owner', '/trainer-dashboard']
  if (hideOn.some(p => pathname.startsWith(p))) return null

  const navLinks = [
    { label: 'Find Trainers', href: '/coaching' },
    { label: 'Exercises', href: '/exercises' },
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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 ${
      scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-[#1a1a1a] shadow-xl' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-black text-xl gradient-text flex-shrink-0">
          T.E.S.T.
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className={`text-sm font-medium transition-colors ${
                pathname.startsWith(l.href) ? 'text-[#00ff87]' : 'text-[#a0a0a0] hover:text-white'
              }`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="w-24 h-8 skeleton rounded-full" />
          ) : user ? (
            <>
              <Link href={getDashboardHref()}
                className="text-sm text-[#a0a0a0] hover:text-white transition-colors font-medium">
                Dashboard
              </Link>
              <button onClick={logout}
                className="text-sm text-[#a0a0a0] hover:text-[#ef4444] transition-colors font-medium">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login"
                className="text-sm text-[#a0a0a0] hover:text-white transition-colors font-medium">
                Sign In
              </Link>
              <Link href="/signup" className="btn-accent px-5 py-2 text-sm">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden flex flex-col gap-1.5 p-2" onClick={() => setMenuOpen(!menuOpen)}>
          <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0a0a0a] border-b border-[#1a1a1a] p-6 space-y-4">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="block text-[#a0a0a0] hover:text-white font-medium py-1.5">
              {l.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-[#1a1a1a] flex flex-col gap-3">
            {user ? (
              <>
                <Link href={getDashboardHref()} onClick={() => setMenuOpen(false)}
                  className="text-center border border-[#2a2a2a] text-white py-3 rounded-2xl font-medium">
                  Dashboard
                </Link>
                <button onClick={() => { logout(); setMenuOpen(false) }}
                  className="text-center text-[#ef4444] font-medium py-2">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)}
                  className="text-center border border-[#2a2a2a] text-white py-3 rounded-2xl font-medium">
                  Sign In
                </Link>
                <Link href="/signup" onClick={() => setMenuOpen(false)}
                  className="btn-accent py-3 text-center font-bold">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
