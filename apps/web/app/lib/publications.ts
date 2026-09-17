import { prisma } from '@lasce/db'
import { z } from 'zod'

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

export const publicationInputSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.'),
  abstract: z.string().trim().min(1, 'El resumen es obligatorio.'),
  authors: z
    .array(z.string().trim().min(1, 'El nombre del autor es obligatorio.'))
    .min(1, 'Debe existir al menos un autor.'),
  DOI: z.string().trim(),
  researchGroup: z.enum(['LASCE', 'ROSAC'], {
    error: 'Seleccione un grupo de investigación válido.',
  }),
  venue: z.string().trim().min(1, 'La publicación es obligatoria.'),
  date: z.coerce.date(),
})

export type PublicationInput = z.infer<typeof publicationInputSchema>

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

/**
 * Creates a publication together with its publisher, authors,
 * and ordered author relationships.
 */
export async function createPublication(data: PublicationInput) {
  return prisma.$transaction(async (tx) => {
    // Publishers are normalized by name.
    const publisher = await tx.publisher.upsert({
      where: {
        name: data.venue,
      },
      update: {},
      create: {
        name: data.venue,
      },
    })

    // Create the publication itself.
    const research = await tx.research.create({
      data: {
        title: data.title,
        publicationDate: data.date,
        publisherId: publisher.id,
        abstract: data.abstract,

        // Currently using DOI as the external URL
        externalUrl: data.DOI,
        doi: data.DOI || null,

        researchGroup: data.researchGroup,
      },
    })

    // Create/reuse each author and preserve their order.
    for (const [position, name] of data.authors.entries()) {
      const author = await tx.researchAuthor.upsert({
        where: {
          name,
        },
        update: {},
        create: {
          name,
        },
      })

      await tx.researchCrossAuthor.create({
        data: {
          researchId: research.id,
          researchAuthorId: author.id,
          position,
        },
      })
    }

    // Return the complete publication, including its relations.
    return tx.research.findUniqueOrThrow({
      where: {
        id: research.id,
      },
      include: {
        publisher: true,
        authors: {
          orderBy: {
            position: 'asc',
          },
          include: {
            researchAuthor: true,
          },
        },
      },
    })
  })
}

export async function updatePublication(id: string, data: PublicationInput) {
  return prisma.$transaction(async (tx) => {
    // Check that the publication exists.
    const existing = await tx.research.findUnique({
      where: { id },
    })

    if (!existing) {
      return null
    }

    // Publishers are shared between publications, so find or create
    // the publisher instead of creating a duplicate.
    const publisher = await tx.publisher.upsert({
      where: {
        name: data.venue,
      },
      update: {},
      create: {
        name: data.venue,
      },
    })

    // Update the actual publication record.
    await tx.research.update({
      where: {
        id,
      },
      data: {
        title: data.title,
        publicationDate: data.date,
        publisherId: publisher.id,
        abstract: data.abstract,
        externalUrl: data.DOI,
        doi: data.DOI || null,
        researchGroup: data.researchGroup,
      },
    })

    // Remove the current author relationships.
    // only delete the cross-author rows, NOT the researchAuthor
    // records themselves, because those authors may belong to other
    // publications.
    await tx.researchCrossAuthor.deleteMany({
      where: {
        researchId: id,
      },
    })

    // Recreate the author relationships using the order supplied
    // by the form.
    for (const [position, name] of data.authors.entries()) {
      const author = await tx.researchAuthor.upsert({
        where: {
          name,
        },
        update: {},
        create: {
          name,
        },
      })

      await tx.researchCrossAuthor.create({
        data: {
          researchId: id,
          researchAuthorId: author.id,
          position,
        },
      })
    }

    // Return the updated publication with its relations.
    return tx.research.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        publisher: true,
        authors: {
          orderBy: {
            position: 'asc',
          },
          include: {
            researchAuthor: true,
          },
        },
      },
    })
  })
}

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
