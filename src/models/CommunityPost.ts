import mongoose, { Schema } from 'mongoose'

export const COMMUNITY_POST_CATEGORIES = [
  'Motivation',
  'Question',
  'Achievement',
  'Workout',
] as const

export type CommunityPostCategory = (typeof COMMUNITY_POST_CATEGORIES)[number]

const CommunityPostSchema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true, maxlength: 2000 },
  category: {
    type: String,
    enum: COMMUNITY_POST_CATEGORIES,
    default: 'Motivation',
  },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

CommunityPostSchema.index({ createdAt: -1 })

export default mongoose.models.CommunityPost || mongoose.model('CommunityPost', CommunityPostSchema)
