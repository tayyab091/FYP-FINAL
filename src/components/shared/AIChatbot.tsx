'use client'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, Send, X } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = ['Help me gain weight', 'Build a fat-loss plan', 'Improve my 5K time']

export function AIChatbot() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your T.E.S.T. AI fitness coach 🤖 Ask me anything about workouts, nutrition, or your fitness goals!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const hiddenRoutes = ['/chat', '/login', '/signup', '/register-trainer', '/register-gym-owner', '/forgot-password', '/reset-password', '/verify-email']
  if (hiddenRoutes.some((route) => pathname.startsWith(route))) return null

  const send = async (suggested?: string) => {
    const msg = (suggested ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages.slice(-6) })
      })
      const data = await res.json()
      if (!res.ok && !data.reply) throw new Error(data.message || 'Coach unavailable')
      setMessages(m => [...m, { role: 'assistant', content: data.reply || 'Sorry, try again.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Close AI Fitness Coach' : 'Open AI Fitness Coach'} aria-expanded={open} aria-controls="ai-fitness-coach" data-ai-chatbot-trigger
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#26d788] to-[#087d50] text-white shadow-[0_16px_45px_rgba(34,245,154,.26)] transition-transform hover:-translate-y-1 md:bottom-6 md:right-6 md:size-14">
        {open ? <X className="size-5" /> : <Bot className="size-6" />}
      </button>

      {open && (
        <div id="ai-fitness-coach" role="dialog" aria-label="AI Fitness Coach" className="fixed bottom-[calc(10rem+env(safe-area-inset-bottom))] right-3 z-50 flex h-[min(30rem,calc(100dvh-11rem))] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-white/[.1] bg-[#0c100d]/96 shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-2xl md:bottom-24 md:right-6">
          <div className="px-4 py-3 border-b border-white/[.07] flex items-center gap-3 flex-shrink-0">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/[.09] text-primary"><Bot className="size-4" /></div>
            <div>
              <div className="text-sm font-bold">AI Fitness Coach</div>
              <div className="text-[10px] text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Goal-aware coach
              </div>
            </div>
          </div>

          <div role="log" aria-live="polite" aria-relevant="additions" className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] break-words whitespace-pre-wrap px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground font-semibold rounded-br-sm'
                    : 'bg-white/[.06] border border-white/[.06] text-white rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => void send(prompt)} className="rounded-full border border-primary/20 bg-primary/[.06] px-3 py-1.5 text-left text-[11px] font-semibold text-primary hover:bg-primary/[.12]">
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            {loading && (
              <div className="flex justify-start" role="status" aria-label="AI coach is responding">
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t border-white/[.07] flex gap-2 flex-shrink-0">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} maxLength={1000}
              onKeyDown={e => e.key === 'Enter' && void send()}
              aria-label="Message the AI fitness coach"
              autoComplete="off"
              placeholder="Ask about fitness, nutrition..."
              className="flex-1 bg-black/25 border border-white/[.09] rounded-xl px-3 py-2 text-sm text-white placeholder-[#56615b] outline-none focus:border-primary/40 transition-colors" />
            <button type="button" onClick={() => void send()} disabled={!input.trim() || loading} aria-label="Send message"
              className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40">
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
