import mongoose, { Schema } from 'mongoose'

const ProgressRecordSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  weight: { type: Number },
  bodyFat: { type: Number },
  chest: { type: Number },
  waist: { type: Number },
  hips: { type: Number },
  notes: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.models.ProgressRecord || mongoose.model('ProgressRecord', ProgressRecordSchema)
