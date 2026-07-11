import mongoose, { Schema } from 'mongoose'

const WorkoutLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: Schema.Types.ObjectId, ref: 'WorkoutPlan' },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'skipped'],
    default: 'in_progress'
  },
  exercises: [{
    name: String,
    setsCompleted: Number,
    repsCompleted: String,
    notes: String,
  }],
  durationMinutes: { type: Number, default: 0 },
  caloriesBurned: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.models.WorkoutLog || mongoose.model('WorkoutLog', WorkoutLogSchema)
