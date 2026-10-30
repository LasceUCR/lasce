import { prisma, type Prisma } from '@lasce/db'

import { changedFieldNames, recordUserAuditEvent, type AuditActor } from '@/app/lib/audit-log'
import { runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion, toVersion } from '@/app/lib/cms/version'
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import {
  baseContent,
  resolveContent,
  storedContentFrom,
  translationRows,
} from '@/app/lib/i18n/content/resolve'
import { findPendingReviews } from '@/app/lib/i18n/content/review'

import {
  COSTA_RICA_SECTION_KEY,
  spaceWeatherSectionContent,
  splitParagraphs,
  translationLocales,
  type SpaceWeatherSection,
  type SpaceWeatherSectionReviewConfirmation,
  type SpaceWeatherSectionUpdateInput,
} from './space-weather-section-schema'

export * from './space-weather-section-schema'

/**
 * The space weather page's editable content: the "¿Por qué estudiarlo desde Costa Rica?" card,
 * read in the visitor's language and written in every language at once
 * (docs/translate-database-content.md). It is seeded by its migration and never created or
 * deleted here.
 *
 * Every write runs in one transaction against the version the editor loaded, so two editors
 * cannot overwrite each other and a failed save leaves the stored text as it was.
 */

export type SpaceWeatherSectionWriteFailure =
  | { ok: false; reason: 'not-found' }
  /** The section changed since the editor loaded it. */
  | { ok: false; reason: 'conflict' }
  /** Fields changed in one language whose counterpart was neither changed nor confirmed. */
  | { ok: false; reason: 'review-required'; pending: SpaceWeatherSectionReviewConfirmation[] }

export type SpaceWeatherSectionWriteResult =
  { ok: true; section: SpaceWeatherSection } | SpaceWeatherSectionWriteFailure

const sectionInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, body: true },
  },
} satisfies Prisma.SpaceWeatherSectionInclude

type SectionRecord = Prisma.SpaceWeatherSectionGetPayload<{ include: typeof sectionInclude }>

function toSection(
  record: SectionRecord,
  locale: Locale,
  includeEditingData: boolean,
): SpaceWeatherSection {
  const stored = storedContentFrom(spaceWeatherSectionContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    title: content.title,
    paragraphs: splitParagraphs(content.body),
    contentLocale,
    // Every language and the version only for someone who can edit.
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  }
}

/**
 * The Costa Rica card in `locale`, falling back to the base text when that translation is
 * missing; `contentLocale` says which one was used. `null` when the row is missing: the page then
 * shows the catalogue's text. Pass `includeEditingData` only after a server-side check of the edit
 * permission, because it sends every language to the browser.
 */
export async function getSpaceWeatherSection(
  locale: Locale = defaultLocale,
  { includeEditingData = false } = {},
): Promise<SpaceWeatherSection | null> {
  const record = await prisma.spaceWeatherSection.findUnique({
    where: { key: COSTA_RICA_SECTION_KEY },
    include: sectionInclude,
  })

  return record ? toSection(record, locale, includeEditingData) : null
}

/**
 * Saves the card's title and body in every language against the version loaded: either
 * everything is stored or nothing is. Every one-sided change must have its counterpart changed or
 * confirmed (`findPendingReviews`).
 */
export async function updateSpaceWeatherSection(
  input: SpaceWeatherSectionUpdateInput,
  actor: AuditActor,
): Promise<SpaceWeatherSectionWriteResult> {
  const expected = parseVersion(input.version)

  const result = await runWrite<SectionRecord, SpaceWeatherSectionWriteFailure>(async (tx) => {
    const current = await tx.spaceWeatherSection.findUnique({
      where: { key: COSTA_RICA_SECTION_KEY },
      include: sectionInclude,
    })
    if (!current) {
      throw new WriteAbort<SpaceWeatherSectionWriteFailure>({ ok: false, reason: 'not-found' })
    }
    if (!isCurrentVersion(current.updatedAt, expected)) {
      throw new WriteAbort<SpaceWeatherSectionWriteFailure>({ ok: false, reason: 'conflict' })
    }

    const stored = storedContentFrom(spaceWeatherSectionContent, current, current.translations)
    const pending = findPendingReviews(
      spaceWeatherSectionContent,
      stored,
      input.content,
      input.confirmedUnchanged ?? [],
    )
    if (pending.length > 0) {
      throw new WriteAbort<SpaceWeatherSectionWriteFailure>({
        ok: false,
        reason: 'review-required',
        pending,
      })
    }

    // Only while nobody else saved; moves the version strictly forward.
    const { count } = await tx.spaceWeatherSection.updateMany({
      where: { id: current.id, updatedAt: expected },
      data: {
        ...baseContent(spaceWeatherSectionContent, input.content),
        updatedAt: nextUpdatedAt(expected),
      },
    })
    if (count === 0) {
      throw new WriteAbort<SpaceWeatherSectionWriteFailure>({ ok: false, reason: 'conflict' })
    }

    for (const { locale, ...text } of translationRows(spaceWeatherSectionContent, input.content)) {
      await tx.spaceWeatherSectionTranslation.upsert({
        where: { sectionId_locale: { sectionId: current.id, locale } },
        create: { sectionId: current.id, locale, ...text },
        update: text,
      })
    }

    const updated = await tx.spaceWeatherSection.findUniqueOrThrow({
      where: { id: current.id },
      include: sectionInclude,
    })
    await recordUserAuditEvent(tx, actor, {
      action: 'space_weather_section.update',
      summary: `Tarjeta de clima espacial actualizada: ${updated.title}`,
      entityType: 'space_weather_section',
      entityId: current.id,
      metadata: { fields: changedFieldNames(input) },
    })
    return updated
  })

  return result.ok ? { ok: true, section: toSection(result.value, defaultLocale, true) } : result
}
