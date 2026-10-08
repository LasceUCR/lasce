import { prisma, Prisma } from '@lasce/db'

import { defaultLocale, type Locale } from '@/app/lib/i18n/config'

import {
  findPendingReviews,
  translationLocales,
  type LocalizedPublicationContent,
  type Publication,
  type PublicationCreateInput,
  type PublicationUpdateInput,
  type ReviewConfirmation,
  type StoredPublicationContent,
} from './publication-schema'

export * from './publication-schema'

export const publicacionesMeta = {
  title: 'Publicaciones | LASCE',
  description:
    'Publicaciones científicas del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
} as const

export const publicacionesHero = {
  kicker: 'Portal público LASCE',
  title: 'Publicaciones científicas',
  lead: 'Publicaciones y contribuciones científicas del LASCE y ROSAC.',
} as const

export const publicacionesBackLink = {
  href: '/',
  label: 'Volver al inicio',
} as const

export type PublicationWriteFailure =
  | { ok: false; reason: 'not-found' }
  /** The record changed since the editor loaded it. */
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'duplicate'; field: 'doi' | 'externalUrl' }
  /** Fields changed in one language whose counterpart was neither changed nor confirmed. */
  | { ok: false; reason: 'review-required'; pending: ReviewConfirmation[] }

export type PublicationWriteResult =
  { ok: true; publication: Publication } | PublicationWriteFailure

const recordInclude = {
  publisher: true,
  authors: {
    orderBy: { position: 'asc' },
    include: { researchAuthor: true },
  },
  translations: {
    where: { locale: { in: translationLocales } },
    select: { locale: true, title: true, abstract: true },
  },
} satisfies Prisma.ResearchInclude

type ResearchRecord = Prisma.ResearchGetPayload<{ include: typeof recordInclude }>

type StoredText = LocalizedPublicationContent & { locale?: string }

function storedContent(base: StoredText, translations: StoredText[]): StoredPublicationContent {
  const content = { [defaultLocale]: { title: base.title, abstract: base.abstract } } as Record<
    Locale,
    LocalizedPublicationContent | null
  >

  for (const locale of translationLocales) {
    const row = translations.find((translation) => translation.locale === locale)
    content[locale] = row ? { title: row.title, abstract: row.abstract } : null
  }

  return content as StoredPublicationContent
}

function isLegacyContent(content: StoredPublicationContent): boolean {
  return translationLocales.some((locale) => content[locale] === null)
}

function toPublication(
  record: ResearchRecord,
  locale: Locale,
  includeEditingData: boolean,
): Publication {
  const content = storedContent(record, record.translations)
  const isLegacy = isLegacyContent(content)
  const translated = locale === defaultLocale ? null : content[locale]
  // A complete record's base text was written or confirmed as Spanish when it was saved. A legacy
  // record's base text was entered before languages existed, so its language is unknown.
  const shown = translated ?? content[defaultLocale]
  const contentLocale = translated ? locale : isLegacy ? null : defaultLocale

  return {
    slug: record.id,
    title: shown.title,
    authors: record.authors.map((author) => author.researchAuthor.name),
    venue: record.publisher.name,
    year: String(record.publicationDate.getUTCFullYear()),
    date: record.publicationDate,
    abstract: shown.abstract,
    href: record.externalUrl || undefined,
    DOI: record.doi || '',
    researchGroup: record.researchGroup,
    contentLocale,
    ...(includeEditingData
      ? { editing: { content, isLegacy, version: record.updatedAt.toISOString() } }
      : {}),
  }
}

/**
 * Loads publications from the `research` schema (`packages/db/prisma/schema.prisma`)
 * and maps each record to the shape `PublicationsExplorer` renders.
 *
 * `title` and `abstract` are in `locale` when the record has that translation, and fall back to
 * the base text otherwise; `contentLocale` says which one was used. Pass `includeEditingData`
 * only for someone who can edit, because it sends every language to the browser.
 *
 * Ordered newest first. Author order within a record follows
 * `ResearchCrossAuthor.position`, so a citation reads the same as its source
 * rather than in whatever order the join happens to return rows.
 */
export async function getPublications(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<Publication[]> {
  const records = await prisma.research.findMany({
    orderBy: { publicationDate: 'desc' },
    include: recordInclude,
  })

  return records.map((record) => toPublication(record, locale, includeEditingData))
}

/** Thrown inside a transaction to roll it back and report `failure` to the caller. */
class PublicationWriteAbort extends Error {
  constructor(readonly failure: PublicationWriteFailure) {
    super(failure.reason)
  }
}

function readPath(value: unknown, path: string[]): unknown {
  let current = value

  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[key]
  }

  return current
}

function asStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return []
}

/**
 * Which unique column a P2002 violated. With a driver adapter Prisma reports it under
 * `meta.driverAdapterError.cause.constraint.fields` as column names; without one, under
 * `meta.target`. Anything else is not a duplicate this module knows how to explain.
 */
function duplicateField(error: unknown): 'doi' | 'externalUrl' | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null
  }

  const fields = [
    ...asStrings(readPath(error.meta, ['target'])),
    ...asStrings(readPath(error.meta, ['driverAdapterError', 'cause', 'constraint', 'fields'])),
  ]

  if (fields.includes('doi')) return 'doi'
  if (fields.includes('external_url') || fields.includes('externalUrl')) return 'externalUrl'

  return null
}

/**
 * Runs a write transaction and turns its expected failures into results. Expected failures are
 * raised as `PublicationWriteAbort` or as a unique violation, so the transaction rolls back
 * before anything is reported: catching a database error inside an interactive transaction would
 * leave PostgreSQL's transaction aborted.
 */
async function runWrite(
  write: (tx: Prisma.TransactionClient) => Promise<ResearchRecord>,
): Promise<PublicationWriteResult> {
  try {
    const record = await prisma.$transaction(write)

    return { ok: true, publication: toPublication(record, defaultLocale, true) }
  } catch (error) {
    if (error instanceof PublicationWriteAbort) return error.failure

    const field = duplicateField(error)
    if (field) return { ok: false, reason: 'duplicate', field }

    throw error
  }
}

/** Publishers are shared between publications and normalized by name. */
function upsertPublisher(tx: Prisma.TransactionClient, name: string) {
  return tx.publisher.upsert({ where: { name }, update: {}, create: { name } })
}

/**
 * Replaces a record's author list, keeping the order supplied. Only the join rows are deleted:
 * an author may be credited on other publications.
 */
async function replaceAuthors(tx: Prisma.TransactionClient, researchId: string, names: string[]) {
  await tx.researchCrossAuthor.deleteMany({ where: { researchId } })

  for (const [position, name] of names.entries()) {
    const author = await tx.researchAuthor.upsert({
      where: { name },
      update: {},
      create: { name },
    })

    await tx.researchCrossAuthor.create({
      data: { researchId, researchAuthorId: author.id, position },
    })
  }
}

/**
 * Creates a publication in every language at once, together with its publisher and its ordered
 * authors. Either all of it is stored or none of it is.
 */
export async function createPublication(
  input: PublicationCreateInput,
): Promise<PublicationWriteResult> {
  return runWrite(async (tx) => {
    const publisher = await upsertPublisher(tx, input.venue)

    const research = await tx.research.create({
      data: {
        title: input.content[defaultLocale].title,
        abstract: input.content[defaultLocale].abstract,
        publicationDate: input.date,
        publisherId: publisher.id,
        externalUrl: input.href,
        doi: input.DOI,
        researchGroup: input.researchGroup,
        translations: {
          create: translationLocales.map((locale) => ({ locale, ...input.content[locale] })),
        },
      },
    })

    await replaceAuthors(tx, research.id, input.authors)

    return tx.research.findUniqueOrThrow({ where: { id: research.id }, include: recordInclude })
  })
}

/**
 * Updates the fields present in `input`, all at once: either everything is stored or nothing is.
 *
 * With `content` it is a bilingual content update: both languages are written, after checking
 * that every one-sided change has its counterpart changed or confirmed (`findPendingReviews`).
 * Without `content` it updates shared fields only, and titles, abstracts and translations are
 * left exactly as they are, so a legacy record can be corrected without being translated first.
 *
 * Optimistic concurrency applies to both kinds: `input.version` is the `updated_at` the editor
 * loaded. The base row is updated only while it still has that value, and every save moves it
 * forward, so of two editors who loaded the same version the second one gets `conflict` instead
 * of silently overwriting the first. The conditional `UPDATE` also locks the row until commit,
 * which closes the gap between the check and the write.
 */
export async function updatePublication(
  id: string,
  input: PublicationUpdateInput,
): Promise<PublicationWriteResult> {
  const expectedUpdatedAt = new Date(input.version)

  return runWrite(async (tx) => {
    const current = await tx.research.findUnique({
      where: { id },
      select: {
        title: true,
        abstract: true,
        updatedAt: true,
        translations: recordInclude.translations,
      },
    })

    if (!current) throw new PublicationWriteAbort({ ok: false, reason: 'not-found' })

    if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new PublicationWriteAbort({ ok: false, reason: 'conflict' })
    }

    const { content } = input

    if (content) {
      const pending = findPendingReviews(
        storedContent(current, current.translations),
        content,
        input.confirmedUnchanged ?? [],
      )

      if (pending.length > 0) {
        throw new PublicationWriteAbort({ ok: false, reason: 'review-required', pending })
      }
    }

    const publisher = input.venue === undefined ? undefined : await upsertPublisher(tx, input.venue)

    const { count } = await tx.research.updateMany({
      where: { id, updatedAt: expectedUpdatedAt },
      data: {
        ...(content
          ? { title: content[defaultLocale].title, abstract: content[defaultLocale].abstract }
          : {}),
        ...(input.date === undefined ? {} : { publicationDate: input.date }),
        ...(publisher === undefined ? {} : { publisherId: publisher.id }),
        ...(input.href === undefined ? {} : { externalUrl: input.href }),
        ...(input.DOI === undefined ? {} : { doi: input.DOI }),
        ...(input.researchGroup === undefined ? {} : { researchGroup: input.researchGroup }),
        // Strictly later than the version it replaces, even if two saves share a millisecond.
        updatedAt: new Date(Math.max(Date.now(), expectedUpdatedAt.getTime() + 1)),
      },
    })

    if (count === 0) throw new PublicationWriteAbort({ ok: false, reason: 'conflict' })

    if (content) {
      for (const locale of translationLocales) {
        await tx.researchTranslation.upsert({
          where: { researchId_locale: { researchId: id, locale } },
          create: { researchId: id, locale, ...content[locale] },
          update: content[locale],
        })
      }
    }

    if (input.authors !== undefined) {
      await replaceAuthors(tx, id, input.authors)
    }

    return tx.research.findUniqueOrThrow({ where: { id }, include: recordInclude })
  })
}

/** Deletes a publication. Its translations and author links go with it (`ON DELETE CASCADE`). */
export async function deletePublication(id: string): Promise<boolean> {
  const existing = await prisma.research.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!existing) {
    return false
  }

  await prisma.research.delete({
    where: { id },
  })

  return true
}
