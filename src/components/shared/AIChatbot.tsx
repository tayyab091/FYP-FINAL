'use client'
import { useState, useRef, useEffect } from 'react'

interface Message { role: 'user' | 'assistant'; content: string }

export function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your T.E.S.T. AI fitness coach 🤖 Ask me anything about workouts, nutrition, or your fitness goals!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading) return
    const msg = input.trim()
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
      setMessages(m => [...m, { role: 'assistant', content: data.reply || 'Sorry, try again.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label="AI Fitness Coach"
        className="fixed bottom-24 right-5 md:bottom-8 md:right-6 z-50 w-14 h-14 rounded-full bg-[#00ff87] text-black text-2xl flex items-center justify-center shadow-xl shadow-[#00ff87]/20 hover:scale-110 transition-transform">
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="fixed bottom-44 right-5 md:bottom-28 md:right-6 z-50 w-80 rounded-2xl border border-[#2a2a2a] bg-[#111] shadow-2xl flex flex-col overflow-hidden"
          style={{ height: 420 }}>
          <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#00ff87]/20 flex items-center justify-center">🤖</div>
            <div>
              <div className="text-sm font-bold">AI Fitness Coach</div>
              <div className="text-[10px] text-[#00ff87] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
                Online
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#00ff87] text-black font-medium rounded-br-sm'
                    : 'bg-[#1a1a1a] text-white rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-[#a0a0a0] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t border-[#1a1a1a] flex gap-2 flex-shrink-0">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about fitness, nutrition..."
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-[#555] outline-none focus:border-[#00ff87] transition-colors" />
            <button onClick={send} disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-[#00ff87] text-black disabled:opacity-40 text-sm font-bold flex-shrink-0 hover:bg-[#00cc6a] transition-colors">
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  )
}
