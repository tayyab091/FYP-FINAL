import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { assertCanChat, ChatError } from '@/lib/chat/createMessage'
import { publishTyping } from '@/lib/realtime'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    await assertCanChat(id, tokenUser.userId)

    const body = await req.json().catch(() => ({}))
    const isTyping = Boolean(body?.isTyping)

    await publishTyping(id, { userId: tokenUser.userId, isTyping })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
