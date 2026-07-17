// AI-facing reference code — see RES-018 §4. Stable, assign-once, never
// regenerated identifier distinct from the human-facing displayName/title
// (renameable) and from ARC-011's canonicalName (semantic grouping label).
//
// Format: {OBJECT_TYPE}-{ORIGIN}-{SEQUENCE:6}-{DATE:YYYYMMDD}
// Example: THREAD-AIINPUT-000123-20260716

export type ReferenceCodeObjectType = "THREAD" | "FILE" | "MEDIA"

const sequenceCounters = new Map<ReferenceCodeObjectType, number>()

function nextSequence(objectType: ReferenceCodeObjectType): number {
  const next = (sequenceCounters.get(objectType) ?? 0) + 1
  sequenceCounters.set(objectType, next)
  return next
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

export function generateReferenceCode(
  objectType: ReferenceCodeObjectType,
  origin: string,
  createdAt: Date | string = new Date()
): string {
  const sequence = String(nextSequence(objectType)).padStart(6, "0")
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt
  return `${objectType}-${origin.toUpperCase()}-${sequence}-${formatDate(date)}`
}
