import mongoose, { Schema } from 'mongoose'

const GymReviewSchema = new Schema({
  gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  anonymous: { type: Boolean, default: false },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, maxlength: 1000 },
}, { timestamps: true })
GymReviewSchema.index({ gymId: 1, userId: 1 }, { unique: true })
GymReviewSchema.index({ gymId: 1, createdAt: -1 })
export default mongoose.models.GymReview || mongoose.model('GymReview', GymReviewSchema)
