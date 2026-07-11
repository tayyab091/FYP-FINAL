import mongoose, { Schema } from 'mongoose'

const ExerciseSchema = new Schema({
  name: { type: String, required: true },
  sets: { type: Number, default: 3 },
  reps: { type: String, default: '10' },
  restSeconds: { type: Number, default: 60 },
  notes: { type: String, default: '' },
}, { _id: false })

const WeekDaySchema = new Schema({
  day: { type: String, required: true },
  exercises: [ExerciseSchema],
  isRestDay: { type: Boolean, default: false },
}, { _id: false })

const WorkoutPlanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  trainerId: { type: Schema.Types.ObjectId, ref: 'Trainer' },
  relationshipId: { type: Schema.Types.ObjectId, ref: 'Relationship' },
  title: { type: String, required: true },
  goal: {
    type: String,
    enum: ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness'],
    default: 'general_fitness'
  },
  durationWeeks: { type: Number, default: 8 },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed'],
    default: 'draft'
  },
  weeklySchedule: [WeekDaySchema],
  startDate: { type: Date },
  completedDate: { type: Date },
}, { timestamps: true })

export default mongoose.models.WorkoutPlan || mongoose.model('WorkoutPlan', WorkoutPlanSchema)
