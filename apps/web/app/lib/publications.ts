import { prisma } from '@lasce/db'

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

export type ResearchGroup = 'LASCE' | 'ROSAC'

export type Publication = {
  slug: string
  title: string
  authors: string[]
  venue: string
  year: string
  date: Date
  abstract: string
  href: string
  researchGroup: ResearchGroup
}

/**
 * Loads publications from the `research` schema (`packages/db/prisma/schema.prisma`)
 * and maps each record to the shape `PublicationsExplorer` renders.
 *
 * Ordered newest first. Author order within a record follows
 * `ResearchCrossAuthor.position`, so a citation reads the same as its source
 * rather than in whatever order the join happens to return rows.
 */
export async function getPublications(): Promise<Publication[]> {
  const records = await prisma.research.findMany({
    orderBy: { publicationDate: 'desc' },
    include: {
      publisher: true,
      authors: {
        orderBy: { position: 'asc' },
        include: { researchAuthor: true },
      },
    },
  })

  return records.map((record) => ({
    slug: record.id,
    title: record.title,
    authors: record.authors.map((author) => author.researchAuthor.name),
    venue: record.publisher.name,
    year: String(record.publicationDate.getUTCFullYear()),
    date: record.publicationDate,
    abstract: record.abstract,
    href: record.externalUrl,
    researchGroup: record.researchGroup,
  }))
}
