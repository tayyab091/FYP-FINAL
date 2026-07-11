import { Suspense } from 'react'

function LoginFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoginFallback />}>{children}</Suspense>
}
