import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Notification from '@/models/Notification'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const requestedLimit = Number(searchParams.get('limit') || 20)
    const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, Math.floor(requestedLimit))) : 20

    await connectDB()

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: tokenUser.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: tokenUser.userId, isRead: false }),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
