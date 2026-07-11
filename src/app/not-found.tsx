import Link from 'next/link'
import { ArrowLeft, Dumbbell } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-white">
      <div className="page-hero max-w-xl px-8 py-14 text-center sm:px-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <Dumbbell className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-primary">404</p>
        <h1 className="display-title mt-3 text-4xl md:text-5xl">This route missed the mark.</h1>
        <p className="mt-4 text-muted-foreground">
          The page may have moved, or the address is incorrect. Return home or continue with your training.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn-accent gap-2 px-6 py-3">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
          <Link href="/exercises" className="rounded-full border border-white/10 px-6 py-3 text-sm font-bold hover:border-primary/40">
            Browse exercises
          </Link>
        </div>
      </div>
    </div>
  )
}
