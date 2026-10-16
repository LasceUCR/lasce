import { randomUUID } from 'node:crypto'

import { prisma } from '@lasce/db'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { getResearchAreaById, getResearchAreas } from '@/app/lib/research-areas'

/**
 * Reading research areas in each language against a real PostgreSQL database. Every row these
 * tests create is tagged with `RUN` and deleted afterwards; nothing else is touched.
 * `tests/integration/setup.ts` has already refused anything but a disposable `*_test` database.
 */

const RUN = `it${randomUUID().replaceAll('-', '').slice(0, 10)}`

const SRC = '/images/research/geomagnetismo-costa-rica.jpg'

function createBilingual() {
  return prisma.researchArea.create({
    data: {
      title: `Área ${RUN}`,
      description: `Descripción ${RUN}.`,
      src: SRC,
      translations: {
        create: { locale: 'en', title: `Area ${RUN}`, description: `Description ${RUN}.` },
      },
    },
  })
}

function createLegacy() {
  return prisma.researchArea.create({
    data: { title: `Legacy ${RUN}`, description: `Written before languages ${RUN}.`, src: SRC },
  })
}

beforeAll(async () => {
  const [migration] = await prisma.$queryRaw<{ count: bigint }[]>`
    select count(*) as count from _prisma_migrations
    where migration_name like '%_add_research_area_translations' and finished_at is not null`
  if (!migration || migration.count === 0n) {
    throw new Error(
      'Apply the add_research_area_translations migration to the test database first.',
    )
  }
})

afterAll(async () => {
  await prisma.researchArea.deleteMany({ where: { title: { contains: RUN } } })
  await prisma.$disconnect()
})

describe('research areas against PostgreSQL', () => {
  test('reads a complete area in Spanish and in English', async () => {
    const area = await createBilingual()

    await expect(getResearchAreaById(area.id, 'es')).resolves.toMatchObject({
      title: `Área ${RUN}`,
      contentLocale: 'es',
    })
    await expect(getResearchAreaById(area.id, 'en')).resolves.toMatchObject({
      title: `Area ${RUN}`,
      description: `Description ${RUN}.`,
      contentLocale: 'en',
    })
  })

  test('falls back to the base text of an area without a translation, in an unknown language', async () => {
    const area = await createLegacy()

    await expect(getResearchAreaById(area.id, 'en')).resolves.toMatchObject({
      title: `Legacy ${RUN}`,
      contentLocale: null,
    })
  })

  test('lists both kinds of area in the requested language', async () => {
    const [bilingual, legacy] = [await createBilingual(), await createLegacy()]

    const areas = await getResearchAreas('en')
    const mine = areas.filter((area) => area.id === bilingual.id || area.id === legacy.id)

    expect(mine.map((area) => [area.title, area.contentLocale])).toEqual([
      [`Area ${RUN}`, 'en'],
      [`Legacy ${RUN}`, null],
    ])
  })

  test('refuses a second translation for the same language', async () => {
    const area = await createBilingual()

    await expect(
      prisma.researchAreaTranslation.create({
        data: { researchAreaId: area.id, locale: 'en', title: 'Twice', description: 'Twice.' },
      }),
    ).rejects.toThrow()
  })

  test('removes the translations with their area', async () => {
    const area = await createBilingual()

    await prisma.researchArea.delete({ where: { id: area.id } })

    expect(await prisma.researchAreaTranslation.count({ where: { researchAreaId: area.id } })).toBe(
      0,
    )
  })
})
