'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { resolveAvatarUrl, withCloudinaryAvatarTransform } from '@/lib/avatar'

const SIZE_MAP = {
  xs: 32,
  sm: 40,
  md: 48,
  lg: 80,
  xl: 112,
} as const

export type AvatarSize = keyof typeof SIZE_MAP | number

export interface AvatarProps {
  name?: string
  avatarUrl?: string | null
  /** @deprecated Use avatarUrl — kept for backward compatibility */
  image?: string | null
  size?: AvatarSize
  className?: string
  loading?: boolean
  rounded?: 'full' | 'xl' | '2xl'
}

function getPixels(size: AvatarSize): number {
  return typeof size === 'number' ? size : SIZE_MAP[size]
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  )
}

export function Avatar({
  name = 'User',
  avatarUrl,
  image,
  size = 'md',
  className,
  loading = false,
  rounded = 'full',
}: AvatarProps) {
  const [broken, setBroken] = useState(false)
  const resolved = resolveAvatarUrl({ avatarUrl, profileImage: image })
  const px = getPixels(size)
  const showImage = Boolean(resolved) && !broken && !loading

  const roundedClass =
    rounded === 'full' ? 'rounded-full' : rounded === 'xl' ? 'rounded-xl' : 'rounded-2xl'

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden border border-primary/15 bg-primary/[.08] font-black text-primary',
        roundedClass,
        className,
      )}
      style={{ width: px, height: px, fontSize: Math.max(10, Math.round(px * 0.35)) }}
    >
      {loading ? (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      ) : showImage ? (
        <Image
          src={withCloudinaryAvatarTransform(resolved!, px * 2)}
          alt={name}
          width={px}
          height={px}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  )
}
