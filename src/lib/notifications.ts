import Notification from '@/models/Notification'
import User from '@/models/User'
import mongoose from 'mongoose'
import { publishNotification } from '@/lib/realtime'
import {
  normalizeNotificationPreferences,
  resolvePreferenceKey,
  type NotificationPreferenceKey,
} from '@/lib/notification-preferences'

type NotificationType = 'chat' | 'workout' | 'system' | 'trainer' | 'payment' | 'community'

interface CreateNotificationInput {
  userId: string | mongoose.Types.ObjectId
  title: string
  message: string
  type?: NotificationType
  link?: string
  preferenceKey?: NotificationPreferenceKey
}

function shapeNotification(doc: {
  _id: { toString(): string }
  userId: { toString(): string }
  title: string
  message: string
  type: string
  isRead: boolean
  link?: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    _id: doc._id.toString(),
    userId: doc.userId.toString(),
    title: doc.title,
    message: doc.message,
    type: doc.type as NotificationType,
    isRead: doc.isRead,
    link: doc.link,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

async function isNotificationEnabled(input: CreateNotificationInput): Promise<boolean> {
  const user = await User.findById(input.userId).select('notificationPreferences').lean()
  if (!user) return true

  const prefs = normalizeNotificationPreferences(
    user.notificationPreferences as Parameters<typeof normalizeNotificationPreferences>[0],
  )
  const key = resolvePreferenceKey({
    type: input.type,
    title: input.title,
    message: input.message,
    preferenceKey: input.preferenceKey,
  })
  return prefs[key] !== false
}

export async function createNotification(input: CreateNotificationInput) {
  const enabled = await isNotificationEnabled(input)
  if (!enabled) return null

  const notification = await Notification.create({
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type || 'system',
    link: input.link,
  })

  const shaped = shapeNotification(notification)
  await publishNotification(shaped.userId, shaped).catch(() => {})
  return shaped
}
