import mongoose from 'mongoose'
import Notification from '@/models/Notification'

type NotificationType = 'chat' | 'workout' | 'system' | 'trainer' | 'payment'

interface CreateNotificationInput {
  userId: string | mongoose.Types.ObjectId
  title: string
  message: string
  type?: NotificationType
  link?: string
}

export async function createNotification(input: CreateNotificationInput) {
  await Notification.create({
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type || 'system',
    link: input.link,
  })
}
