'use client'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, Send, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface Message { role: 'user' | 'assistant'; content: string }

const GUEST_OPENING =
  'Hi! I\'m your T.E.S.T. AI fitness coach 🤖\n\n'
  + 'I can calculate your daily calories! Tell me your weight, height, age and gender.\n\n'
  + 'Example: "I am 25, 75kg, 178cm, male"'

const LOGGED_IN_OPENING =
  'Hi! I\'m your T.E.S.T. AI fitness coach 🤖 Ask me anything about workouts, nutrition, or your fitness goals!'

const GUEST_CHIPS = [
  { label: 'Calculate my calories', value: 'Calculate my calories' },
  { label: 'How to lose fat?', value: 'How to lose fat?' },
  { label: 'Pakistani food calories', value: 'Pakistani food calories' },
]

export function AIChatbot() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const isGuest = !isLoading && !user
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (isLoading) return
    if (initializedRef.current) return
    initializedRef.current = true
    setMessages([
      { role: 'assistant', content: isGuest ? GUEST_OPENING : LOGGED_IN_OPENING },
    ])
  }, [isLoading, isGuest])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (pathname.startsWith('/chat')) return null
  if (pathname === '/' && !isLoading && !user) return null

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages.slice(-6) }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply || 'Sorry, try again.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleChipClick = (value: string) => {
    setInput(value)
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label="AI Fitness Coach"
        className="fixed z-50 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_16px_45px_color-mix(in_srgb,var(--primary)_26%,transparent)] transition-transform hover:-translate-y-1 right-5 md:right-6 dark:from-[#55ffb1] dark:shadow-[0_16px_45px_rgba(34,245,154,.26)]"
        style={{ bottom: 160 }}>
        {open ? <X className="size-5" /> : <Bot className="size-6" />}
      </button>

      {open && (
        <div className="fixed right-3 md:right-6 z-50 flex w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-card/95 shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-2xl"
          style={{ height: 420, bottom: 230 }}>
          <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/[.09] text-primary"><Bot className="size-4" /></div>
            <div>
              <div className="text-sm font-bold">AI Fitness Coach</div>
              <div className="text-[10px] text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Online
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground font-semibold rounded-br-sm'
                    : 'bg-muted border border-border text-foreground rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
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

          {isGuest && (
            <div className="px-3 pb-2 flex gap-1.5 flex-shrink-0 overflow-x-auto">
              {GUEST_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleChipClick(chip.value)}
                  className="flex-shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <div className="px-3 py-3 border-t border-border flex gap-2 flex-shrink-0">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about fitness, nutrition..."
              className="flex-1 bg-muted/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors" />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40">
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
