import mongoose, { Schema } from 'mongoose'

const MessageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'workout_plan', 'image'],
    default: 'text'
  },
  attachedPlanId: { type: Schema.Types.ObjectId, ref: 'WorkoutPlan' },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

export default mongoose.models.Message || mongoose.model('Message', MessageSchema)
