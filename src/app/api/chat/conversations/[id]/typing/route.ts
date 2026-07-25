import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { assertCanChat, ChatError } from '@/lib/chat/createMessage'
import { publishTyping } from '@/lib/realtime'
import { parseJsonBody, parseObjectIdParam, typingSchema } from '@/lib/validation'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'conversation id')
    if ('error' in idResult) return idResult.error

    await assertCanChat(idResult.id, tokenUser.userId)

    let isTyping = true
    try {
      const parsed = await parseJsonBody(req, typingSchema)
      if (!('error' in parsed)) {
        isTyping = parsed.data.isTyping !== false
      }
    } catch {
      isTyping = true
    }

    await publishTyping(idResult.id, { userId: tokenUser.userId, isTyping })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
