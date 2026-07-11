'use client'

import type { InputHTMLAttributes, ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  trailing?: ReactNode
}

export function AuthField({ label, error, trailing, className, id, ...props }: AuthFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div>
      <Label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input id={fieldId} className={cn(trailing && 'pr-12', className)} {...props} />
        {trailing}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
