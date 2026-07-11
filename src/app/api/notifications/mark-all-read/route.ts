import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Notification from '@/models/Notification'
import { getUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()

    const result = await Notification.updateMany(
      { userId: tokenUser.userId, isRead: false },
      { $set: { isRead: true } },
    )

    return NextResponse.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
