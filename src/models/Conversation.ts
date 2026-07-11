import mongoose, { Schema } from 'mongoose'

const ConversationSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  relationshipId: { type: Schema.Types.ObjectId, ref: 'Relationship' },
  lastMessage: { type: String, default: '' },
  lastMessageTime: { type: Date },
  unreadCounts: { type: Map, of: Number, default: {} },
}, { timestamps: true })

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema)
