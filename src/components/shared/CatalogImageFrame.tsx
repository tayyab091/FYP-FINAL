'use client'

import Image from '@/components/shared/OptimizedImage'
import { useState, type ReactNode } from 'react'
import { ImageOff } from 'lucide-react'

type CatalogImageVariant = 'card' | 'detail'

const VARIANT_STYLES: Record<CatalogImageVariant, string> = {
  card: 'aspect-[4/3] h-48 max-h-48',
  detail: 'aspect-video h-56 sm:h-64 max-h-64',
}

interface CatalogImageFrameProps {
  src?: string
  alt: string
  variant?: CatalogImageVariant
  fit?: 'contain' | 'cover'
  priority?: boolean
  loading?: 'lazy' | 'eager'
  sizes?: string
  fallback?: ReactNode
  badge?: ReactNode
  hasError?: boolean
  onError?: () => void
  className?: string
  imageClassName?: string
}

export function CatalogImageFrame({
  src,
  alt,
  variant = 'card',
  fit = 'contain',
  priority,
  loading = 'lazy',
  sizes,
  fallback,
  badge,
  hasError = false,
  onError,
  className = '',
  imageClassName = '',
}: CatalogImageFrameProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>()
  const showImage = Boolean(src) && !hasError && failedSrc !== src

  return (
    <div
      className={`relative w-full shrink-0 overflow-hidden bg-card flex items-center justify-center ${VARIANT_STYLES[variant]} ${className}`}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes={sizes ?? (variant === 'card' ? '(max-width: 768px) 100vw, 33vw' : '(max-width: 768px) 100vw, 896px')}
          className={`${fit === 'cover' ? 'object-cover' : 'object-contain'} ${imageClassName}`}
          priority={priority}
          loading={priority ? undefined : loading}
          onError={() => { setFailedSrc(src); onError?.() }}
        />
      ) : (
        fallback ?? <span role="img" aria-label={`${alt}: preview unavailable`} className="flex flex-col items-center gap-2 p-4 text-center text-sm text-muted-foreground"><ImageOff className="size-7" aria-hidden="true" />Preview unavailable</span>
      )}
      {badge}
    </div>
  )
}
