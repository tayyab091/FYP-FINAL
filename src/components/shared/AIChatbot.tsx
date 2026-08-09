'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, Send, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

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
  const [visible, setVisible] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (open && visible) {
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [open, visible])

  if (pathname.startsWith('/chat')) return null

  const toggle = () => {
    if (open) {
      setOpen(false)
      if (closeTimer.current) clearTimeout(closeTimer.current)
      closeTimer.current = setTimeout(() => setVisible(false), 220)
      return
    }
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setVisible(true)
    requestAnimationFrame(() => setOpen(true))
  }

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages.slice(-6) }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || 'Sorry, try again.' }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleChipClick = (value: string) => {
    void send(value)
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close AI Fitness Coach' : 'Open AI Fitness Coach'}
        aria-expanded={open}
        className="ai-chatbot__fab"
      >
        <span className={`ai-chatbot__fab-icon ${open ? 'ai-chatbot__fab-icon--open' : ''}`}>
          {open ? <X className="size-5" strokeWidth={2.25} /> : <Bot className="size-6" strokeWidth={2} />}
        </span>
      </button>

      {visible && (
        <div
          className={`ai-chatbot__panel ${open ? 'ai-chatbot__panel--open' : 'ai-chatbot__panel--closing'}`}
          role="dialog"
          aria-label="AI Fitness Coach"
          aria-modal="false"
        >
          <header className="ai-chatbot__header">
            <div className="ai-chatbot__avatar" aria-hidden>
              <Bot className="size-4" />
            </div>
            <div className="ai-chatbot__title-wrap">
              <div className="ai-chatbot__title">AI Fitness Coach</div>
              <div className="ai-chatbot__status">
                <span className="ai-chatbot__status-dot" />
                Online
              </div>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="ai-chatbot__close"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="ai-chatbot__messages">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`ai-chatbot__row ${m.role === 'user' ? 'ai-chatbot__row--user' : 'ai-chatbot__row--bot'}`}
              >
                <div
                  className={`ai-chatbot__bubble ${
                    m.role === 'user' ? 'ai-chatbot__bubble--user' : 'ai-chatbot__bubble--bot'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-chatbot__row ai-chatbot__row--bot">
                <div className="ai-chatbot__bubble ai-chatbot__bubble--bot ai-chatbot__typing">
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {isGuest && (
            <div className="ai-chatbot__chips">
              {GUEST_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleChipClick(chip.value)}
                  className="ai-chatbot__chip"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <form
            className="ai-chatbot__composer"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about fitness, nutrition..."
              className="ai-chatbot__input"
              disabled={loading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="ai-chatbot__send"
              aria-label="Send message"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
