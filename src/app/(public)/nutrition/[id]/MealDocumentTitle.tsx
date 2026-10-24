'use client'

import { useEffect } from 'react'
import { SITE_NAME } from '@/lib/seo'

export function MealDocumentTitle({ name, category }: { name: string; category: string }) {
  useEffect(() => {
    const title = `${name} — ${category} Recipe | ${SITE_NAME}`
    document.title = title
  }, [name, category])

  return null
}
