'use client'

import { useEffect } from 'react'
import { SITE_NAME } from '@/lib/seo'

export function MealDocumentTitle({ name, category }: { name: string; category: string }) {
  useEffect(() => {
    const title = `${name} — ${category} Recipe | ${SITE_NAME}`
    document.title = title
    // #region agent log
    fetch('http://127.0.0.1:7893/ingest/3b5841b0-46ed-4652-9b9f-279e38a5ba27', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1483ff' },
      body: JSON.stringify({
        sessionId: '1483ff',
        hypothesisId: 'H5',
        runId: 'post-fix',
        location: 'MealDocumentTitle.tsx:useEffect',
        message: 'client document.title set',
        data: { name, category, title },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
  }, [name, category])

  return null
}
