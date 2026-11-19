'use client'

import { useEffect } from 'react'
import ErrorPage from './error'
import './globals.css'

export default function GlobalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', localStorage.getItem('theme') === 'dark')
    } catch { /* Use the default light theme if storage is unavailable. */ }
  }, [])
  return <html lang="en" suppressHydrationWarning><body><ErrorPage error={error} unstable_retry={unstable_retry} /></body></html>
}
