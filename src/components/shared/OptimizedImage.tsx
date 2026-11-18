'use client'

import Image, { type ImageProps } from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { bypassImageOptimization } from '@/lib/image-optimization'

/** Retry the original source if the remote optimizer is temporarily unavailable. */
export default function OptimizedImage({ src, alt, unoptimized, onError, ...props }: ImageProps) {
  const [originalSrc, setOriginalSrc] = useState<ImageProps['src'] | null>(null)
  const [retry, setRetry] = useState<{ src: ImageProps['src']; attempt: number } | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current) }, [])
  const attempt = retry?.src === src ? retry.attempt : 0
  let requestSrc = src
  if (typeof src === 'string' && attempt > 0) {
    const url = new URL(src)
    url.searchParams.set('_preview_retry', String(attempt))
    requestSrc = url.href
  }
  const bypass = unoptimized ?? (typeof src === 'string' && bypassImageOptimization(src))
  return <Image {...props} src={requestSrc} alt={alt} unoptimized={bypass || originalSrc === src} onError={event => {
    if (!bypass && originalSrc !== src) setOriginalSrc(src)
    else if (typeof src === 'string' && src.startsWith('https://static.exercisedb.dev/') && attempt < 2) {
      if (!retryTimer.current) retryTimer.current = setTimeout(() => {
        retryTimer.current = null
        setRetry({ src, attempt: attempt + 1 })
      }, 300 * (attempt + 1))
    }
    else onError?.(event)
  }} />
}
