import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { getUser } from '@/lib/auth'
import { parseJsonBody } from '@/lib/validation'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCE_KEYS,
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/notification-preferences'

const preferencesSchema = z.object(
  Object.fromEntries(NOTIFICATION_PREFERENCE_KEYS.map((key) => [key, z.boolean().optional()])) as Record<
    (typeof NOTIFICATION_PREFERENCE_KEYS)[number],
    z.ZodOptional<z.ZodBoolean>
  >,
)

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()
    const user = await User.findById(tokenUser.userId).select('notificationPreferences').lean()
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    return NextResponse.json({
      preferences: normalizeNotificationPreferences(
        user.notificationPreferences as Partial<NotificationPreferences> | undefined,
      ),
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const parsed = await parseJsonBody(req, preferencesSchema)
    if ('error' in parsed) return parsed.error

    await connectDB()
    const existing = await User.findById(tokenUser.userId).select('notificationPreferences').lean()
    const current = normalizeNotificationPreferences(
      existing?.notificationPreferences as Partial<NotificationPreferences> | undefined,
    )
    const next = { ...current, ...parsed.data }

    await User.findByIdAndUpdate(tokenUser.userId, { notificationPreferences: next })

    return NextResponse.json({
      preferences: next,
      message: 'Notification preferences updated',
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
