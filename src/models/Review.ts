import mongoose, { Schema } from 'mongoose'

const ReviewSchema = new Schema({
  trainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, maxlength: 1000 },
}, { timestamps: true })

ReviewSchema.index({ trainerId: 1, userId: 1 }, { unique: true })
ReviewSchema.index({ trainerId: 1, createdAt: -1 })

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema)
