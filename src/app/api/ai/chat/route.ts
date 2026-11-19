import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { aiChatSchema, parseJsonBody } from '@/lib/validation'
import { rateLimitAi } from '@/lib/rate-limit'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { withDeadline } from '@/lib/with-deadline'
import { APA_CHAT_DISCLAIMER, apaReply } from '@/lib/chat-apa-format'
import { requestOpenRouterChat, type ChatMessage } from '@/lib/openrouter-chat'
import { requestClaudeChat } from '@/lib/claude-chat'

const COACH_INSTRUCTIONS = `You are a professional fitness and nutrition coach for T.E.S.T., a Pakistani fitness platform.
Use readable Markdown: a short ## title, numbered steps for sequences, bullets for other lists, and blank lines between sections. Keep answers concise (about 120-180 words) and answer the actual question. Ask a focused follow-up when essential. Never confuse weight gain with weight loss; clarify conflicting current/target weights before recommending a plan. Include familiar Pakistani foods when relevant. Answer only fitness, nutrition, recovery, and platform-related questions. Do not diagnose medical conditions. End fitness guidance with: ${APA_CHAT_DISCLAIMER}`

interface FitnessContext {
  fitnessGoal?: string
  activityLevel?: string
  currentWeight?: number
  targetWeight?: number
}

function unavailable() {
  return NextResponse.json({
    reply: 'The AI coach is temporarily unavailable. Please retry your message shortly.',
    source: 'unavailable',
    code: 'AI_PROVIDER_UNAVAILABLE',
  }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAi(req)
    if (limited) return limited
    const parsed = await parseJsonBody(req, aiChatSchema)
    if ('error' in parsed) return parsed.error
    const { message, history } = parsed.data
    const profile = await withDeadline<FitnessContext | null>((async () => {
      const tokenUser = await getUser(req)
      if (!tokenUser) return null
      await connectDB()
      return await User.findById(tokenUser.userId)
        .select('-_id fitnessGoal activityLevel currentWeight targetWeight').lean() as FitnessContext | null
    })(), 1200, null)
    const context = profile ? `Member context: ${JSON.stringify(profile)}` : 'No saved member fitness context.'
    const messages: ChatMessage[] = [
      { role: 'system', content: `${COACH_INSTRUCTIONS}\n${context}` },
      ...history.slice(-6).map((item): ChatMessage => ({ role: item.role === 'assistant' || item.role === 'model' ? 'assistant' : 'user', content: item.content })),
      { role: 'user', content: message },
    ]
    const both = Boolean((process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim()) && process.env.OPENROUTER_API_KEY?.trim())
    const claude = await requestClaudeChat(messages, both ? 9500 : 16000, req.signal)
    if (claude) return NextResponse.json({ reply: apaReply(/^#{1,3}\s/m.test(claude.reply) ? [claude.reply] : ['Fitness Guidance', claude.reply]), source: 'claude', model: claude.model })
    if (req.signal.aborted) return unavailable()
    const openrouter = await requestOpenRouterChat(messages, both ? 9500 : 16000, req.signal)
    if (openrouter) return NextResponse.json({ reply: apaReply(/^#{1,3}\s/m.test(openrouter.reply) ? [openrouter.reply] : ['Fitness Guidance', openrouter.reply]), source: 'openrouter', model: openrouter.model })
    return unavailable()
  } catch {
    // Never log member prompts, credentials, or raw provider errors.
    console.warn('[ai-chat] Request failed')
    return unavailable()
  }
}
