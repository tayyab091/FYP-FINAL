import mongoose, { Schema } from 'mongoose'

const LiveSessionSchema = new Schema(
  {
    trainerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Assigned client for 1:1 sessions (optional for legacy group sessions). */
    clientId: { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    title: { type: String, required: true, trim: true },
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 240, default: 60 },
    maxParticipants: { type: Number, required: true, min: 1, max: 50, default: 20 },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
      default: 'scheduled',
      index: true,
    },
    /** Local identifier used when creating the meeting room name. */
    roomId: { type: String, required: true, unique: true },
    /** Current meeting provider; Jitsi is the default for new sessions. */
    meetingProvider: { type: String, default: 'jitsi' },
    /** Provider room name used in the join URL. */
    meetingRoomName: { type: String, default: '' },
    /** Provider join URL for the embedded room / fallback open-in-new-tab flow. */
    meetingUrl: { type: String, default: '' },
    /** Legacy Daily.co room name kept for older records during migration. */
    dailyRoomName: { type: String, default: '' },
    /** Legacy Daily.co join URL kept for older records during migration. */
    dailyRoomUrl: { type: String, default: '' },
  },
  { timestamps: true },
)

export default mongoose.models.LiveSession || mongoose.model('LiveSession', LiveSessionSchema)
