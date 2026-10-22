import Image from 'next/image'

export function BrandMark({ className = 'size-9' }: { className?: string }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} aria-hidden="true">
      <Image src="/brand/logo-light.png" alt="" width={56} height={56} className="size-full object-contain dark:hidden" />
      <Image src="/brand/logo-dark.png" alt="" width={56} height={56} className="hidden size-full object-contain dark:block" />
    </span>
  )
}
