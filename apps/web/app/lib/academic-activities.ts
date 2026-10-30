import { prisma, type Prisma } from '@lasce/db'
import { z } from 'zod'

import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import { paginate, type PageWindow } from '@/app/lib/pagination'
import { escapeLikeWildcards, parseSearchParam } from '@/app/lib/search-query'

export interface AcademicActivity {
  id: string
  title: string
  category: string
  /** Display string, in the language `getAcademicActivities` was called with: a single date or a
   * "16-20 febrero, 2026" / "16-20 February 2026" range. */
  date: string
  /** Raw `yyyy-mm-dd`, what the edit form needs; `date` is display-only and doesn't round-trip. */
  startDate: string
  endDate: string | null
  location: string
  description: string
  photoUrl: string
  photoAlt: string
}

type AcademicActivityRow = {
  id: string
  title: string
  category: string
  startDate: Date
  endDate: Date | null
  location: string
  description: string
  photoUrl: string
  photoAlt: string
}

export interface AcademicActivitiesPageRequest {
  /** Search text, trimmed and limited to `SEARCH_MAX_LENGTH`; empty means every activity. */
  query?: string
  /** Page requested, brought within the available results. */
  page?: number
}

export interface AcademicActivitiesPageResult extends PageWindow {
  activities: AcademicActivity[]
  query: string
}

/** The `Intl` locale each site `Locale` formats dates with. */
const INTL_LOCALE: Record<Locale, string> = { es: 'es-CR', en: 'en-US' }

const academicActivityOrder = [
  { startDate: 'desc' },
  { id: 'desc' },
] satisfies Prisma.AcademicActivityOrderByWithRelationInput[]

function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * "16-20 febrero, 2026" / "16-20 February 2026" for a range within the same month; otherwise two
 * full dates. The comma before the year is a Spanish-only convention, matching the editorial copy
 * LASCE originally supplied in each language.
 */
function formatDateRange(start: Date, end: Date | null, locale: Locale): string {
  if (!end || end.getTime() === start.getTime()) return formatDate(start, locale)

  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()
  if (sameMonth) {
    const month = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      month: 'long',
      timeZone: 'UTC',
    }).format(end)
    const yearSeparator = locale === 'es' ? ', ' : ' '
    return `${start.getUTCDate()}-${end.getUTCDate()} ${month}${yearSeparator}${end.getUTCFullYear()}`
  }

  return `${formatDate(start, locale)} - ${formatDate(end, locale)}`
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toAcademicActivity(row: AcademicActivityRow, locale: Locale): AcademicActivity {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    date: formatDateRange(row.startDate, row.endDate, locale),
    startDate: toIsoDate(row.startDate),
    endDate: row.endDate ? toIsoDate(row.endDate) : null,
    location: row.location,
    description: row.description,
    photoUrl: row.photoUrl,
    photoAlt: row.photoAlt,
  }
}

/**
 * Loads the activities from Postgres, most recent start date first, with `date` formatted in
 * `locale` (the language of the request's `lasce_locale` cookie).
 */
export async function getAcademicActivities(
  locale: Locale = defaultLocale,
): Promise<AcademicActivity[]> {
  const rows = await prisma.academicActivity.findMany({ orderBy: academicActivityOrder })
  return rows.map((row) => toAcademicActivity(row, locale))
}

/**
 * Searches activities in their displayed text, orders them consistently, and loads only the
 * requested page. Date matching uses the same localized range shown on each card.
 */
export async function getAcademicActivitiesPage(
  locale: Locale = defaultLocale,
  { query = '', page = 1 }: AcademicActivitiesPageRequest = {},
): Promise<AcademicActivitiesPageResult> {
  const search = parseSearchParam(query)
  let where: Prisma.AcademicActivityWhereInput = {}

  if (search !== '') {
    const text = {
      contains: escapeLikeWildcards(search),
      mode: 'insensitive',
    } satisfies Prisma.StringFilter
    const matches: Prisma.AcademicActivityWhereInput[] = [
      { title: text },
      { category: text },
      { location: text },
      { description: text },
    ]

    // Date strings are formatted for the visitor's locale, so find matching date IDs without
    // loading every activity's full content into the page.
    const dates = await prisma.academicActivity.findMany({
      select: { id: true, startDate: true, endDate: true },
    })
    const normalizedSearch = search.toLocaleLowerCase()
    const matchingDateIds = dates
      .filter(({ startDate, endDate }) =>
        formatDateRange(startDate, endDate, locale).toLocaleLowerCase().includes(normalizedSearch),
      )
      .map(({ id }) => id)

    if (matchingDateIds.length > 0) matches.push({ id: { in: matchingDateIds } })
    where = { OR: matches }
  }

  const totalItems = await prisma.academicActivity.count({ where })
  const window = paginate(totalItems, page)
  const rows =
    totalItems === 0
      ? []
      : await prisma.academicActivity.findMany({
          where,
          orderBy: academicActivityOrder,
          skip: window.skip,
          take: window.take,
        })

  return {
    ...window,
    query: search,
    activities: rows.map((row) => toAcademicActivity(row, locale)),
  }
}

/**
 * Shared by create and update: every field on `AcademicActivity` is required except `endDate`.
 * `endDate`, when given, must not come before `startDate` — the error attaches to `endDate` so
 * it reaches the client as that field's own message (`issueMessages` in `app/lib/api-feedback.ts`).
 */
export const academicActivityInputSchema = z
  .object({
    title: z.string().trim().min(1, 'El título es obligatorio.'),
    category: z.string().trim().min(1, 'La categoría es obligatoria.'),
    startDate: z.string().date('La fecha de inicio es obligatoria.'),
    endDate: z.string().date().nullable(),
    location: z.string().trim().min(1, 'La ubicación es obligatoria.'),
    description: z.string().trim().min(1, 'La descripción es obligatoria.'),
    photoUrl: z.string().trim().min(1, 'La imagen es obligatoria.'),
    photoAlt: z.string().trim().min(1, 'El texto alternativo de la imagen es obligatorio.'),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'La fecha de finalización debe ser igual o posterior a la fecha de inicio.',
    path: ['endDate'],
  })

export type AcademicActivityInput = z.infer<typeof academicActivityInputSchema>

/**
 * `academicActivityInputSchema` validates dates as bare `yyyy-mm-dd` strings, but Prisma's client
 * rejects that for a `@db.Date` field — same conversion `news.ts`'s `toPublishedAtDate` does.
 */
function toDate(value: string): Date {
  return new Date(value)
}

function academicActivityRowData(data: AcademicActivityInput) {
  return {
    title: data.title,
    category: data.category,
    startDate: toDate(data.startDate),
    endDate: data.endDate ? toDate(data.endDate) : null,
    location: data.location,
    description: data.description,
    photoUrl: data.photoUrl,
    photoAlt: data.photoAlt,
  }
}

/** Creates a new activity, authored by the admin who submitted it. */
export async function createAcademicActivity(
  data: AcademicActivityInput,
  modifiedBy: string,
): Promise<AcademicActivity> {
  const row = await prisma.academicActivity.create({
    data: { ...academicActivityRowData(data), modifiedBy },
  })

  return toAcademicActivity(row, defaultLocale)
}

/**
 * Updates one activity and stamps `modifiedBy` with the admin who made the change. Returns `null`
 * when `id` does not match any row, rather than throwing, so the route handler can turn that into
 * a 404 — same pre-check pattern as `updateNosotrosActivity`.
 */
export async function updateAcademicActivity(
  id: string,
  data: AcademicActivityInput,
  modifiedBy: string,
): Promise<AcademicActivity | null> {
  const existing = await prisma.academicActivity.findUnique({ where: { id } })
  if (!existing) return null

  const row = await prisma.academicActivity.update({
    where: { id },
    data: { ...academicActivityRowData(data), modifiedBy },
  })

  return toAcademicActivity(row, defaultLocale)
}

/**
 * Deletes one activity. Returns `false` when `id` does not match any row, rather than throwing —
 * same pre-check pattern as `deleteNosotrosActivity`.
 */
export async function deleteAcademicActivity(id: string): Promise<boolean> {
  const existing = await prisma.academicActivity.findUnique({ where: { id } })
  if (!existing) return false

  await prisma.academicActivity.delete({ where: { id } })
  return true
}
