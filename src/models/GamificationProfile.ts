import mongoose, { Schema } from 'mongoose'

const UnlockedAchievementSchema = new Schema(
  {
    id: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const GamificationProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    achievements: { type: [UnlockedAchievementSchema], default: [] },
    formCheckerSessions: { type: Number, default: 0, min: 0 },
    streakBonusXp: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

export default mongoose.models.GamificationProfile
  || mongoose.model('GamificationProfile', GamificationProfileSchema)
