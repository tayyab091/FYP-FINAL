'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface AuthUser {
  id: string
  _id?: string
  fullName: string
  email: string
  role: 'user' | 'trainer' | 'gym_owner' | 'admin' | 'super_admin'
  country?: string
  profileImage?: string
  avatarUrl?: string
  subscription?: { plan: string; status: string }
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchMe = useCallback(async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      return await fetch('/api/auth/me', { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    // A 401 is a definitive "not authenticated" answer, so it's applied immediately.
    // Any other failure (network error, timeout, 5xx) is treated as transient: it's
    // retried once, and if it still fails the existing session is left untouched
    // instead of being wiped, so a flaky auth check can't force a valid session
    // into a false "signed out" state (which previously bounced users off protected
    // pages onto a "Sign in" screen whose Link the proxy would immediately redirect
    // straight back to the page they were already authenticated on).
    let res: Response | null = null
    try {
      res = await fetchMe()
    } catch {
      res = null
    }

    if (res?.status === 401) {
      setUser(null)
      setIsLoading(false)
      return
    }

    if (!res || !res.ok) {
      try {
        res = await fetchMe()
      } catch {
        res = null
      }
    }

    if (res?.status === 401) {
      setUser(null)
    } else if (res?.ok) {
      const data = await res.json()
      setUser(data.user ? { ...data.user, id: data.user.id || data.user._id } : null)
    }
    setIsLoading(false)
  }, [fetchMe])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message }
      setUser(data.user)
      return { success: true }
    } catch {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }
    router.replace('/')
    router.refresh()
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
