import mongoose, { Schema } from 'mongoose'

const CommunityPostSchema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true, maxlength: 2000 },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

CommunityPostSchema.index({ createdAt: -1 })

export default mongoose.models.CommunityPost || mongoose.model('CommunityPost', CommunityPostSchema)
