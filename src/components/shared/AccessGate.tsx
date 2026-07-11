import type { ReactNode } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccessGateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function AccessGate({ icon: Icon, title, description, action, className }: AccessGateProps) {
  return (
    <div className={cn('flex min-h-[50vh] items-center justify-center px-4', className)}>
      <div className="elite-panel max-w-md px-8 py-12 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <Icon className="size-7 text-primary" strokeWidth={2.2} />
        </div>
        <h2 className="font-heading text-xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  )
}

export function SignInGate({ redirectLabel = 'Sign in to continue' }: { redirectLabel?: string }) {
  return (
    <AccessGate
      icon={LogIn}
      title="Sign in required"
      description="Create an account or sign in to access this feature."
      action={<Link href="/login" className="btn-accent px-8 py-3 text-sm">{redirectLabel}</Link>}
    />
  )
}
