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
    // Per-exercise checklist completion, persisted on toggle so the
    // checklist survives a page reload/revisit while a workout is
    // in_progress (see BUG_REPORT.md — workout checklist XP persistence).
    completed: { type: Boolean, default: false },
  }],
  durationMinutes: { type: Number, default: 0 },
  caloriesBurned: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  // Explicit idempotency guard: XP is awarded at most once per log,
  // independent of the `status` transition check in the complete route.
  xpAwarded: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.models.WorkoutLog || mongoose.model('WorkoutLog', WorkoutLogSchema)
