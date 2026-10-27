import { prisma, type Prisma } from '@lasce/db'
import { z } from 'zod'

import { runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion, toVersion } from '@/app/lib/cms/version'
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import {
  baseContent,
  resolveContent,
  storedContentFrom,
  translationRows,
} from '@/app/lib/i18n/content/resolve'
import { paginate, type PageWindow } from '@/app/lib/pagination'
import { escapeLikeWildcards, parseSearchParam } from '@/app/lib/search-query'

import {
  findPendingReviews,
  newsContent,
  translationLocales,
  type NewsArticle,
  type NewsCreateInput,
  type NewsUpdateInput,
  type ReviewConfirmation,
} from './news-schema'

export * from './news-schema'

export type NewsWriteFailure =
  | { ok: false; reason: 'not-found' }
  /** The item changed since the editor loaded it. */
  | { ok: false; reason: 'conflict' }
  /** Another news item already uses the same external link. */
  | { ok: false; reason: 'duplicate-link' }
  /** Fields changed in one language whose counterpart was neither changed nor confirmed. */
  | { ok: false; reason: 'review-required'; pending: ReviewConfirmation[] }

export type NewsWriteResult = { ok: true; article: NewsArticle } | NewsWriteFailure

const newsRecordInclude = {
  source: true,
  authors: { orderBy: { position: 'asc' }, include: { newsAuthor: true } },
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, abstract: true },
  },
} satisfies Prisma.NewsInclude

type NewsRecord = Prisma.NewsGetPayload<{ include: typeof newsRecordInclude }>

/**
 * Newest first, undated items last, whatever the language. Items that share a date are ordered by
 * when they were created, newest first, and finally by id, so the order never depends on how the
 * database happens to return ties: a page boundary then falls in the same place on every query,
 * and no item is shown twice or skipped while the collection does not change.
 */
const newsOrder = [
  { publishedAt: { sort: 'desc', nulls: 'last' } },
  { createdAt: 'desc' },
  { id: 'desc' },
] satisfies Prisma.NewsOrderByWithRelationInput[]

/** "24 de mayo de 2026" or "May 24, 2026". Dates are stored without a time, so read them in UTC. */
function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function toNewsArticle(
  record: NewsRecord,
  locale: Locale,
  includeEditingData: boolean,
): NewsArticle {
  const content = storedContentFrom(newsContent, record, record.translations)
  // A complete item's base text was written or confirmed as Spanish when it was saved. A legacy
  // item's base text was entered before languages existed, so its language is unknown.
  const { content: shown, contentLocale, isLegacy } = resolveContent(content, locale)

  return {
    slug: record.id,
    title: shown.title,
    authors: record.authors.map((author) => author.newsAuthor.name).join(', '),
    source: record.source.name,
    date: record.publishedAt ? formatDate(record.publishedAt, locale) : null,
    publishedAt: record.publishedAt ? record.publishedAt.toISOString().slice(0, 10) : null,
    abstract: shown.abstract,
    href: record.externalUrl,
    contentLocale,
    ...(includeEditingData
      ? { editing: { content, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  }
}

/**
 * Loads news items from Postgres and maps each record to the shape rendered by `NewsExplorer`.
 *
 * `title` and `abstract` are in `locale` when the item has that translation, and fall back to the
 * base text otherwise; `contentLocale` says which one was used. Dates are formatted in `locale`.
 * Pass `includeEditingData` only for someone who can edit, because it sends every language to the
 * browser.
 *
 * Ordered as `newsOrder` says: newest first, undated items last, whatever the language. Author
 * order within a record follows `NewsCrossAuthor.position`.
 */
export async function getNews(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<NewsArticle[]> {
  const records = await prisma.news.findMany({ orderBy: newsOrder, include: newsRecordInclude })

  return records.map((record) => toNewsArticle(record, locale, includeEditingData))
}

/**
 * The news items matching `query` as a visitor reading in `locale` sees them, so a search finds
 * what is on the screen:
 *
 * - title and abstract in the text `resolveContent` shows: the `locale` translation when the item
 *   has one, the base text otherwise (always the base text in the default locale);
 * - the source and author names, which every language shares.
 *
 * Case is ignored, and `%` and `_` are matched literally. An empty query matches every item.
 */
export function newsSearchWhere(query: string, locale: Locale): Prisma.NewsWhereInput {
  if (query === '') return {}

  const text = {
    contains: escapeLikeWildcards(query),
    mode: 'insensitive',
  } satisfies Prisma.StringFilter
  const titleOrAbstract = [{ title: text }, { abstract: text }]

  const shownText: Prisma.NewsWhereInput =
    locale === defaultLocale
      ? { OR: titleOrAbstract }
      : {
          OR: [
            { translations: { some: { locale, OR: titleOrAbstract } } },
            { translations: { none: { locale } }, OR: titleOrAbstract },
          ],
        }

  return {
    OR: [
      shownText,
      { source: { name: text } },
      { authors: { some: { newsAuthor: { name: text } } } },
    ],
  }
}

export interface NewsPageRequest {
  /** The search text. It is trimmed and cut to `SEARCH_MAX_LENGTH`; empty means every item. */
  query?: string
  /** The page asked for. A page outside `1..totalPages` is brought within it. */
  page?: number
  /** Only for someone who can edit: it sends every language to the browser. */
  includeEditingData?: boolean
}

export interface NewsPage extends PageWindow {
  /** The items on `page`, shaped as `getNews` shapes them, in `newsOrder`. */
  articles: NewsArticle[]
  /** The search text actually applied, after trimming and cutting. */
  query: string
}

/**
 * One page of the news items matching `query`, read in `locale`. The database applies the search,
 * the order and the page, so only the items on that page are loaded. Totals count the matching
 * items, not the whole collection.
 *
 * `page` is normalized against the matching items (see `paginate`): the returned `page` is the
 * one shown, which the caller compares with the one asked for to correct the URL. With no
 * matching item, `totalPages` is 0, `page` is 1 and `articles` is empty.
 */
export async function getNewsPage(
  locale: Locale = defaultLocale,
  { query = '', page = 1, includeEditingData = false }: NewsPageRequest = {},
): Promise<NewsPage> {
  const search = parseSearchParam(query)
  const where = newsSearchWhere(search, locale)

  const totalItems = await prisma.news.count({ where })
  const window = paginate(totalItems, page)

  const records =
    totalItems === 0
      ? []
      : await prisma.news.findMany({
          where,
          orderBy: newsOrder,
          include: newsRecordInclude,
          skip: window.skip,
          take: window.take,
        })

  return {
    ...window,
    query: search,
    articles: records.map((record) => toNewsArticle(record, locale, includeEditingData)),
  }
}

/**
 * Loads one news item, shaped as `getNews` shapes it, or `null` when `id` is not a UUID or no
 * item has it.
 */
export async function getNewsById(
  id: string,
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<NewsArticle | null> {
  if (!z.uuid().safeParse(id).success) return null

  const record = await prisma.news.findUnique({ where: { id }, include: newsRecordInclude })
  return record ? toNewsArticle(record, locale, includeEditingData) : null
}

/** `external_url` is the one unique column on `News` besides its id. Anything else is rethrown. */
function duplicateFailure(columns: readonly string[]): NewsWriteFailure | null {
  return columns.includes('external_url') || columns.includes('externalUrl')
    ? { ok: false, reason: 'duplicate-link' }
    : null
}

/**
 * Runs a write transaction (`runWrite`) and reports the stored record as a news item. Expected
 * failures are raised as `WriteAbort` or as a unique violation, so the transaction rolls back
 * before anything is reported.
 */
async function writeNews(
  write: (tx: Prisma.TransactionClient) => Promise<NewsRecord>,
): Promise<NewsWriteResult> {
  const result = await runWrite(write, duplicateFailure)
  return result.ok
    ? { ok: true, article: toNewsArticle(result.value, defaultLocale, true) }
    : result
}

/** Sources are shared between news items and normalized by name. */
function upsertSource(tx: Prisma.TransactionClient, name: string) {
  return tx.newsSource.upsert({ where: { name }, update: {}, create: { name } })
}

/**
 * `publishedAt` arrives as a bare `yyyy-mm-dd`, but Prisma's client rejects that for a
 * `@db.Date` field: it wants a full ISO datetime or a `Date`.
 */
function toPublishedAtDate(publishedAt: string | null): Date | null {
  return publishedAt ? new Date(publishedAt) : null
}

/**
 * Replaces an item's author list with `authors`, in order. Only the join rows are deleted: an
 * author may be credited on other news items.
 */
async function replaceAuthors(
  tx: Prisma.TransactionClient,
  newsId: string,
  authors: readonly string[],
): Promise<void> {
  await tx.newsCrossAuthor.deleteMany({ where: { newsId } })

  for (const [position, name] of authors.entries()) {
    const author = await tx.newsAuthor.upsert({ where: { name }, update: {}, create: { name } })

    await tx.newsCrossAuthor.upsert({
      where: { newsId_newsAuthorId: { newsId, newsAuthorId: author.id } },
      update: {},
      create: { newsId, newsAuthorId: author.id, position },
    })
  }
}

/**
 * Creates a news item in every language at once, together with its source and its ordered
 * authors. Either all of it is stored or none of it is.
 */
export async function createNews(input: NewsCreateInput): Promise<NewsWriteResult> {
  return writeNews(async (tx) => {
    const source = await upsertSource(tx, input.source)

    const record = await tx.news.create({
      data: {
        ...baseContent(newsContent, input.content),
        publishedAt: toPublishedAtDate(input.publishedAt),
        sourceId: source.id,
        externalUrl: input.externalUrl,
        translations: { create: translationRows(newsContent, input.content) },
      },
    })

    await replaceAuthors(tx, record.id, input.authors)

    return tx.news.findUniqueOrThrow({ where: { id: record.id }, include: newsRecordInclude })
  })
}

/**
 * Updates the fields present in `input`, all at once: either everything is stored or nothing is.
 *
 * With `content` it is a bilingual content update: both languages are written, after checking
 * that every one-sided change has its counterpart changed or confirmed (`findPendingReviews`).
 * Without `content` it updates shared fields only, and titles, abstracts and translations are
 * left exactly as they are, so a legacy item can be corrected without being translated first.
 *
 * Optimistic concurrency applies to both kinds: `input.version` is the `updated_at` the editor
 * loaded. The base row is updated only while it still has that value, and every save moves it
 * forward, so of two editors who loaded the same version the second one gets `conflict`.
 */
export async function updateNews(id: string, input: NewsUpdateInput): Promise<NewsWriteResult> {
  const expectedUpdatedAt = parseVersion(input.version)

  return writeNews(async (tx) => {
    const current = await tx.news.findUnique({
      where: { id },
      select: {
        title: true,
        abstract: true,
        updatedAt: true,
        translations: newsRecordInclude.translations,
      },
    })

    if (!current) throw new WriteAbort<NewsWriteFailure>({ ok: false, reason: 'not-found' })

    if (!isCurrentVersion(current.updatedAt, expectedUpdatedAt)) {
      throw new WriteAbort<NewsWriteFailure>({ ok: false, reason: 'conflict' })
    }

    const { content } = input

    if (content) {
      const pending = findPendingReviews(
        storedContentFrom(newsContent, current, current.translations),
        content,
        input.confirmedUnchanged ?? [],
      )

      if (pending.length > 0) {
        throw new WriteAbort<NewsWriteFailure>({ ok: false, reason: 'review-required', pending })
      }
    }

    const source = input.source === undefined ? undefined : await upsertSource(tx, input.source)

    const { count } = await tx.news.updateMany({
      where: { id, updatedAt: expectedUpdatedAt },
      data: {
        ...(content ? baseContent(newsContent, content) : {}),
        ...(input.publishedAt === undefined
          ? {}
          : { publishedAt: toPublishedAtDate(input.publishedAt) }),
        ...(source === undefined ? {} : { sourceId: source.id }),
        ...(input.externalUrl === undefined ? {} : { externalUrl: input.externalUrl }),
        // Strictly later than the version it replaces, even if two saves share a millisecond.
        updatedAt: nextUpdatedAt(expectedUpdatedAt),
      },
    })

    if (count === 0) throw new WriteAbort<NewsWriteFailure>({ ok: false, reason: 'conflict' })

    if (content) {
      for (const { locale, ...text } of translationRows(newsContent, content)) {
        await tx.newsTranslation.upsert({
          where: { newsId_locale: { newsId: id, locale } },
          create: { newsId: id, locale, ...text },
          update: text,
        })
      }
    }

    if (input.authors !== undefined) {
      await replaceAuthors(tx, id, input.authors)
    }

    return tx.news.findUniqueOrThrow({ where: { id }, include: newsRecordInclude })
  })
}

/** Deletes a news item. Its translations and author links go with it (`ON DELETE CASCADE`). */
export async function deleteNews(id: string): Promise<boolean> {
  // One statement that reports how many rows it removed: a concurrent delete of the same item
  // finds nothing and answers "not found", instead of failing between a check and the delete.
  const { count } = await prisma.news.deleteMany({ where: { id } })
  return count > 0
}
