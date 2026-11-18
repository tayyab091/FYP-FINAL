'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { Bot } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isDashboardShellPath } from '@/lib/shell-routes'

function ChatLauncher({ onClick, loading = false }: { onClick?: () => void; loading?: boolean }) {
  return <button type="button" onClick={onClick} disabled={loading} aria-label={loading ? 'Loading AI Fitness Coach' : 'Open AI Fitness Coach'} aria-expanded="false" className="ai-chatbot__fab"><span className="ai-chatbot__fab-icon"><Bot className="size-6" strokeWidth={2} /></span></button>
}

const ChatPanel = dynamic(() => import('./AIChatbotPanel').then(module => module.AIChatbotPanel), {
  ssr: false,
  loading: () => <ChatLauncher loading />,
})

export function AIChatbot() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [activated, setActivated] = useState(false)
  useEffect(() => {
    if (user?.role === 'user' && (isDashboardShellPath(pathname) || pathname.startsWith('/leaderboard'))) document.documentElement.dataset.aiChatBottomNav = 'true'
    else delete document.documentElement.dataset.aiChatBottomNav
    return () => { delete document.documentElement.dataset.aiChatBottomNav }
  }, [pathname, user?.role])
  if (pathname.startsWith('/chat')) return null
  return activated ? <ChatPanel /> : <ChatLauncher onClick={() => setActivated(true)} />
}
