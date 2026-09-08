import { prisma } from '@lasce/db'

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
  abstract: string
  href: string
  imageUrl: string
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
    orderBy: { publishedAt: 'desc' },
    include: {
      source: true,
      authors: {
        orderBy: { position: 'asc' },
        include: { newsAuthor: true },
      },
    },
  })

  return records.map((record) => ({
    slug: record.id,
    title: record.title,
    authors: record.authors.map((author) => author.newsAuthor.name).join(', '),
    source: record.source.name,
    date: String(record.publishedAt.getUTCFullYear()),
    abstract: record.abstract,
    href: record.externalUrl,
    imageUrl: record.imageUrl,
  }))
}
