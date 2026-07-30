import mongoose, { Schema } from 'mongoose'

const FoodItemSchema = new Schema({
  name: { type: String, required: true },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  quantity: { type: Number, default: 100 },
  unit: { type: String, default: 'g' },
}, { _id: false })

const MealLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  foods: [FoodItemSchema],
  totalCalories: { type: Number, default: 0 },
  totalProtein: { type: Number, default: 0 },
  totalCarbs: { type: Number, default: 0 },
  totalFat: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true })

// meal-logs/today and analytics/summary both filter by userId + date range.
MealLogSchema.index({ userId: 1, date: -1 })

export default mongoose.models.MealLog || mongoose.model('MealLog', MealLogSchema)
