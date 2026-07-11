import { Activity, BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react'

const benefits = [
  { icon: BrainCircuit, label: 'AI-powered coaching and form analysis' },
  { icon: ShieldCheck, label: 'Verified professionals and secure accounts' },
  { icon: Sparkles, label: 'Training, nutrition, and progress in one place' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(22rem,0.9fr)_1.1fr]">
      <aside className="relative hidden overflow-hidden border-r border-white/[.07] bg-[#090d0a] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,245,154,.18),transparent_23rem),radial-gradient(circle_at_85%_78%,rgba(61,189,255,.1),transparent_20rem)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:58px_58px]" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_35px_rgba(34,245,154,.25)]">
            <Activity className="size-5" strokeWidth={2.7} />
          </span>
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
              <div key={label} className="flex items-center gap-3 text-sm font-semibold text-[#bac3be]">
                <span className="flex size-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/[.07] text-primary">
                  <Icon className="size-4" />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-[#59655e]">Built for ambitious people who want measurable progress.</p>
      </aside>
      <div className="relative min-w-0">{children}</div>
    </div>
  )
}
