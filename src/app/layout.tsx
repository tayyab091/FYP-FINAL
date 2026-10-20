import type { Metadata } from 'next'
import { Manrope, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Navbar } from '@/components/layout/Navbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { AIChatbot } from '@/components/shared/AIChatbot'
import { Toaster } from 'sonner'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'T.E.S.T. — Train. Eat. Sleep. Thrive.',
  description: "Pakistan's first AI-powered fitness coaching platform. Connect with verified trainers, track nutrition, and achieve your fitness goals.",
  keywords: 'fitness, trainer, workout, nutrition, Pakistan, AI coaching',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-xl transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <Providers>
          <Navbar />
          <main id="main-content" tabIndex={-1} className="flex min-h-screen flex-col">{children}</main>
          <SiteFooter />
          <BottomNav />
          <AIChatbot />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: '#0e1210',
                border: '1px solid rgba(255,255,255,.09)',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
