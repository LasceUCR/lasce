import { prisma, type Prisma } from '@lasce/db'

import { changedFieldNames, recordUserAuditEvent, type AuditActor } from '@/app/lib/audit-log'
import { runWrite, WriteAbort } from '@/app/lib/cms/transaction'
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
  heroContent,
  indicatorContent,
  isIndicatorCode,
  type GeomagneticIndicatorData,
  type HeroReviewConfirmation,
  type HeroUpdateInput,
  type HomeHeroData,
  type IndicatorOrderInput,
  type IndicatorPositionField,
  type IndicatorReviewConfirmation,
  type IndicatorUpdateInput,
} from './home-schema'

export * from './home-schema'

/**
 * The home page's editable content: the hero banner and the geomagnetic indices, read in the
 * visitor's language and written in every language at once (docs/translate-database-content.md).
 * Both are seeded by their migration and are never created or deleted here.
 *
 * Every write runs in one transaction against the version the editor loaded, so two editors, or
 * an editor and a future loading job, cannot overwrite each other.
 */

export type HomeWriteFailure<F extends string = string> =
  | { ok: false; reason: 'not-found' }
  /** The record changed since the editor loaded it. */
  | { ok: false; reason: 'conflict' }
  /** Fields changed in one language whose counterpart was neither changed nor confirmed. */
  | { ok: false; reason: 'review-required'; pending: { locale: Locale; field: F }[] }

export type HeroWriteFailure = HomeWriteFailure<HeroReviewConfirmation['field']>
export type IndicatorWriteFailure = HomeWriteFailure<IndicatorReviewConfirmation['field']>

/** The reorder's only expected failure: the ids sent are not exactly the stored indices. */
export type OrderWriteFailure = { ok: false; reason: 'conflict' }

const heroInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, lead: true },
  },
} satisfies Prisma.HomeHeroInclude

const indicatorInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, description: true },
  },
} satisfies Prisma.GeomagneticIndexInclude

type HeroRecord = Prisma.HomeHeroGetPayload<{ include: typeof heroInclude }>
type IndicatorRecord = Prisma.GeomagneticIndexGetPayload<{ include: typeof indicatorInclude }>

function toHero(record: HeroRecord, locale: Locale, includeEditingData: boolean): HomeHeroData {
  const stored = storedContentFrom(heroContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    title: content.title,
    lead: content.lead,
    contentLocale,
    // Every language and the version only for someone who can edit.
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  }
}

/** `null` for a row whose code has no label in the catalogue, which the page cannot show. */
function toIndicator(
  record: IndicatorRecord,
  locale: Locale,
  includeEditingData: boolean,
): GeomagneticIndicatorData | null {
  if (!isIndicatorCode(record.code)) return null

  const stored = storedContentFrom(indicatorContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    id: record.id,
    code: record.code,
    value: record.value,
    description: content.description,
    position: record.position,
    contentLocale,
    ...(includeEditingData
      ? {
          editing: {
            content: stored,
            isLegacy,
            value: record.value,
            version: toVersion(record.updatedAt),
          },
        }
      : {}),
  }
}

export interface HomeContent {
  /** `null` when the banner row is missing: the page then shows the catalogue's text. */
  hero: HomeHeroData | null
  /** Empty when no index is stored: the page then shows the catalogue's indices. */
  indicators: GeomagneticIndicatorData[]
}

/**
 * The home page's content in `locale`, falling back per record to the base text. Pass
 * `includeEditingData` only after a server-side check of the edit permission.
 */
export async function getHomeContent(
  locale: Locale = defaultLocale,
  { includeEditingData = false } = {},
): Promise<HomeContent> {
  const [hero, indicators] = await Promise.all([
    prisma.homeHero.findFirst({ include: heroInclude, orderBy: { createdAt: 'asc' } }),
    prisma.geomagneticIndex.findMany({
      include: indicatorInclude,
      orderBy: [{ position: 'asc' }, { code: 'asc' }],
    }),
  ])

  return {
    hero: hero ? toHero(hero, locale, includeEditingData) : null,
    indicators: indicators
      .map((record) => toIndicator(record, locale, includeEditingData))
      .filter((indicator): indicator is GeomagneticIndicatorData => indicator !== null),
  }
}

export type HeroWriteResult = { ok: true; hero: HomeHeroData } | HeroWriteFailure

/** Saves the banner's title and subtitle in every language against the version loaded. */
export async function updateHero(
  input: HeroUpdateInput,
  actor: AuditActor,
): Promise<HeroWriteResult> {
  const expected = parseVersion(input.version)

  const result = await runWrite<HeroRecord, HeroWriteFailure>(async (tx) => {
    const current = await tx.homeHero.findFirst({
      include: heroInclude,
      orderBy: { createdAt: 'asc' },
    })
    if (!current) throw new WriteAbort<HeroWriteFailure>({ ok: false, reason: 'not-found' })
    if (!isCurrentVersion(current.updatedAt, expected)) {
      throw new WriteAbort<HeroWriteFailure>({ ok: false, reason: 'conflict' })
    }

    const stored = storedContentFrom(heroContent, current, current.translations)
    const pending = findPendingReviews(
      heroContent,
      stored,
      input.content,
      input.confirmedUnchanged ?? [],
    )
    if (pending.length > 0) {
      throw new WriteAbort<HeroWriteFailure>({ ok: false, reason: 'review-required', pending })
    }

    // Only while nobody else saved; moves the version strictly forward.
    const { count } = await tx.homeHero.updateMany({
      where: { id: current.id, updatedAt: expected },
      data: { ...baseContent(heroContent, input.content), updatedAt: nextUpdatedAt(expected) },
    })
    if (count === 0) throw new WriteAbort<HeroWriteFailure>({ ok: false, reason: 'conflict' })

    for (const { locale, ...text } of translationRows(heroContent, input.content)) {
      await tx.homeHeroTranslation.upsert({
        where: { homeHeroId_locale: { homeHeroId: current.id, locale } },
        create: { homeHeroId: current.id, locale, ...text },
        update: text,
      })
    }

    const updated = await tx.homeHero.findUniqueOrThrow({
      where: { id: current.id },
      include: heroInclude,
    })
    await recordUserAuditEvent(tx, actor, {
      action: 'home_hero.update',
      summary: `Banner de inicio actualizado: ${updated.title}`,
      entityType: 'home_hero',
      entityId: current.id,
      metadata: { fields: changedFieldNames(input) },
    })
    return updated
  })

  return result.ok ? { ok: true, hero: toHero(result.value, defaultLocale, true) } : result
}

export type IndicatorWriteResult =
  { ok: true; indicator: GeomagneticIndicatorData | null } | IndicatorWriteFailure

/**
 * Saves an index's shared `value` and/or its description in every language. A value-only
 * update never touches the translations, so it works on a legacy row too. A save from the CMS
 * marks the value as entered by hand.
 */
export async function updateIndicator(
  id: string,
  input: IndicatorUpdateInput,
  actor: AuditActor,
): Promise<IndicatorWriteResult> {
  const expected = parseVersion(input.version)

  const result = await runWrite<IndicatorRecord, IndicatorWriteFailure>(async (tx) => {
    const current = await tx.geomagneticIndex.findUnique({
      where: { id },
      include: indicatorInclude,
    })
    if (!current) throw new WriteAbort<IndicatorWriteFailure>({ ok: false, reason: 'not-found' })
    if (!isCurrentVersion(current.updatedAt, expected)) {
      throw new WriteAbort<IndicatorWriteFailure>({ ok: false, reason: 'conflict' })
    }

    const { content } = input
    if (content) {
      const stored = storedContentFrom(indicatorContent, current, current.translations)
      const pending = findPendingReviews(
        indicatorContent,
        stored,
        content,
        input.confirmedUnchanged ?? [],
      )
      if (pending.length > 0) {
        throw new WriteAbort<IndicatorWriteFailure>({
          ok: false,
          reason: 'review-required',
          pending,
        })
      }
    }

    const { count } = await tx.geomagneticIndex.updateMany({
      where: { id, updatedAt: expected },
      data: {
        ...(content ? baseContent(indicatorContent, content) : {}),
        ...(input.value === undefined ? {} : { value: input.value }),
        source: 'MANUAL',
        observedAt: null,
        updatedAt: nextUpdatedAt(expected),
      },
    })
    if (count === 0) throw new WriteAbort<IndicatorWriteFailure>({ ok: false, reason: 'conflict' })

    if (content) {
      for (const { locale, ...text } of translationRows(indicatorContent, content)) {
        await tx.geomagneticIndexTranslation.upsert({
          where: { geomagneticIndexId_locale: { geomagneticIndexId: id, locale } },
          create: { geomagneticIndexId: id, locale, ...text },
          update: text,
        })
      }
    }

    const updated = await tx.geomagneticIndex.findUniqueOrThrow({
      where: { id },
      include: indicatorInclude,
    })
    await recordUserAuditEvent(tx, actor, {
      action: 'geomagnetic_index.update',
      summary: `Índice geomagnético actualizado: ${updated.code}`,
      entityType: 'geomagnetic_index',
      entityId: id,
      metadata: { fields: changedFieldNames(input) },
    })
    return updated
  })

  return result.ok
    ? { ok: true, indicator: toIndicator(result.value, defaultLocale, true) }
    : result
}

export type OrderWriteResult = { ok: true } | OrderWriteFailure

/** The Prisma field behind each position column a reorder may name. */
const positionColumns = {
  position: 'position',
} as const satisfies Record<IndicatorPositionField, Prisma.GeomagneticIndexScalarFieldEnum>

/**
 * Writes the display order to `positionField`: `ids` must be every stored index exactly once,
 * otherwise the page the editor reordered is out of date and the order is refused rather than
 * half applied.
 *
 * The positions are unique, so a swap cannot be written row by row: the second row would take
 * the first one's number while it still holds it. Every row first moves to a temporary negative
 * position, which no stored row uses, and then to its new one, in the same transaction.
 *
 * Moving a card is an editorial change to its row, so it moves that row's version forward too:
 * an edit form opened before someone else's reorder then gets a conflict instead of saving over
 * a row it did not load.
 */
export async function reorderIndicators(
  { ids, positionField }: IndicatorOrderInput,
  actor: AuditActor,
): Promise<OrderWriteResult> {
  const column = positionColumns[positionField]

  const result = await runWrite<null, OrderWriteFailure>(async (tx) => {
    const stored = await tx.geomagneticIndex.findMany({ select: { id: true } })
    const known = new Set(stored.map((row) => row.id))
    if (stored.length !== ids.length || !ids.every((id) => known.has(id))) {
      throw new WriteAbort<OrderWriteFailure>({ ok: false, reason: 'conflict' })
    }

    for (const [index, id] of ids.entries()) {
      await tx.geomagneticIndex.update({ where: { id }, data: { [column]: -(index + 1) } })
    }
    for (const [index, id] of ids.entries()) {
      await tx.geomagneticIndex.update({ where: { id }, data: { [column]: index } })
    }

    await recordUserAuditEvent(tx, actor, {
      action: 'geomagnetic_index.reorder',
      summary: 'Orden de los índices geomagnéticos actualizado',
      entityType: 'geomagnetic_index',
      metadata: { order: ids },
    })

    return null
  })

  return result.ok ? { ok: true } : result
}
