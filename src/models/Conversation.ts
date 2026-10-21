import mongoose, { Schema } from 'mongoose'

const ConversationSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  relationshipId: { type: Schema.Types.ObjectId, ref: 'Relationship' },
  lastMessage: { type: String, default: '' },
  lastMessageTime: { type: Date },
  unreadCounts: { type: Map, of: Number, default: {} },
}, { timestamps: true })

// GET /api/chat/conversations runs on every authenticated page load (via the
// FloatingChat unread badge), filtering by participants — without this
// multikey index it's a full collection scan on every navigation.
ConversationSchema.index({ participants: 1 })

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema)
