import { prisma } from '@lasce/db'
import type { Prisma } from '@lasce/db'
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
  imageUrl: string
  imageAlt: string
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
    imageUrl: record.imageUrl,
    imageAlt: record.imageAlt,
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
  imageUrl: z.string().trim().min(1, 'La imagen es obligatoria.'),
  imageAlt: z.string().trim(),
})

export type NewsInput = z.infer<typeof newsInputSchema>

/**
 * Replaces a news item's author list with `authors`, in order. Upserts each name (shared
 * `NewsAuthor` rows, same as the seed script) and drops cross-author rows for names no longer
 * present — the one relation `NosotrosActivity`'s CRUD doesn't have to deal with.
 */
async function syncNewsAuthors(newsId: string, authors: readonly string[]): Promise<void> {
  const authorIds = await Promise.all(
    authors.map(async (name, index) => {
      const author = await prisma.newsAuthor.upsert({
        where: { name },
        update: {},
        create: { name },
      })

      await prisma.newsCrossAuthor.upsert({
        where: { newsId_newsAuthorId: { newsId, newsAuthorId: author.id } },
        update: { position: index },
        create: { newsId, newsAuthorId: author.id, position: index },
      })

      return author.id
    }),
  )

  await prisma.newsCrossAuthor.deleteMany({
    where: { newsId, newsAuthorId: { notIn: authorIds } },
  })
}

/** Creates a news item and its author links. */
export async function createNews(data: NewsInput): Promise<NewsArticle> {
  const source = await prisma.newsSource.upsert({
    where: { name: data.source },
    update: {},
    create: { name: data.source },
  })

  const record = await prisma.news.create({
    data: {
      title: data.title,
      publishedAt: data.publishedAt,
      sourceId: source.id,
      abstract: data.abstract,
      externalUrl: data.externalUrl,
      imageUrl: data.imageUrl,
      imageAlt: data.imageAlt,
    },
  })

  await syncNewsAuthors(record.id, data.authors)

  return findNewsArticle(record.id)
}

/**
 * Updates one news item. Returns `null` when `id` does not match any row, rather than throwing,
 * so the route handler can turn that into a 404 — same pre-check pattern as
 * `updateNosotrosActivity`.
 */
export async function updateNews(id: string, data: NewsInput): Promise<NewsArticle | null> {
  const existing = await prisma.news.findUnique({ where: { id } })
  if (!existing) return null

  const source = await prisma.newsSource.upsert({
    where: { name: data.source },
    update: {},
    create: { name: data.source },
  })

  await prisma.news.update({
    where: { id },
    data: {
      title: data.title,
      publishedAt: data.publishedAt,
      sourceId: source.id,
      abstract: data.abstract,
      externalUrl: data.externalUrl,
      imageUrl: data.imageUrl,
      imageAlt: data.imageAlt,
    },
  })

  await syncNewsAuthors(id, data.authors)

  return findNewsArticle(id)
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
