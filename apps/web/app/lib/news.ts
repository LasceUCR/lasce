import { prisma, Prisma } from '@lasce/db'
import { z } from 'zod'

const newsRecordInclude = {
  source: true,
  authors: { orderBy: { position: 'asc' as const }, include: { newsAuthor: true } },
} satisfies Prisma.NewsInclude

type NewsRecord = Prisma.NewsGetPayload<{ include: typeof newsRecordInclude }>

export const noticiasMeta = {
  title: 'Noticias | LASCE',
  description:
    'Noticias y cobertura mediática del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
} as const

export const noticiasHero = {
  kicker: 'Portal público LASCE',
  title: 'Noticias y cobertura mediática',
  lead: 'Noticias, divulgación y cobertura sobre el trabajo del LASCE.',
} as const

export const noticiasBackLink = {
  href: '/',
  label: 'Volver al inicio',
} as const

export type NewsArticle = {
  slug: string
  title: string
  authors: string
  source: string
  date: string
  /** Raw ISO date (`yyyy-mm-dd`), or `null` when undated — what an edit form needs; `date` is
   * display-only and doesn't round-trip. */
  publishedAt: string | null
  abstract: string
  href: string
}

/**
 * Loads news articles from Postgres and maps each record to the shape
 * rendered by `NewsExplorer`.
 *
 * Ordered newest first. Author order within a record follows
 * `NewsCrossAuthor.position`.
 */
export async function getNews(): Promise<NewsArticle[]> {
  const records = await prisma.news.findMany({
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    include: newsRecordInclude,
  })

  return records.map(toNewsArticle)
}

async function findNewsArticle(id: string): Promise<NewsArticle> {
  const record = await prisma.news.findUniqueOrThrow({ where: { id }, include: newsRecordInclude })
  return toNewsArticle(record)
}

function toNewsArticle(record: NewsRecord): NewsArticle {
  return {
    slug: record.id,
    title: record.title,
    authors: record.authors.map((author) => author.newsAuthor.name).join(', '),
    source: record.source.name,
    date: record.publishedAt
      ? new Intl.DateTimeFormat('es-CR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(record.publishedAt)
      : 'Sin fecha',
    publishedAt: record.publishedAt ? record.publishedAt.toISOString().slice(0, 10) : null,
    abstract: record.abstract,
    href: record.externalUrl,
  }
}

/** Shared by create and update: an article's editable fields, as the form submits them. */
export const newsInputSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.'),
  source: z.string().trim().min(1, 'La fuente es obligatoria.'),
  authors: z.array(z.string().trim().min(1)).min(1, 'Debe indicar al menos un autor.'),
  publishedAt: z.string().date().nullable(),
  externalUrl: z.string().trim().url('El enlace debe ser una URL válida.'),
  abstract: z.string().trim().min(1, 'El resumen es obligatorio.'),
})

export type NewsInput = z.infer<typeof newsInputSchema>

/**
 * `newsInputSchema` validates `publishedAt` as a bare `yyyy-mm-dd` string, but
 * Prisma's client rejects that for a `DateTime`/`@db.Date` field — it wants a
 * full ISO datetime or a `Date` object ("premature end of input. Expected
 * ISO-8601 DateTime"). Converts once, right before either write.
 */
function toPublishedAtDate(publishedAt: string | null): Date | null {
  return publishedAt ? new Date(publishedAt) : null
}

/**
 * Replaces a news item's author list with `authors`, in order. Upserts each name (shared
 * `NewsAuthor` rows, same as the seed script) and drops cross-author rows for names no longer
 * present — the one relation `NosotrosActivity`'s CRUD doesn't have to deal with. Runs inside the
 * caller's transaction, one query at a time, since a transaction holds a single connection.
 */
async function syncNewsAuthors(
  tx: Prisma.TransactionClient,
  newsId: string,
  authors: readonly string[],
): Promise<void> {
  const authorIds: string[] = []

  for (const [index, name] of authors.entries()) {
    const author = await tx.newsAuthor.upsert({
      where: { name },
      update: {},
      create: { name },
    })

    await tx.newsCrossAuthor.upsert({
      where: { newsId_newsAuthorId: { newsId, newsAuthorId: author.id } },
      update: { position: index },
      create: { newsId, newsAuthorId: author.id, position: index },
    })

    authorIds.push(author.id)
  }

  await tx.newsCrossAuthor.deleteMany({
    where: { newsId, newsAuthorId: { notIn: authorIds } },
  })
}

/** What a create or update returns when another news item already uses the same link. */
export const DUPLICATE_NEWS_LINK = 'duplicate-link'

export const DUPLICATE_NEWS_LINK_MESSAGE =
  'Ya existe una noticia con este enlace. Use otro enlace o edite la noticia existente.'

/**
 * Thrown from inside a write transaction when `externalUrl` (the one unique column on `News`
 * besides its id) is already taken, so the whole transaction rolls back. Only the `news` write
 * itself is wrapped: a unique violation from a concurrent source or author upsert is a different
 * failure and must not be reported as a duplicate link.
 */
class DuplicateNewsLinkError extends Error {}

async function writeNewsRow<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write()
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new DuplicateNewsLinkError()
    }
    throw error
  }
}

function newsRowData(data: NewsInput, sourceId: string) {
  return {
    title: data.title,
    publishedAt: toPublishedAtDate(data.publishedAt),
    sourceId,
    abstract: data.abstract,
    externalUrl: data.externalUrl,
  }
}

/**
 * Creates a news item and its author links in one transaction, so a failure part way leaves
 * nothing behind. Returns `DUPLICATE_NEWS_LINK` when the link is already used.
 */
export async function createNews(
  data: NewsInput,
): Promise<NewsArticle | typeof DUPLICATE_NEWS_LINK> {
  let id: string
  try {
    id = await prisma.$transaction(async (tx) => {
      const source = await tx.newsSource.upsert({
        where: { name: data.source },
        update: {},
        create: { name: data.source },
      })

      const record = await writeNewsRow(() =>
        tx.news.create({ data: newsRowData(data, source.id) }),
      )

      await syncNewsAuthors(tx, record.id, data.authors)
      return record.id
    })
  } catch (error) {
    if (error instanceof DuplicateNewsLinkError) return DUPLICATE_NEWS_LINK
    throw error
  }

  return findNewsArticle(id)
}

/**
 * Updates one news item and its author links in one transaction, so a failure part way leaves
 * the saved article as it was. Returns `null` when `id` does not match any row, rather than
 * throwing, so the route handler can turn that into a 404 — same pre-check pattern as
 * `updateNosotrosActivity`. Returns `DUPLICATE_NEWS_LINK` when another item uses the link.
 */
export async function updateNews(
  id: string,
  data: NewsInput,
): Promise<NewsArticle | typeof DUPLICATE_NEWS_LINK | null> {
  let found: boolean
  try {
    found = await prisma.$transaction(async (tx) => {
      const existing = await tx.news.findUnique({ where: { id } })
      if (!existing) return false

      const source = await tx.newsSource.upsert({
        where: { name: data.source },
        update: {},
        create: { name: data.source },
      })

      await writeNewsRow(() =>
        tx.news.update({ where: { id }, data: newsRowData(data, source.id) }),
      )

      await syncNewsAuthors(tx, id, data.authors)
      return true
    })
  } catch (error) {
    if (error instanceof DuplicateNewsLinkError) return DUPLICATE_NEWS_LINK
    throw error
  }

  return found ? findNewsArticle(id) : null
}

/**
 * Deletes one news item. Returns `false` when `id` does not match any row, rather than throwing —
 * same pre-check pattern as `deleteNosotrosActivity`. `NewsCrossAuthor` rows cascade with it;
 * shared `NewsAuthor`/`NewsSource` rows are left in place, same as `Research`'s analogous CRUD.
 */
export async function deleteNews(id: string): Promise<boolean> {
  const existing = await prisma.news.findUnique({ where: { id } })
  if (!existing) return false

  await prisma.news.delete({ where: { id } })
  return true
}
