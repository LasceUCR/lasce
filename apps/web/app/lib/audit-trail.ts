import { prisma, type Prisma } from '@lasce/db'

import { isActorType, type ActivityItem } from './audit-log'
import { userHasPermission } from './auth/authorization'
import { paginate, type PageWindow } from './pagination'

/** The Auditoría section's read side: one filtered, paginated page of `public.audit_events`. */

/** Events per page of the Auditoría section. */
export const AUDIT_PAGE_SIZE = 10

/** What the Auditoría section is narrowed to. An empty string or `undefined` means no filter. */
export interface AuditFilters {
  /** `yyyy-mm-dd`, inclusive, in Costa Rica time. */
  from?: string
  /** `yyyy-mm-dd`, inclusive, in Costa Rica time. */
  to?: string
  /** An account id. */
  actor?: string
  entityType?: string
  action?: string
}

export interface AuditTrailItem extends ActivityItem {
  entityType: string | null
}

export interface AuditActorOption {
  id: string
  name: string
}

export interface AuditTrailPage extends PageWindow {
  items: AuditTrailItem[]
  filters: Required<AuditFilters>
  /** What the filters offer: only values that occur in the trail. */
  options: { actors: AuditActorOption[]; entityTypes: string[]; actions: string[] }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_PATTERN = /^[a-z][a-z_.]*$/

/** Costa Rica has no daylight saving time, so its offset is fixed. */
const COSTA_RICA_OFFSET = '-06:00'

function validDate(value: string | undefined): string {
  if (!value || !DATE_PATTERN.test(value)) return ''
  return Number.isNaN(new Date(`${value}T00:00:00${COSTA_RICA_OFFSET}`).getTime()) ? '' : value
}

/** The filters a query string asks for; a value that is not valid means no filter. */
export function normalizeAuditFilters(filters: AuditFilters): Required<AuditFilters> {
  const from = validDate(filters.from)
  const to = validDate(filters.to)
  return {
    from,
    to,
    actor: filters.actor && UUID_PATTERN.test(filters.actor) ? filters.actor : '',
    entityType:
      filters.entityType && TOKEN_PATTERN.test(filters.entityType) ? filters.entityType : '',
    action: filters.action && TOKEN_PATTERN.test(filters.action) ? filters.action : '',
  }
}

function auditWhere(filters: Required<AuditFilters>): Prisma.AuditEventWhereInput {
  const createdAt: Prisma.DateTimeFilter = {}
  if (filters.from) createdAt.gte = new Date(`${filters.from}T00:00:00${COSTA_RICA_OFFSET}`)
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00${COSTA_RICA_OFFSET}`)
    end.setUTCDate(end.getUTCDate() + 1)
    createdAt.lt = end
  }

  return {
    ...(filters.from || filters.to ? { createdAt } : {}),
    ...(filters.actor ? { actorId: filters.actor } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.action ? { action: filters.action } : {}),
  }
}

/**
 * One page of the audit trail, newest first, `AUDIT_PAGE_SIZE` rows at a time. Only the rows of
 * the page are read; the count and the filter options are separate, cheap queries. Requires
 * `view_audit_log`: the check is here, so no caller can reach the events without it.
 */
export async function getAuditTrailPage(
  requestedPage: number,
  filters: AuditFilters = {},
): Promise<AuditTrailPage> {
  if (!(await userHasPermission('view_audit_log'))) throw new Error('Unauthorized')

  const applied = normalizeAuditFilters(filters)
  const where = auditWhere(applied)

  const totalItems = await prisma.auditEvent.count({ where })
  const window = paginate(totalItems, requestedPage, AUDIT_PAGE_SIZE)

  const [rows, actors, entityTypes, actions] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: window.skip,
      take: window.take,
      select: {
        id: true,
        action: true,
        summary: true,
        metadata: true,
        actorType: true,
        entityType: true,
        createdAt: true,
        actor: { select: { fullName: true } },
      },
    }),
    prisma.user.findMany({
      where: { auditEvents: { some: {} } },
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      select: { id: true, fullName: true },
    }),
    prisma.auditEvent.findMany({
      where: { entityType: { not: null } },
      distinct: ['entityType'],
      orderBy: { entityType: 'asc' },
      select: { entityType: true },
    }),
    prisma.auditEvent.findMany({
      distinct: ['action'],
      orderBy: { action: 'asc' },
      select: { action: true },
    }),
  ])

  return {
    ...window,
    filters: applied,
    items: rows.map((row) => ({
      id: row.id,
      action: row.action,
      summary: row.summary,
      metadata: row.metadata,
      actorType: isActorType(row.actorType) ? row.actorType : 'system',
      actorName: row.actor?.fullName ?? null,
      entityType: row.entityType,
      occurredAt: row.createdAt.toISOString(),
    })),
    options: {
      actors: actors.map((actor) => ({ id: actor.id, name: actor.fullName })),
      entityTypes: entityTypes.flatMap((row) => (row.entityType ? [row.entityType] : [])),
      actions: actions.map((row) => row.action),
    },
  }
}
