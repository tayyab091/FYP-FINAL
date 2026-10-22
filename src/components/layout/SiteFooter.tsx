'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { shouldHideSiteFooter } from '@/lib/shell-routes'
import { BrandMark } from '@/components/shared/BrandMark'

const links = [
  { label: 'Trainers', href: '/coaching' },
  { label: 'Gyms', href: '/gyms' },
  { label: 'Exercises', href: '/exercises' },
  { label: 'Form Checker', href: '/exercise-check' },
  { label: 'Nutrition', href: '/nutrition' },
  { label: 'Pricing', href: '/subscription' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
]

export function SiteFooter() {
  const pathname = usePathname()
  if (shouldHideSiteFooter(pathname)) return null

  return (
    <footer className="mt-auto border-t border-border py-12 px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 md:flex-row">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="size-9" />
          <span className="font-heading text-lg font-black tracking-[-.045em] gradient-text">T.E.S.T.</span>
        </Link>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">© 2026 T.E.S.T. All rights reserved.</p>
      </div>
    </footer>
  )
}
