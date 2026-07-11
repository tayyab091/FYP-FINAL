import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Navbar } from '@/components/layout/Navbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { AIChatbot } from '@/components/shared/AIChatbot'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'T.E.S.T. — Train. Eat. Sleep. Thrive.',
  description: "Pakistan's first AI-powered fitness coaching platform. Connect with verified trainers, track nutrition, and achieve your fitness goals.",
  keywords: 'fitness, trainer, workout, nutrition, Pakistan, AI coaching',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main>{children}</main>
          <BottomNav />
          <AIChatbot />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: '#111',
                border: '1px solid #2a2a2a',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
