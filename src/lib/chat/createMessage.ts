import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import Message from '@/models/Message'
import Conversation from '@/models/Conversation'
import User from '@/models/User'
import Relationship from '@/models/Relationship'
import WorkoutPlan from '@/models/WorkoutPlan'
import Trainer from '@/models/Trainer'
import { createNotification } from '@/lib/notifications'
import type { TokenPayload } from '@/lib/auth'
import { isSafeHttpUrl, sanitizePlainText } from '@/lib/sanitize'

export class ChatError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface CreateMessageInput {
  conversationId: string
  sender: TokenPayload
  content: string
  type?: 'text' | 'workout_plan' | 'image'
  attachedPlanId?: string
}

export function shapeMessageDoc(message: Record<string, unknown>) {
  const doc = message as {
    _id: { toString(): string } | string
    conversationId: { toString(): string } | string
    senderId: { toString(): string } | string
    senderName: string
    content: string
    type: string
    attachedPlanId?: Record<string, unknown>
    createdAt: Date | string
  }

  return {
    ...doc,
    _id: typeof doc._id === 'string' ? doc._id : doc._id.toString(),
    conversationId:
      typeof doc.conversationId === 'string'
        ? doc.conversationId
        : doc.conversationId.toString(),
    senderId:
      typeof doc.senderId === 'string' ? doc.senderId : doc.senderId.toString(),
    attachedPlan: doc.attachedPlanId || undefined,
    createdAt:
      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  }
}

export async function assertCanChat(conversationId: string, userId: string) {
  await connectDB()
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  })
  if (!conversation) throw new ChatError(404, 'Conversation not found')

  const relationship = await Relationship.findOne({
    _id: conversation.relationshipId,
    status: 'active',
    canChat: true,
  }).select('_id')
  if (!relationship) throw new ChatError(403, 'Chat is not available')

  return conversation
}

export async function createMessage(input: CreateMessageInput) {
  const { conversationId, sender, content, type = 'text', attachedPlanId } = input

  if (!['text', 'workout_plan', 'image'].includes(type)) {
    throw new ChatError(400, 'Invalid message type')
  }

  let trimmed = content.trim()
  if (type === 'image') {
    if (!isSafeHttpUrl(trimmed, true)) {
      throw new ChatError(400, 'Image content must be a valid https URL (Vercel Blob)')
    }
    if (trimmed.length > 2048) {
      throw new ChatError(400, 'Image URL is too long')
    }
  } else {
    trimmed = sanitizePlainText(trimmed, 2000)
    if (!trimmed) throw new ChatError(400, 'Message cannot be empty')
  }

  await connectDB()
  const conversation = await assertCanChat(conversationId, sender.userId)

  let planRef: mongoose.Types.ObjectId | undefined
  if (type === 'workout_plan') {
    if (!attachedPlanId || !mongoose.isValidObjectId(attachedPlanId)) {
      throw new ChatError(400, 'Valid attachedPlanId required for workout plan messages')
    }
    const plan = await WorkoutPlan.findById(attachedPlanId)
    if (!plan) throw new ChatError(404, 'Workout plan not found')

    if (sender.role === 'trainer') {
      const trainer = await Trainer.findOne({ userId: sender.userId }).select('_id')
      if (!trainer || plan.trainerId?.toString() !== trainer._id.toString()) {
        throw new ChatError(403, 'Not authorized to share this plan')
      }
    } else if (plan.userId.toString() !== sender.userId) {
      throw new ChatError(403, 'Not authorized to share this plan')
    }
    planRef = plan._id
  }

  const user = await User.findById(sender.userId).select('fullName')
  const message = await Message.create({
    conversationId,
    senderId: sender.userId,
    senderName: user?.fullName || 'User',
    content: trimmed,
    type,
    ...(planRef && { attachedPlanId: planRef }),
  })

  const unreadIncrements = Object.fromEntries(
    conversation.participants
      .map((participantId: { toString(): string }) => participantId.toString())
      .filter((participantId: string) => participantId !== sender.userId)
      .map((participantId: string) => [`unreadCounts.${participantId}`, 1]),
  )

  const lastMessagePreview = type === 'image' ? '[Image]' : trimmed.slice(0, 100)

  await Conversation.findByIdAndUpdate(conversation._id, {
    $set: {
      lastMessage: lastMessagePreview,
      lastMessageTime: new Date(),
    },
    ...(Object.keys(unreadIncrements).length > 0 && { $inc: unreadIncrements }),
  })

  const senderName = user?.fullName || 'Someone'
  const preview = type === 'image' ? 'Sent an image' : trimmed.slice(0, 80)
  await Promise.all(
    conversation.participants
      .map((participantId: { toString(): string }) => participantId.toString())
      .filter((participantId: string) => participantId !== sender.userId)
      .map((recipientId: string) =>
        createNotification({
          userId: recipientId,
          title: `New message from ${senderName}`,
          message: preview,
          type: 'chat',
          link: `/chat/${conversationId}`,
        }),
      ),
  )

  const populated = await Message.findById(message._id).populate('attachedPlanId').lean()
  return shapeMessageDoc((populated ?? message.toObject()) as Record<string, unknown>)
}
