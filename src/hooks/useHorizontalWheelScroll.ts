'use client'

import { useEffect, useRef, type RefObject } from 'react'

export function useHorizontalWheelScroll<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (delta === 0) return
      el.scrollLeft += delta
      event.preventDefault()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return ref
}
