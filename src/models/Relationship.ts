import mongoose, { Schema } from 'mongoose'

const RelationshipSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  trainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', required: true },
  status: {
    type: String,
    enum: ['pending', 'active', 'ended'],
    default: 'pending'
  },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  canChat: { type: Boolean, default: false },
  canViewProgress: { type: Boolean, default: false },
  canEditSchedule: { type: Boolean, default: false },
  canViewNutrition: { type: Boolean, default: false },
  canCreateWorkouts: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.models.Relationship || mongoose.model('Relationship', RelationshipSchema)
