'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchPublicData } from '@/lib/public-data-cache'

export function usePublicData() {
  const client = useQueryClient()
  return useCallback(<T,>(path: string, signal?: AbortSignal) => fetchPublicData<T>(client, path, signal), [client])
}
