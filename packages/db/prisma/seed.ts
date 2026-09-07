/**
 *
 * Initial data for the research table. The scope of the sprint (6-september-2026) was not
 * to create a full CRUD, so this seed is just temporary to populate the research table until the
 * CMS is done.
 */
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true })

const { prisma } = await import('../src/index.js')

type SeedResearch = {
  title: string
  publicationDate: Date
  publisher: string
  authors: string[]
  abstract: string
  externalUrl: string
  doi?: string
}

const researchRecords: SeedResearch[] = [
  {
    title:
      'The Santa Cruz Radio Observatory (ROSAC): the first radio astronomy facility in Costa Rica',
    publicationDate: new Date('2026-07-05'),
    publisher: 'Proceedings of SPIE, Vol. 14151',
    authors: [
      'David M. Gale',
      'Carolina Salas-Matamoros',
      'Miguel Velázquez',
      'Wagner Mejías',
      'Gustavo Lara',
      'Andrés Fallas',
      'Federico Ruíz',
      'Óscar Núñez',
      'Eduardo Ibarra',
    ],
    abstract:
      'The Santa Cruz Radio Observatory (ROSAC) is a new observational and monitoring facility in radio astronomy being developed by the Space Research Center (CINESPA) of the University of Costa Rica, located near Santa Cruz in Guanacaste province. The facility features an eleven-meter antenna, repurposed from a former parabolic reflector, operating between 100 MHz and 1 GHz for solar monitoring, with extended capabilities for teaching and research reaching into the Ka band. Built in collaboration with the Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE) of Mexico, the paper describes the observatory’s construction, assembly procedures, antenna alignment protocols, testing results, the development of solar-tracking instrumentation, and project management across institutional and private-sector partnerships.',
    externalUrl:
      'https://www.spiedigitallibrary.org/conference-proceedings-of-spie/14151/141511L/The-Santa-Cruz-Radio-Observatory-ROSAC--the-first-radio/10.1117/12.3100841.full?tab=ArticleLink',
    doi: '10.1117/12.3100841',
  },
]

await prisma.researchCrossAuthor.deleteMany()
await prisma.research.deleteMany()
await prisma.researchAuthor.deleteMany()
await prisma.publisher.deleteMany()

for (const record of researchRecords) {
  const publisher = await prisma.publisher.create({ data: { name: record.publisher } })

  const research = await prisma.research.create({
    data: {
      title: record.title,
      publicationDate: record.publicationDate,
      publisherId: publisher.id,
      abstract: record.abstract,
      externalUrl: record.externalUrl,
      doi: record.doi,
    },
  })

  for (const [index, name] of record.authors.entries()) {
    const author = await prisma.researchAuthor.create({ data: { name } })

    await prisma.researchCrossAuthor.create({
      data: { researchId: research.id, researchAuthorId: author.id, position: index },
    })
  }
}

await prisma.$disconnect()
