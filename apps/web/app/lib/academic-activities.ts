import { prisma } from '@lasce/db'
import { z } from 'zod'

export interface AcademicActivity {
  id: string
  title: string
  category: string
  /** Display string: a single date or a "16-20 febrero, 2026" range. */
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** "16-20 febrero, 2026" for a range within the same month; otherwise two full dates. */
function formatDateRange(start: Date, end: Date | null): string {
  if (!end || end.getTime() === start.getTime()) return formatDate(start)

  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()
  if (sameMonth) {
    const month = new Intl.DateTimeFormat('es-CR', { month: 'long', timeZone: 'UTC' }).format(end)
    return `${start.getUTCDate()}-${end.getUTCDate()} ${month}, ${end.getUTCFullYear()}`
  }

  return `${formatDate(start)} - ${formatDate(end)}`
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toAcademicActivity(row: AcademicActivityRow): AcademicActivity {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    date: formatDateRange(row.startDate, row.endDate),
    startDate: toIsoDate(row.startDate),
    endDate: row.endDate ? toIsoDate(row.endDate) : null,
    location: row.location,
    description: row.description,
    photoUrl: row.photoUrl,
    photoAlt: row.photoAlt,
  }
}

/** Loads the activities from Postgres, most recent start date first. */
export async function getAcademicActivities(): Promise<AcademicActivity[]> {
  const rows = await prisma.academicActivity.findMany({ orderBy: { startDate: 'desc' } })
  return rows.map(toAcademicActivity)
}

/** Shared by create and update: every field on `AcademicActivity` is required except `endDate`. */
export const academicActivityInputSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.'),
  category: z.string().trim().min(1, 'La categoría es obligatoria.'),
  startDate: z.string().date('La fecha de inicio es obligatoria.'),
  endDate: z.string().date().nullable(),
  location: z.string().trim().min(1, 'La ubicación es obligatoria.'),
  description: z.string().trim().min(1, 'La descripción es obligatoria.'),
  photoUrl: z.string().trim().min(1, 'La imagen es obligatoria.'),
  photoAlt: z.string().trim().min(1, 'El texto alternativo de la imagen es obligatorio.'),
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

  return toAcademicActivity(row)
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

  return toAcademicActivity(row)
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
