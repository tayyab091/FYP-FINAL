import mongoose, { Schema } from 'mongoose'

const MealItemSchema = new Schema({
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true,
  },
  name: { type: String, required: true },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { _id: false })

const MealDaySchema = new Schema({
  day: { type: String, required: true },
  meals: [MealItemSchema],
}, { _id: false })

const MealPlanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  trainerId: { type: Schema.Types.ObjectId, ref: 'Trainer' },
  relationshipId: { type: Schema.Types.ObjectId, ref: 'Relationship' },
  title: { type: String, required: true },
  goal: {
    type: String,
    enum: ['weight_loss', 'muscle_gain', 'maintenance', 'endurance', 'flexibility', 'general_fitness'],
    default: 'general_fitness',
  },
  dailyCalories: { type: Number, required: true },
  durationDays: { type: Number, default: 7 },
  days: [MealDaySchema],
  status: {
    type: String,
    enum: ['draft', 'active'],
    default: 'draft',
  },
  preferenceNotes: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.models.MealPlan || mongoose.model('MealPlan', MealPlanSchema)
