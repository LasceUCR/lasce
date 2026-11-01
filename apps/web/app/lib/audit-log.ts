import { prisma, type Prisma } from '@lasce/db'

/**
 * The audit trail: `public.audit_events`, one append-only row per thing that happened in the
 * portal. `recordAuditEvent()` is the only writer and `getRecentActivity()` feeds the
 * "Actividad reciente" panel of `/administracion`; `getAuditTrailPage()` (`audit-trail.ts`)
 * feeds the Auditoría section. Every administrative write records its event through
 * `recordUserAuditEvent()`.
 */

/** Who can act. Mirrored by the `audit_events_actor_type_check` constraint. */
export const AUDIT_ACTOR_TYPES = ['user', 'system', 'worker'] as const

export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number]

/** How many events the summary shows, and so the height it reserves for them. */
export const RECENT_ACTIVITY_LIMIT = 5

/** `<entity>.<verb>`, lowercase, e.g. `publication.create` or `user.role_change`. */
const ACTION_PATTERN = /^[a-z][a-z_]*(\.[a-z][a-z_]*)+$/

export type AuditEventInput = {
  action: string
  /** The line the panel shows, e.g. "Publicación agregada: Solar flares in 2026". */
  summary: string
  entityType?: string
  entityId?: string
  metadata?: Prisma.InputJsonValue
} & (
  | { actorType: 'user'; actorId: string }
  | { actorType: Exclude<AuditActorType, 'user'>; actorId?: undefined }
)

/**
 * Appends one event. Rejects when the write fails, so the caller decides whether that undoes its
 * own action. Pass the transaction client to record the event atomically with the change it
 * describes.
 */
export async function recordAuditEvent(
  input: AuditEventInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> {
  if (!ACTION_PATTERN.test(input.action)) {
    throw new Error(`Invalid audit action "${input.action}": expected "<entity>.<verb>".`)
  }

  await db.auditEvent.create({
    data: {
      action: input.action,
      summary: input.summary,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
    },
  })
}

/** The account behind an administrative action: the session user the route guard returned. */
export interface AuditActor {
  id: string
}

/**
 * Records an event done by `actor` in the transaction `db` that makes the change, so neither is
 * kept without the other. Use it from the service that writes, after the write has succeeded.
 */
export function recordUserAuditEvent(
  db: Prisma.TransactionClient,
  actor: AuditActor,
  event: Omit<Extract<AuditEventInput, { actorType: 'user' }>, 'actorType' | 'actorId'>,
): Promise<void> {
  return recordAuditEvent({ ...event, actorType: 'user', actorId: actor.id }, db)
}

/**
 * The names of the fields an update touched, for an event's metadata. `version` and
 * `confirmedUnchanged` are the editor's bookkeeping, not fields, and `undefined` means the field
 * was left alone.
 */
export function changedFieldNames(input: object): string[] {
  return Object.entries(input)
    .filter(
      ([name, value]) => name !== 'version' && name !== 'confirmedUnchanged' && value !== undefined,
    )
    .map(([name]) => name)
}

export interface ActivityItem {
  id: string
  action: string
  summary: string
  /** The event's metadata, which lets the summary be rendered in the site's language. */
  metadata: Prisma.JsonValue | null
  actorType: AuditActorType
  /** The account's name; null for the system and the worker, or once the account is deleted. */
  actorName: string | null
  /** ISO 8601. */
  occurredAt: string
}

export function isActorType(value: string): value is AuditActorType {
  return (AUDIT_ACTOR_TYPES as readonly string[]).includes(value)
}

/** The newest events first. */
export async function getRecentActivity(limit = RECENT_ACTIVITY_LIMIT): Promise<ActivityItem[]> {
  const rows = await prisma.auditEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      summary: true,
      metadata: true,
      actorType: true,
      createdAt: true,
      actor: { select: { fullName: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    summary: row.summary,
    metadata: row.metadata,
    // The CHECK constraint keeps other values out; `system` covers a row written around it.
    actorType: isActorType(row.actorType) ? row.actorType : 'system',
    actorName: row.actor?.fullName ?? null,
    occurredAt: row.createdAt.toISOString(),
  }))
}
