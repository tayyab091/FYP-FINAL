import mongoose, { Schema } from 'mongoose'

const UserSchema = new Schema({
  nameKey: { type: String },
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
  lastStripeSubscriptionCreated: { type: Number },
  stripeSubscriptionId: { type: String },
  stripeCustomerId: { type: String },
  lastStripeCheckoutId: { type: String, select: false },
  lastStripeCheckoutCreatedAt: { type: Date, select: false },
  profileImage: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  avatarPublicId: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 500 },
  subscription: {
    plan: { type: String, enum: ['basic', 'pro', 'elite'], default: 'basic' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    cancelAtPeriodEnd: { type: Boolean, default: false },
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
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  verifyEmailToken: { type: String, select: false },
  verifyEmailExpires: { type: Date, select: false },
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
  goalMetricCurrent: { type: Number },
  goalMetricTarget: { type: Number },
  goalMetricUnit: { type: String, default: '' },
  /** Expo push tokens for mobile app notifications */
  expoPushTokens: { type: [String], default: [] },
  notificationPreferences: {
    chatMessages: { type: Boolean, default: true },
    workoutPlans: { type: Boolean, default: true },
    mealPlans: { type: Boolean, default: true },
    weeklyProgress: { type: Boolean, default: true },
    achievements: { type: Boolean, default: true },
    connectionRequests: { type: Boolean, default: true },
    communityActivity: { type: Boolean, default: true },
    liveSessions: { type: Boolean, default: true },
    subscriptionUpdates: { type: Boolean, default: true },
    adminTrainerApplications: { type: Boolean, default: true },
    adminGymVerification: { type: Boolean, default: true },
    adminUserSuspension: { type: Boolean, default: true },
    adminSubscriptionUpgrades: { type: Boolean, default: true },
  },
}, { timestamps: true })


UserSchema.pre('validate', function () {
  if (this.fullName && (this.isNew || this.isModified('fullName'))) this.nameKey = this.fullName.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
})
UserSchema.index({ nameKey: 1 }, { unique: true, partialFilterExpression: { nameKey: { $type: 'string' } } })

export default mongoose.models.User || mongoose.model('User', UserSchema)
