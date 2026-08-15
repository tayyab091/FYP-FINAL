import { NextRequest, NextResponse } from 'next/server'
import { aiChatSchema, parseJsonBody } from '@/lib/validation'
import { rateLimitAi } from '@/lib/rate-limit'
import { generateChatFallback, getWeightConflictMessage } from '@/lib/chat-fallback-engine'
import { APA_CHAT_DISCLAIMER } from '@/lib/chat-apa-format'

const GEMINI_APA_INSTRUCTIONS = `You are a professional fitness and nutrition coach for T.E.S.T., a Pakistani fitness platform.

Format every answer using APA-style structure:
- Start with a short title line (plain text, no markdown #).
- Use section headings on their own line (title case, no emoji).
- Use numbered lists (1. 2. 3.) for sequential steps or ranked recommendations.
- Use bullet points (•) for non-sequential items.
- Separate sections and paragraphs with blank lines.
- End with: ${APA_CHAT_DISCLAIMER}
- Keep answers concise (about 120–180 words), practical, and encouraging.
- When relevant, include Pakistani food examples (e.g., biryani, daal, roti, paratha).
- Do not answer questions unrelated to fitness or nutrition.
- Do not provide medical diagnoses; recommend consulting a physician for medical concerns.`

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
              text: GEMINI_APA_INSTRUCTIONS,
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

    const conflict = getWeightConflictMessage(message)
    if (conflict) {
      return NextResponse.json({ reply: conflict })
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
