import Link from 'next/link'
import { ArrowLeft, Dumbbell } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 text-white">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#00ff87]/20 bg-[#00ff87]/10">
          <Dumbbell className="h-8 w-8 text-[#00ff87]" />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#00ff87]">404</p>
        <h1 className="mt-3 text-4xl font-black">This route missed the mark.</h1>
        <p className="mt-4 text-[#888]">
          The page may have moved, or the address is incorrect. Return home or continue with your training.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn-accent gap-2 px-6 py-3">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
          <Link href="/exercises" className="rounded-full border border-white/10 px-6 py-3 text-sm font-bold hover:border-[#00ff87]/40">
            Browse exercises
          </Link>
        </div>
      </div>
    </main>
  )
}
