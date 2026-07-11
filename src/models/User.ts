import mongoose, { Schema } from 'mongoose'

const UserSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ['user', 'trainer', 'gym_owner', 'admin', 'super_admin'],
    default: 'user'
  },
  country: { type: String, default: 'Pakistan' },
  profileImage: { type: String, default: '' },
  bio: { type: String, default: '' },
  subscription: {
    plan: { type: String, enum: ['basic', 'pro', 'elite'], default: 'basic' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    startDate: Date,
    endDate: Date,
  },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  freeChatsUsed: { type: Number, default: 0 },
  fitnessGoal: { type: String, default: '' },
  targetWeight: { type: Number },
  currentWeight: { type: Number },
}, { timestamps: true })

export default mongoose.models.User || mongoose.model('User', UserSchema)
