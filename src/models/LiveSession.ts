import mongoose, { Schema } from 'mongoose'

const LiveSessionSchema = new Schema(
  {
    trainerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
    /** Local identifier used when creating the Daily room name. */
    roomId: { type: String, required: true, unique: true },
    /** Daily.co room name returned by the Daily API. */
    dailyRoomName: { type: String, default: '' },
    /** Daily.co join URL for the Prebuilt / iframe client. */
    dailyRoomUrl: { type: String, default: '' },
  },
  { timestamps: true },
)

export default mongoose.models.LiveSession || mongoose.model('LiveSession', LiveSessionSchema)
