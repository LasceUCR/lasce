import { prisma, type Prisma } from '@lasce/db'

import { userHasPermission } from './auth/authorization'
import { DOWNLOAD_FORMATS } from './downloads/formats'
import { paginate, type PageWindow } from './pagination'
import { SCIENTIFIC_INSTRUMENT_CODES, SCIENTIFIC_SOURCE_CODES } from './scientific-data'

/** The Descargas section's read side: one filtered, paginated page of `public.resource_downloads`. */

/** Downloads per page of the Descargas section. */
export const DOWNLOAD_HISTORY_PAGE_SIZE = 10

/** What the section is narrowed to. An empty string or `undefined` means no filter. */
export interface DownloadHistoryFilters {
  /** `yyyy-mm-dd`, inclusive, in UTC like `/datos`. */
  from?: string
  /** `yyyy-mm-dd`, inclusive, in UTC. */
  to?: string
  source?: string
  instrument?: string
  format?: string
  /** An account id. */
  user?: string
}

export interface DownloadHistoryItem {
  id: string
  /** `null` once the account was deleted. */
  userName: string | null
  source: string
  instrument: string
  product: string
  format: string
  /** The queried day and time window, as `/datos` recorded them; empty when not recorded. */
  date: string
  startTime: string
  endTime: string
  downloadedAt: string
}

export interface DownloadHistoryPage extends PageWindow {
  items: DownloadHistoryItem[]
  filters: Required<DownloadHistoryFilters>
  /** What the filters offer. */
  options: {
    sources: readonly string[]
    instruments: readonly string[]
    formats: readonly string[]
    users: { id: string; name: string }[]
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validDate(value: string | undefined): string {
  if (!value || !DATE_PATTERN.test(value)) return ''
  const date = new Date(`${value}T00:00:00Z`)
  // `2026-02-31` parses by rolling over; only a date that reads back the same is a real day.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : ''
}

function oneOf(value: string | undefined, allowed: readonly string[]): string {
  return value && allowed.includes(value) ? value : ''
}

/** The filters a query string asks for; a value that is not valid means no filter. */
export function normalizeDownloadHistoryFilters(
  filters: DownloadHistoryFilters,
): Required<DownloadHistoryFilters> {
  return {
    from: validDate(filters.from),
    to: validDate(filters.to),
    source: oneOf(filters.source, SCIENTIFIC_SOURCE_CODES),
    instrument: oneOf(filters.instrument, SCIENTIFIC_INSTRUMENT_CODES),
    format: oneOf(filters.format, DOWNLOAD_FORMATS),
    user: filters.user && UUID_PATTERN.test(filters.user) ? filters.user : '',
  }
}

function downloadsWhere(
  filters: Required<DownloadHistoryFilters>,
): Prisma.ResourceDownloadWhereInput {
  const createdAt: Prisma.DateTimeFilter = {}
  if (filters.from) createdAt.gte = new Date(`${filters.from}T00:00:00Z`)
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00Z`)
    end.setUTCDate(end.getUTCDate() + 1)
    createdAt.lt = end
  }

  return {
    ...(filters.from || filters.to ? { createdAt } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.instrument ? { instrument: filters.instrument } : {}),
    ...(filters.format ? { format: filters.format } : {}),
    ...(filters.user ? { userId: filters.user } : {}),
  }
}

/** A string field of the recorded query, or `''` when it is absent or not text. */
function paramText(params: Prisma.JsonValue, key: string): string {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return ''
  const value = params[key]
  return typeof value === 'string' ? value : ''
}

/**
 * One page of the download history, newest first, `DOWNLOAD_HISTORY_PAGE_SIZE` rows at a time.
 * Only the rows of the page are read. The object key, the presigned link and its expiry are never
 * selected. Requires `view_download_history`: the check is here, so no caller can reach the
 * records without it.
 */
export async function getDownloadHistoryPage(
  requestedPage: number,
  filters: DownloadHistoryFilters = {},
): Promise<DownloadHistoryPage> {
  if (!(await userHasPermission('view_download_history'))) throw new Error('Unauthorized')

  const applied = normalizeDownloadHistoryFilters(filters)
  const where = downloadsWhere(applied)

  const totalItems = await prisma.resourceDownload.count({ where })
  const window = paginate(totalItems, requestedPage, DOWNLOAD_HISTORY_PAGE_SIZE)

  const [rows, users] = await Promise.all([
    prisma.resourceDownload.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: window.skip,
      take: window.take,
      select: {
        id: true,
        source: true,
        instrument: true,
        product: true,
        format: true,
        params: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
    }),
    prisma.user.findMany({
      where: { resourceDownloads: { some: {} } },
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      select: { id: true, fullName: true },
    }),
  ])

  return {
    ...window,
    filters: applied,
    items: rows.map((row) => ({
      id: row.id,
      userName: row.user?.fullName ?? null,
      source: row.source,
      instrument: row.instrument,
      product: row.product,
      format: row.format,
      date: paramText(row.params, 'date'),
      startTime: paramText(row.params, 'startTime'),
      endTime: paramText(row.params, 'endTime'),
      downloadedAt: row.createdAt.toISOString(),
    })),
    options: {
      sources: SCIENTIFIC_SOURCE_CODES,
      instruments: SCIENTIFIC_INSTRUMENT_CODES,
      formats: DOWNLOAD_FORMATS,
      users: users.map((user) => ({ id: user.id, name: user.fullName })),
    },
  }
}
