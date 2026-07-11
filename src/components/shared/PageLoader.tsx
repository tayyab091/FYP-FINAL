import { Dumbbell } from 'lucide-react'

interface PageLoaderProps {
  label?: string
}

export function PageLoader({ label = 'Warming up your workspace' }: PageLoaderProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="elite-panel flex flex-col items-center gap-4 px-8 py-7">
        <div className="relative">
          <div className="size-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <Dumbbell className="absolute inset-0 m-auto size-4 text-primary" strokeWidth={2.5} />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="workout-label text-primary/60">Loading · Stay ready</p>
      </div>
    </div>
  )
}
