import mongoose, { Schema } from 'mongoose'

const GymSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  country: { type: String, default: 'Pakistan' },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  trainers: [{ type: Schema.Types.ObjectId, ref: 'Trainer' }],
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  description: { type: String, default: '' },
  phone: { type: String },
  email: { type: String },
  logo: { type: String },
}, { timestamps: true })

export default mongoose.models.Gym || mongoose.model('Gym', GymSchema)
