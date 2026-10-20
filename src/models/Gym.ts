import mongoose, { Schema } from 'mongoose'

const GymSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, trim: true, sparse: true, index: true },
  address: { type: String, required: true },
  city: { type: String, default: '' },
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
  coverImage: { type: String },
  images: [{ type: String }],
  facilities: [{ type: String }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewsCount: { type: Number, default: 0, min: 0 },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number], default: undefined },
  },
}, { timestamps: true })

GymSchema.index({ location: '2dsphere' })

export default mongoose.models.Gym || mongoose.model('Gym', GymSchema)
