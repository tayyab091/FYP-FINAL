import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { aiChatSchema, parseJsonBody } from '@/lib/validation'
import { rateLimitAi } from '@/lib/rate-limit'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
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

interface FitnessContext {
  fullName?: string
  fitnessGoal?: string
  activityLevel?: string
  currentWeight?: number
  targetWeight?: number
  goalMetricCurrent?: number
  goalMetricTarget?: number
  goalMetricUnit?: string
}

function goalLabel(goal?: string) {
  return goal ? goal.replaceAll('_', ' ') : 'general fitness'
}

function localCoachReply(message: string, profile?: FitnessContext | null): string | null {
  const lower = message.toLowerCase()
  const savedGoal = goalLabel(profile?.fitnessGoal)
  const goalPrefix = profile?.fitnessGoal ? `Keeping your ${savedGoal} goal in mind, ` : ''

  // Specific intents must run before broad words such as "weight".
  if (/gain\s+(?:some\s+)?weight|weight\s+gain|bulk|muscle\s+gain|build\s+muscle/.test(lower)) {
    return `${goalPrefix}use a modest 200–300 kcal daily surplus, aim for roughly 1.6–2.2 g protein per kg of body weight, and train each major muscle group twice weekly. Prioritize progressive overload in squats, presses, rows, and hinges. Track weekly averages—not daily scale changes—and adjust food only if weight and strength stay flat for two to three weeks.`
  }
  if (/lose\s+(?:some\s+)?weight|weight\s+loss|fat\s+loss|lose\s+fat|cutting|body\s+recomposition/.test(lower)) {
    return `${goalPrefix}start with a sustainable 300–500 kcal deficit, keep protein high, and combine strength training with regular walking or cardio. Aim for gradual progress while your gym performance stays stable. Crash diets usually cost muscle and are difficult to maintain.`
  }
  if (/squat|\bleg(?:s)?\b/.test(lower)) {
    return 'For squats, keep your feet around shoulder width, brace your core, and let your knees track in the same direction as your toes. Sit down between your hips while keeping the whole foot planted, then drive the floor away to stand. Start with 3 sets of 8–12 controlled reps and stop if you feel sharp pain.'
  }
  if (/protein|diet|nutrition|\beat\b|meal/.test(lower)) {
    return `${goalPrefix}build each meal around a protein source such as chicken, fish, eggs, daal, paneer, or Greek yogurt. Add vegetables or fruit, choose a sensible serving of rice or roti, and adjust portions to match your goal. Consistent daily intake matters more than one “perfect” meal.`
  }
  if (/sleep|recover|recovery/.test(lower)) {
    return 'Aim for 7–9 hours of sleep, keep a consistent bedtime, and allow at least 48 hours before training the same muscles hard again. A short walk, hydration, and enough protein support recovery; more training is not always better.'
  }
  if (/cardio|run|stamina|endurance|5k/.test(lower)) {
    return `${goalPrefix}start with 20–30 minutes of easy-to-moderate cardio three times per week and increase total time gradually. Add one short interval session only after the easy work feels comfortable. Track the same benchmark—such as a 5K time or weekly minutes—to see real progress.`
  }
  if (/warm|stretch|mobility|injury|pain/.test(lower)) {
    return 'Warm up with 5–10 minutes of easy movement, dynamic mobility, and lighter practice sets. Do not train through sharp, worsening, or unexplained pain; a qualified clinician should assess persistent symptoms. Use controlled ranges of motion instead of bouncing into stretches.'
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAi(req)
    if (limited) return limited

    const parsed = await parseJsonBody(req, aiChatSchema)
    if ('error' in parsed) return parsed.error
    const { message, history } = parsed.data
    const safeHistory = history.slice(-6)

    const weightConflict = getWeightConflictMessage(message)
    if (weightConflict) return NextResponse.json({ reply: weightConflict, source: 'local-coach' })

    let profile: FitnessContext | null = null
    const tokenUser = await getUser(req)
    if (tokenUser) {
      try {
        await connectDB()
        profile = await User.findById(tokenUser.userId)
          .select('fullName fitnessGoal activityLevel currentWeight targetWeight goalMetricCurrent goalMetricTarget goalMetricUnit')
          .lean() as FitnessContext | null
      } catch (error) {
        console.error('AI profile context unavailable:', error)
      }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'PASTE_GEMINI_KEY_HERE') {
      return NextResponse.json({ reply: localCoachReply(message, profile) || generateChatFallback(message), source: 'local-coach' })
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    const context = profile
      ? `Member context: goal=${goalLabel(profile.fitnessGoal)}, activity=${profile.activityLevel || 'unknown'}, currentWeight=${profile.currentWeight ?? 'unknown'}, targetWeight=${profile.targetWeight ?? 'unknown'}, otherMetric=${profile.goalMetricCurrent ?? 'unknown'} to ${profile.goalMetricTarget ?? 'unknown'} ${profile.goalMetricUnit || ''}.`
      : 'Member context: not signed in or no saved goal.'
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `${GEMINI_APA_INSTRUCTIONS}\n\nMember context: ${context}\nAnswer the user's actual intent and never confuse weight gain with weight loss. Ask one focused follow-up only when essential.`,
            }],
          },
          contents: [
            ...safeHistory.map((item: ChatHistoryItem) => ({
              role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
              parts: [{ text: item.content }],
            })),
            { role: 'user', parts: [{ text: message }] },
          ],
          generationConfig: { maxOutputTokens: 350 },
        }),
        cache: 'no-store',
      },
    )

    const data = await response.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
      error?: { message?: string }
    }
    if (!response.ok) {
      console.error('Gemini API error:', data.error?.message || response.status)
      return NextResponse.json({ reply: localCoachReply(message, profile) || generateChatFallback(message), source: 'local-fallback' })
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n')
      .trim()
    return NextResponse.json({
      reply: reply || localCoachReply(message, profile) || generateChatFallback(message),
      source: reply ? 'gemini' : 'local-fallback',
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({ reply: 'The coach is temporarily unavailable. Please try again.' }, { status: 500 })
  }
}
