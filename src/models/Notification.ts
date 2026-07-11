import mongoose, { Schema } from 'mongoose'

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['chat', 'workout', 'system', 'trainer', 'payment'],
    default: 'system'
  },
  isRead: { type: Boolean, default: false },
  link: { type: String },
}, { timestamps: true })

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
