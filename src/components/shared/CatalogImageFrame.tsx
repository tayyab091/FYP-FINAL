'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'

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
}: CatalogImageFrameProps) {
  const showImage = Boolean(src) && !hasError

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
          className={fit === 'cover' ? 'object-cover' : 'object-contain'}
          priority={priority}
          loading={priority ? undefined : loading}
          onError={onError}
        />
      ) : (
        fallback
      )}
      {badge}
    </div>
  )
}
