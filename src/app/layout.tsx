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

export const metadata: Metadata = {
  title: 'T.E.S.T. — Train. Eat. Sleep. Thrive.',
  description: "Pakistan's first AI-powered fitness coaching platform. Connect with verified trainers, track nutrition, and achieve your fitness goals.",
  keywords: 'fitness, trainer, workout, nutrition, Pakistan, AI coaching',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        <Providers>
          <Navbar />
          <main className="flex min-h-screen flex-col">{children}</main>
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
