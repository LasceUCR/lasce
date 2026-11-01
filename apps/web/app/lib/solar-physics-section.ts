import { prisma, type Prisma } from '@lasce/db'

import { changedFieldNames, recordUserAuditEvent, type AuditActor } from '@/app/lib/audit-log'
import { runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion, toVersion } from '@/app/lib/cms/version'
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import { findPendingReviews } from '@/app/lib/i18n/content/review'
import {
  baseContent,
  resolveContent,
  storedContentFrom,
  translationRows,
} from '@/app/lib/i18n/content/resolve'

import {
  LASCE_SECTION_KEY,
  solarPhysicsSectionContent,
  splitParagraphs,
  translationLocales,
  type SolarPhysicsSection,
  type SolarPhysicsSectionReviewConfirmation,
  type SolarPhysicsSectionUpdateInput,
} from './solar-physics-section-schema'

export * from './solar-physics-section-schema'

export type SolarPhysicsSectionWriteFailure =
  | { ok: false; reason: 'not-found' }
  /** The section changed since the editor loaded it. */
  | { ok: false; reason: 'conflict' }
  /** Fields changed in one language whose counterpart was neither changed nor confirmed. */
  | { ok: false; reason: 'review-required'; pending: SolarPhysicsSectionReviewConfirmation[] }

export type SolarPhysicsSectionWriteResult =
  { ok: true; section: SolarPhysicsSection } | SolarPhysicsSectionWriteFailure

const sectionInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, body: true },
  },
} satisfies Prisma.SolarPhysicsSectionInclude

type SectionRecord = Prisma.SolarPhysicsSectionGetPayload<{ include: typeof sectionInclude }>

function toSection(
  record: SectionRecord,
  locale: Locale,
  includeEditingData: boolean,
): SolarPhysicsSection {
  const stored = storedContentFrom(solarPhysicsSectionContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    title: content.title,
    paragraphs: splitParagraphs(content.body),
    contentLocale,
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  }
}

/**
 * Loads the LASCE section of the solar physics page. `title` and the paragraphs are in `locale`
 * when the section has that translation, and fall back to the base text otherwise;
 * `contentLocale` says which one was used. Pass `includeEditingData` only for someone who can
 * edit, because it sends every language to the browser. Returns `null` when the row is missing.
 */
export async function getSolarPhysicsSection(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<SolarPhysicsSection | null> {
  const record = await prisma.solarPhysicsSection.findUnique({
    where: { key: LASCE_SECTION_KEY },
    include: sectionInclude,
  })

  return record ? toSection(record, locale, includeEditingData) : null
}

/**
 * Updates the section's text in every language, all at once: either everything is stored or
 * nothing is. Every one-sided change must have its counterpart changed or confirmed
 * (`findPendingReviews`).
 *
 * Optimistic concurrency: `input.version` is the `updated_at` the editor loaded. The base row is
 * updated only while it still has that value, and every save moves it forward, so of two editors
 * who loaded the same version the second one gets `conflict` instead of overwriting the first.
 */
export async function updateSolarPhysicsSection(
  input: SolarPhysicsSectionUpdateInput,
  actor: AuditActor,
): Promise<SolarPhysicsSectionWriteResult> {
  const expectedUpdatedAt = parseVersion(input.version)
  const { content } = input

  const result = await runWrite<SectionRecord, SolarPhysicsSectionWriteFailure>(async (tx) => {
    const current = await tx.solarPhysicsSection.findUnique({
      where: { key: LASCE_SECTION_KEY },
      select: {
        id: true,
        title: true,
        body: true,
        updatedAt: true,
        translations: sectionInclude.translations,
      },
    })

    if (!current) {
      throw new WriteAbort<SolarPhysicsSectionWriteFailure>({ ok: false, reason: 'not-found' })
    }

    if (!isCurrentVersion(current.updatedAt, expectedUpdatedAt)) {
      throw new WriteAbort<SolarPhysicsSectionWriteFailure>({ ok: false, reason: 'conflict' })
    }

    const pending = findPendingReviews(
      solarPhysicsSectionContent,
      storedContentFrom(solarPhysicsSectionContent, current, current.translations),
      content,
      input.confirmedUnchanged ?? [],
    )

    if (pending.length > 0) {
      throw new WriteAbort<SolarPhysicsSectionWriteFailure>({
        ok: false,
        reason: 'review-required',
        pending,
      })
    }

    const { count } = await tx.solarPhysicsSection.updateMany({
      where: { key: LASCE_SECTION_KEY, updatedAt: expectedUpdatedAt },
      data: {
        ...baseContent(solarPhysicsSectionContent, content),
        // Strictly later than the version it replaces, even if two saves share a millisecond.
        updatedAt: nextUpdatedAt(expectedUpdatedAt),
      },
    })

    if (count === 0) {
      throw new WriteAbort<SolarPhysicsSectionWriteFailure>({ ok: false, reason: 'conflict' })
    }

    for (const { locale, ...text } of translationRows(solarPhysicsSectionContent, content)) {
      await tx.solarPhysicsSectionTranslation.upsert({
        where: { sectionId_locale: { sectionId: current.id, locale } },
        create: { sectionId: current.id, locale, ...text },
        update: text,
      })
    }

    const updated = await tx.solarPhysicsSection.findUniqueOrThrow({
      where: { key: LASCE_SECTION_KEY },
      include: sectionInclude,
    })
    await recordUserAuditEvent(tx, actor, {
      action: 'solar_physics_section.update',
      summary: `Sección de física solar actualizada: ${updated.title}`,
      entityType: 'solar_physics_section',
      entityId: updated.id,
      metadata: { fields: changedFieldNames(input) },
    })
    return updated
  })

  return result.ok ? { ok: true, section: toSection(result.value, defaultLocale, true) } : result
}
