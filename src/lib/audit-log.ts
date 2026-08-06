import type { Types } from 'mongoose'
import AuditLog from '@/models/AuditLog'

export type AuditAction =
  | 'USER_SUSPENDED'
  | 'USER_UNSUSPENDED'
  | 'ADMIN_SUSPENDED'
  | 'ADMIN_UNSUSPENDED'
  | 'ADMIN_CREATED'
  | 'TRAINER_VERIFIED'
  | 'TRAINER_REJECTED'
  | 'GYM_VERIFIED'
  | 'GYM_REJECTED'
  | 'SUBSCRIPTION_GRANTED'
  | 'SUBSCRIPTION_SET'
  | 'SUBSCRIPTION_REVOKED'
  | 'SUBSCRIPTION_RENEWED'
  | 'ADMIN_SUBSCRIPTION_GRANTED'
  | 'ADMIN_SUBSCRIPTION_SET'
  | 'ADMIN_SUBSCRIPTION_REVOKED'
  | 'ADMIN_SUBSCRIPTION_RENEWED'

interface WriteAuditLogInput {
  actorId: Types.ObjectId | string
  action: AuditAction | string
  targetId?: Types.ObjectId | string
  targetModel?: string
  reason?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

/** Standardized audit write: actor, target, optional reason, timestamp via Mongoose. */
export async function writeAuditLog(input: WriteAuditLogInput) {
  const { actorId, action, targetId, targetModel, reason, details, ipAddress } = input
  return AuditLog.create({
    adminId: actorId,
    action,
    targetId,
    targetModel,
    details: {
      ...details,
      ...(reason ? { reason } : {}),
      actorId: String(actorId),
      targetId: targetId ? String(targetId) : undefined,
    },
    ipAddress,
  })
}
