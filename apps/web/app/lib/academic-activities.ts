import { prisma, type Prisma } from '@lasce/db'

import { changedFieldNames, recordUserAuditEvent, type AuditActor } from '@/app/lib/audit-log'
import { runAuditedDelete, runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion, toVersion } from '@/app/lib/cms/version'
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import { translationLocales } from '@/app/lib/i18n/content/definition'
import {
  baseContent,
  resolveContent,
  storedContentFrom,
  translationRows,
} from '@/app/lib/i18n/content/resolve'
import { findPendingReviews } from '@/app/lib/i18n/content/review'

import {
  academicActivityContent,
  type AcademicActivityCreateInput,
  type AcademicActivityEditingData,
  type AcademicActivityUpdateInput,
  type ReviewConfirmation,
} from './academic-activities-schema'

export * from './academic-activities-schema'

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
  /**
   * The language `title`, `category`, `description` and `photoAlt` are actually in. `null` when
   * the activity is legacy and its base text is shown, because that text's language is unknown.
   */
  contentLocale?: Locale | null
  /** Present only when loaded with `includeEditingData`. */
  editing?: AcademicActivityEditingData
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

export type AcademicActivityWriteFailure =
  | { ok: false; reason: 'not-found' }
  /** The activity changed since the editor loaded it. */
  | { ok: false; reason: 'conflict' }
  /** Fields changed in one language whose counterpart was neither changed nor confirmed. */
  | { ok: false; reason: 'review-required'; pending: ReviewConfirmation[] }

export type AcademicActivityWriteResult =
  { ok: true; activity: AcademicActivity } | AcademicActivityWriteFailure

const activityInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, category: true, description: true, photoAlt: true },
  },
} satisfies Prisma.AcademicActivityInclude

type AcademicActivityRow = Prisma.AcademicActivityGetPayload<{ include: typeof activityInclude }>

function toAcademicActivity(
  row: AcademicActivityRow,
  locale: Locale,
  includeEditingData: boolean,
): AcademicActivity {
  const stored = storedContentFrom(academicActivityContent, row, row.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    id: row.id,
    title: content.title,
    category: content.category,
    date: formatDateRange(row.startDate, row.endDate, locale),
    startDate: toIsoDate(row.startDate),
    endDate: row.endDate ? toIsoDate(row.endDate) : null,
    location: row.location,
    description: content.description,
    photoUrl: row.photoUrl,
    photoAlt: content.photoAlt,
    contentLocale,
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(row.modifiedAt) } }
      : {}),
  }
}

/**
 * Loads the activities from Postgres, most recent start date first, with `title`, `category`,
 * `description` and `photoAlt` in `locale` (the language of the request's `lasce_locale` cookie)
 * when the activity has that translation, falling back to the base text otherwise.
 *
 * Pass `includeEditingData` only for someone who can edit, because it sends every language to the
 * browser.
 */
export async function getAcademicActivities(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<AcademicActivity[]> {
  const rows = await prisma.academicActivity.findMany({
    orderBy: { startDate: 'desc' },
    include: activityInclude,
  })
  return rows.map((row) => toAcademicActivity(row, locale, includeEditingData))
}

/** The base row's shared columns for a content input (dates, location, photo). */
function sharedColumns(input: {
  startDate: string
  endDate: string | null
  location: string
  photoUrl: string
}) {
  return {
    startDate: new Date(input.startDate),
    endDate: input.endDate ? new Date(input.endDate) : null,
    location: input.location,
    photoUrl: input.photoUrl,
  }
}

/** Creates a new activity in every language at once, authored by the admin who submitted it. */
export async function createAcademicActivity(
  input: AcademicActivityCreateInput,
  modifiedBy: string,
): Promise<AcademicActivity> {
  const result = await runWrite<AcademicActivityRow, never>(async (tx) => {
    const created = await tx.academicActivity.create({
      data: {
        ...baseContent(academicActivityContent, input.content),
        ...sharedColumns(input),
        modifiedBy,
        translations: { create: translationRows(academicActivityContent, input.content) },
      },
      include: activityInclude,
    })
    await recordUserAuditEvent(
      tx,
      { id: modifiedBy },
      {
        action: 'academic_activity.create',
        summary: `Actividad académica agregada: ${created.title}`,
        entityType: 'academic_activity',
        entityId: created.id,
      },
    )
    return created
  })

  return toAcademicActivity(result.value, defaultLocale, true)
}

/**
 * Updates the fields present in `input` and stamps `modifiedBy` with the admin who made the
 * change, all at once: either everything is stored or nothing is.
 *
 * With `content` it is a bilingual content update: both languages are written, after checking
 * that every one-sided change has its counterpart changed or confirmed (`findPendingReviews`).
 * Without `content` it updates only the shared fields present, and the texts and translations are
 * left exactly as they are, so a legacy activity can be corrected without being translated first.
 *
 * Optimistic concurrency applies to both kinds: `input.version` is the `modified_at` the editor
 * loaded. The base row is updated only while it still has that value, and every save moves it
 * forward, so of two editors who loaded the same version the second one gets `conflict` instead
 * of silently overwriting the first. Returns `null`-shaped `not-found` when `id` does not match
 * any row.
 */
export async function updateAcademicActivity(
  id: string,
  input: AcademicActivityUpdateInput,
  modifiedBy: string,
): Promise<AcademicActivityWriteResult> {
  const expectedModifiedAt = parseVersion(input.version)

  const result = await runWrite<AcademicActivityRow, AcademicActivityWriteFailure>(async (tx) => {
    const current = await tx.academicActivity.findUnique({
      where: { id },
      select: {
        title: true,
        category: true,
        description: true,
        photoAlt: true,
        modifiedAt: true,
        translations: activityInclude.translations,
      },
    })

    if (!current) {
      throw new WriteAbort<AcademicActivityWriteFailure>({ ok: false, reason: 'not-found' })
    }

    if (!isCurrentVersion(current.modifiedAt, expectedModifiedAt)) {
      throw new WriteAbort<AcademicActivityWriteFailure>({ ok: false, reason: 'conflict' })
    }

    const { content } = input

    if (content) {
      const pending = findPendingReviews(
        academicActivityContent,
        storedContentFrom(academicActivityContent, current, current.translations),
        content,
        input.confirmedUnchanged ?? [],
      )

      if (pending.length > 0) {
        throw new WriteAbort<AcademicActivityWriteFailure>({
          ok: false,
          reason: 'review-required',
          pending,
        })
      }
    }

    const { count } = await tx.academicActivity.updateMany({
      where: { id, modifiedAt: expectedModifiedAt },
      data: {
        ...(content ? baseContent(academicActivityContent, content) : {}),
        // `startDate` and `endDate` always travel together (enforced by the update schema).
        ...(input.startDate === undefined
          ? {}
          : {
              startDate: new Date(input.startDate),
              endDate: input.endDate ? new Date(input.endDate) : null,
            }),
        ...(input.location === undefined ? {} : { location: input.location }),
        ...(input.photoUrl === undefined ? {} : { photoUrl: input.photoUrl }),
        modifiedBy,
        modifiedAt: nextUpdatedAt(expectedModifiedAt),
      },
    })

    if (count === 0) {
      throw new WriteAbort<AcademicActivityWriteFailure>({ ok: false, reason: 'conflict' })
    }

    if (content) {
      for (const { locale, ...text } of translationRows(academicActivityContent, content)) {
        await tx.academicActivityTranslation.upsert({
          where: { academicActivityId_locale: { academicActivityId: id, locale } },
          create: { academicActivityId: id, locale, ...text },
          update: text,
        })
      }
    }

    const updated = await tx.academicActivity.findUniqueOrThrow({
      where: { id },
      include: activityInclude,
    })
    await recordUserAuditEvent(
      tx,
      { id: modifiedBy },
      {
        action: 'academic_activity.update',
        summary: `Actividad académica actualizada: ${updated.title}`,
        entityType: 'academic_activity',
        entityId: id,
        metadata: { fields: changedFieldNames(input) },
      },
    )
    return updated
  })

  return result.ok
    ? { ok: true, activity: toAcademicActivity(result.value, defaultLocale, true) }
    : result
}

/**
 * Deletes one activity. Its translations go with it (`ON DELETE CASCADE`). Returns `false` when
 * `id` does not match any row, rather than throwing.
 */
export async function deleteAcademicActivity(id: string, actor: AuditActor): Promise<boolean> {
  return runAuditedDelete(
    (tx) => tx.academicActivity.findUnique({ where: { id }, select: { title: true } }),
    (tx) => tx.academicActivity.deleteMany({ where: { id } }),
    (tx, activity) =>
      recordUserAuditEvent(tx, actor, {
        action: 'academic_activity.delete',
        summary: `Actividad académica eliminada: ${activity.title}`,
        entityType: 'academic_activity',
        entityId: id,
      }),
  )
}
