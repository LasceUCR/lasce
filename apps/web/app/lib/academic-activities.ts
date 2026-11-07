import { prisma } from '@lasce/db'
import { z } from 'zod'

import { defaultLocale, type Locale } from '@/app/lib/i18n/config'

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

/** The `Intl` locale each site `Locale` formats dates with. */
const INTL_LOCALE: Record<Locale, string> = { es: 'es-CR', en: 'en-US' }

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
  const rows = await prisma.academicActivity.findMany({ orderBy: { startDate: 'desc' } })
  return rows.map((row) => toAcademicActivity(row, locale))
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
