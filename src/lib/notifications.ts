import Notification from '@/models/Notification'
import mongoose from 'mongoose'
import { publishNotification } from '@/lib/realtime'

type NotificationType = 'chat' | 'workout' | 'system' | 'trainer' | 'payment' | 'community'

interface CreateNotificationInput {
  userId: string | mongoose.Types.ObjectId
  title: string
  message: string
  type?: NotificationType
  link?: string
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

export async function createNotification(input: CreateNotificationInput) {
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
