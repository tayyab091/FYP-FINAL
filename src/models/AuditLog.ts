import mongoose, { Schema } from 'mongoose'

const AuditLogSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetId: { type: Schema.Types.ObjectId },
  targetModel: { type: String },
  details: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
}, { timestamps: true })

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema)
