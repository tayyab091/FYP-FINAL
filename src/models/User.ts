import mongoose, { Schema } from 'mongoose'

const UserSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  /** Optional for OAuth users (they store a random hash). */
  password: { type: String, required: false, minlength: 6 },
  role: {
    type: String,
    enum: ['user', 'trainer', 'gym_owner', 'admin', 'super_admin'],
    default: 'user'
  },
  country: { type: String, default: 'Pakistan' },
  profileImage: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  avatarPublicId: { type: String, default: '' },
  bio: { type: String, default: '' },
  subscription: {
    plan: { type: String, enum: ['basic', 'pro', 'elite'], default: 'basic' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    startDate: Date,
    endDate: Date,
  },
  /** Default true so existing users remain verified after migration. */
  emailVerified: { type: Boolean, default: true },
  /** Google OAuth subject; set when linked or created via Google. */
  googleId: { type: String, sparse: true, unique: true },
  authProviders: {
    type: [String],
    enum: ['password', 'google'],
    default: ['password'],
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  verifyEmailToken: { type: String },
  verifyEmailExpires: { type: Date },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  freeChatsUsed: { type: Number, default: 0 },
  fitnessGoal: { type: String, default: '' },
  activityLevel: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'very_active'],
    default: 'moderate'
  },
  targetWeight: { type: Number },
  currentWeight: { type: Number },
  /** Expo push tokens for mobile app notifications */
  expoPushTokens: { type: [String], default: [] },
}, { timestamps: true })

export default mongoose.models.User || mongoose.model('User', UserSchema)
