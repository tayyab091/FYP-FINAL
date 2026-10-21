export type RelationshipRecordStatus = 'pending' | 'active' | 'ended'

export type ConnectUiStatus = 'idle' | 'loading' | 'sent' | 'pending' | 'connected'

type TrainerRef = string | { _id?: string | { toString(): string } } | null | undefined

/** Normalize trainer id from a Relationship document (populated or not). */
export function relationshipTrainerId(trainerRef: TrainerRef): string | null {
  if (!trainerRef) return null
  if (typeof trainerRef === 'string') return trainerRef
  const id = trainerRef._id
  if (id == null) return null
  return typeof id === 'string' ? id : id.toString()
}

export function connectStatusFromRelationship(
  status: RelationshipRecordStatus | string | undefined,
): ConnectUiStatus {
  if (status === 'active') return 'connected'
  if (status === 'pending') return 'pending'
  return 'idle'
}

export interface UserRelationshipRow {
  status?: string
  trainerId?: TrainerRef
}

/** Map trainer Mongo id → relationship status for the logged-in member. */
export function buildTrainerRelationshipMap(
  relationships: UserRelationshipRow[],
): Map<string, RelationshipRecordStatus> {
  const map = new Map<string, RelationshipRecordStatus>()
  for (const rel of relationships) {
    const tid = relationshipTrainerId(rel.trainerId)
    if (!tid) continue
    if (rel.status === 'pending' || rel.status === 'active') {
      map.set(tid, rel.status)
    }
  }
  return map
}

export async function fetchUserTrainerRelationships(): Promise<UserRelationshipRow[]> {
  const res = await fetch('/api/relationships', { credentials: 'include' })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
