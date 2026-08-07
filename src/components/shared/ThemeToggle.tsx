'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isLight = (resolvedTheme || theme) === 'light'

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className={cn(
          'flex size-9 items-center justify-center rounded-xl border border-border bg-secondary/40 text-muted-foreground',
          className,
        )}
        disabled
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
        showLabel ? 'px-3 py-2 text-sm font-medium' : 'size-9',
        className,
      )}
    >
      {isLight ? <Moon className="size-4" /> : <Sun className="size-4" />}
      {showLabel && <span>{isLight ? 'Dark mode' : 'Light mode'}</span>}
    </button>
  )
}
