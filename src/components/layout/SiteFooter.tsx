'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isMemberCatalogPath, shouldHideSiteFooter } from '@/lib/shell-routes'
import { BrandMark } from '@/components/shared/BrandMark'
import { ArrowUp, ArrowUpRight } from 'lucide-react'

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
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  if (shouldHideSiteFooter(pathname) || ((isLoading || user?.role === 'user') && isMemberCatalogPath(pathname))) return null

  return (
    <footer className="home-footer" aria-label="T.E.S.T. site footer">
      <div className="home-footer__inner">
        <div className="home-footer__top"><Link href="/" className="home-footer__identity"><BrandMark className="size-8" /><span>BUILT FOR THE LONG RUN.</span></Link><a href="#main-content" className="home-footer__up">BACK TO TOP <ArrowUp size={16} /></a></div>
        <div className="home-footer__grid">
          <div className="home-footer__intro"><h2>THE WORK DOESN’T<br /><em>END HERE.</em></h2><p>A little stronger. A little more consistent.<br />A little closer to who you want to be.</p><Link href="/signup">Make your next move <ArrowUpRight size={18} /></Link></div>
          <nav aria-label="Explore fitness"><h3>GET MOVING</h3>{links.slice(0,5).map(link => <Link href={link.href} key={link.href}>{link.label}<ArrowUpRight size={13} /></Link>)}</nav>
          <nav aria-label="Account and information"><h3>MAKE IT YOURS</h3><Link href="/signup">Join T.E.S.T.<ArrowUpRight size={13} /></Link><Link href="/login">Sign in<ArrowUpRight size={13} /></Link>{links.slice(5).map(link => <Link href={link.href} key={link.href}>{link.label}<ArrowUpRight size={13} /></Link>)}</nav>
        </div>
        <div className="home-footer__brand-strip">
          <div className="home-footer__wordmark" aria-label="Train. Eat. Sleep. Thrive.">{['T','E','S','T'].map((letter,i) => <span key={i}>{letter}<small>{['TRAIN','EAT','SLEEP','THRIVE'][i]}</small></span>)}</div>
          <div className="home-footer__mascot"><svg viewBox="0 0 120 90" role="img" aria-label="Animated athlete lifting a barbell"><path d="M12 83H108" stroke="#294031" /><circle cx="60" cy="18" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M60 26V53M60 53L46 80M60 53L74 80" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" /><g className="home-footer__lift"><path d="M60 32L42 47L32 40M60 32L78 47L88 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" /><path d="M21 40H99" stroke="#22f59a" strokeWidth="3" /><path d="M23 30V50M29 33V47M91 33V47M97 30V50" stroke="#22f59a" strokeWidth="5" strokeLinecap="round" /></g></svg><span>ONE MORE REP.</span></div>
        </div>
        <div className="home-footer__bottom"><span>© {new Date().getFullYear()} T.E.S.T. · Pakistan</span><span className="home-footer__pulse"><i /><i /><i /><i /><i /><span>KEEP YOUR MOMENTUM.</span></span><span>TRAIN WITH PURPOSE.</span></div>
      </div>
    </footer>
  )

}
