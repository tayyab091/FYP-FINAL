import { NextRequest, NextResponse } from 'next/server'
import { aiChatSchema, parseJsonBody } from '@/lib/validation'
import { rateLimitAi } from '@/lib/rate-limit'
import { generateChatFallback, getDeterministicCalculatorReply } from '@/lib/chat-fallback-engine'

interface ChatHistoryItem {
  role?: string
  content?: string
}

function isGeminiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY
  return Boolean(key && key !== 'PASTE_GEMINI_KEY_HERE')
}

async function tryGemini(
  message: string,
  history: ChatHistoryItem[],
  apiKey: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are a professional fitness and nutrition coach for T.E.S.T. — a Pakistani fitness platform.
              Answer questions about: exercise form, workout plans, nutrition, weight loss, muscle gain, recovery, and healthy habits.
              Keep answers concise (3-5 sentences max), practical, and encouraging.
              When relevant, use Pakistani food examples (chicken biryani, daal, roti, paratha, nihari, haleem).
              Do NOT answer questions unrelated to fitness or nutrition.
              Do NOT provide medical diagnoses. Suggest consulting a doctor for medical concerns.`,
            }],
          },
          contents: [
            ...history.map((m: ChatHistoryItem) => ({
              role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
            { role: 'user', parts: [{ text: message }] },
          ],
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
        }),
      },
    )

    if (!res.ok) return null

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return text || null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAi(req)
    if (limited) return limited

    const parsed = await parseJsonBody(req, aiChatSchema)
    if ('error' in parsed) return parsed.error

    const { message, history } = parsed.data
    const safeHistory = history.slice(-6)

    const calculatorReply = getDeterministicCalculatorReply(message)
    if (calculatorReply) {
      return NextResponse.json({ reply: calculatorReply })
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (isGeminiKeyConfigured() && geminiKey) {
      const geminiReply = await tryGemini(message, safeHistory, geminiKey)
      if (geminiReply) {
        return NextResponse.json({ reply: geminiReply })
      }
    }

    const reply = generateChatFallback(message)
    return NextResponse.json({ reply })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({ reply: 'AI service temporarily unavailable. Please try again.' })
  }
}
