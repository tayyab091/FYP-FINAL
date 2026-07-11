import mongoose, { Schema } from 'mongoose'

const TrainerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  specialty: [{ type: String }],
  country: { type: String, default: 'Pakistan' },
  rating: { type: Number, default: 5.0, min: 0, max: 5 },
  bio: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
  gymName: { type: String },
  isFullyVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  gymVerificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminVerificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  totalClients: { type: Number, default: 0 },
  experience: { type: String, default: '' },
  certifications: [{ type: String }],
  hourlyRate: { type: Number, default: 0 },
  languages: [{ type: String, default: 'English' }],
}, { timestamps: true })

export default mongoose.models.Trainer || mongoose.model('Trainer', TrainerSchema)
