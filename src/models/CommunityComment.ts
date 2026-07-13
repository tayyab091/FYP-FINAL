import mongoose, { Schema } from 'mongoose'

const CommunityCommentSchema = new Schema({
  postId: { type: Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true, maxlength: 1000 },
}, { timestamps: true })

CommunityCommentSchema.index({ postId: 1, createdAt: 1 })

export default mongoose.models.CommunityComment || mongoose.model('CommunityComment', CommunityCommentSchema)
