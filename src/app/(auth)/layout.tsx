import { BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NO_INDEX_METADATA } from '@/lib/seo'
import { BrandMark } from '@/components/shared/BrandMark'
import { PagePhoto } from '@/components/shared/PagePhoto'

export const metadata = NO_INDEX_METADATA

const benefits = [
  { icon: BrainCircuit, label: 'AI-powered coaching and form analysis' },
  { icon: ShieldCheck, label: 'Verified professionals and secure accounts' },
  { icon: Sparkles, label: 'Training, nutrition, and progress in one place' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen xl:grid-cols-[minmax(22rem,0.9fr)_1.1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-card p-10 xl:flex xl:flex-col xl:justify-between xl:p-14">

        <div className="relative flex items-center gap-3">
          <BrandMark className="size-10" />
          <span className="font-heading text-xl font-black tracking-[-.045em]">T.E.S.T.</span>
        </div>

        <div className="relative max-w-lg">
          <p className="eyebrow mb-5">Train. Eat. Sleep. Thrive.</p>
          <h2 className="display-title text-balance text-5xl xl:text-6xl">
            Your complete fitness operating system.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Build a stronger body with expert coaching, intelligent tracking, and a community designed for lasting progress.
          </p>
          <div className="mt-10 space-y-4">
            {benefits.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <span className="flex size-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/[.07] text-primary">
                  <Icon className="size-4" />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="auth-photo"><PagePhoto kind="coaching" /></div>
        <p className="relative text-xs text-muted-foreground">Built for ambitious people who want measurable progress.</p>
      </aside>
      <div className="relative min-w-0">
        <Link href="/" className="absolute left-4 top-4 z-20 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-xl transition-colors hover:border-primary/25 hover:text-primary sm:left-6 sm:top-6">
          <ArrowLeft className="size-3.5" /> Return home
        </Link>
        {children}
      </div>
    </div>
  )
}
