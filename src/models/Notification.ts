import mongoose, { Schema } from 'mongoose'

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['chat', 'workout', 'system', 'trainer', 'payment', 'community'],
    default: 'system'
  },
  isRead: { type: Boolean, default: false },
  link: { type: String },
}, { timestamps: true })

// GET /api/notifications (polled from every dashboard page via NotificationBell)
// filters by userId and sorts by createdAt for the list, and counts unread by
// userId for the badge — both covered by this compound index.
NotificationSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
