'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity } from 'lucide-react'
import { shouldHideSiteFooter } from '@/lib/shell-routes'

const links = [
  { label: 'Trainers', href: '/coaching' },
  { label: 'Exercises', href: '/exercises' },
  { label: 'Form Checker', href: '/exercise-check' },
  { label: 'Nutrition', href: '/nutrition' },
  { label: 'Pricing', href: '/subscription' },
]

export function SiteFooter() {
  const pathname = usePathname()
  if (shouldHideSiteFooter(pathname)) return null

  return (
    <footer className="mt-auto border-t border-border py-12 px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 md:flex-row">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_28px_rgba(34,245,154,.2)]">
            <Activity className="size-4.5" strokeWidth={2.6} />
          </span>
          <span className="font-heading text-lg font-black tracking-[-.045em] gradient-text">T.E.S.T.</span>
        </Link>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">© 2026 T.E.S.T. All rights reserved.</p>
      </div>
    </footer>
  )
}
