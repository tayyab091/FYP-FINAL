import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import Notification from '@/models/Notification'
import { getUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Notification not found' }, { status: 404 })
    }

    await connectDB()

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: tokenUser.userId },
      { $set: { isRead: true } },
      { new: true },
    ).lean()

    if (!notification) {
      return NextResponse.json({ message: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json(notification)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
