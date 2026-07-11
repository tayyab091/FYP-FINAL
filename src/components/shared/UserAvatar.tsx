import Image from 'next/image'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name?: string
  image?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'size-10 text-sm',
  md: 'size-12 text-base',
  lg: 'size-20 text-2xl',
}

export function UserAvatar({ name = 'User', image, size = 'md', className }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/15 bg-primary/[.08] font-black text-primary',
        sizes[size],
        className,
      )}
    >
      {image ? (
        <Image src={image} alt={name} fill sizes="96px" className="object-cover" />
      ) : (
        <span>{initials || 'U'}</span>
      )}
    </div>
  )
}
