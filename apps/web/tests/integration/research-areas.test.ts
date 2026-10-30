import { randomUUID } from 'node:crypto'

import { prisma } from '@lasce/db'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import {
  createResearchArea,
  deleteResearchArea,
  getResearchAreaById,
  getResearchAreas,
  updateResearchArea,
} from '@/app/lib/research-areas'
import { researchAreaCreateSchema, researchAreaUpdateSchema } from '@/app/lib/research-area-schema'

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
  await prisma.researchArea.deleteMany({
    where: { translations: { some: { title: { contains: RUN } } } },
  })
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

    // This test checks language resolution; pagination tests assert the deterministic order.
    expect(mine).toHaveLength(2)
    expect(mine.map((area) => [area.title, area.contentLocale])).toEqual(
      expect.arrayContaining([
        [`Area ${RUN}`, 'en'],
        [`Legacy ${RUN}`, null],
      ]),
    )
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

const content = {
  es: { title: `Creada ${RUN}`, description: 'Descripción.' },
  en: { title: `Created ${RUN}`, description: 'Description.' },
}

async function editingVersion(id: string) {
  const [area] = (await getResearchAreas('es', { includeEditingData: true })).filter(
    (each) => each.id === id,
  )
  if (!area?.editing) throw new Error(`Expected editing data for ${id}`)
  return area.editing.version
}

const trigger = `${RUN}_fail`
const FAILING_TITLE = `FAIL ${RUN}`

/** Makes PostgreSQL reject any translation titled `FAILING_TITLE`, mid-transaction. */
async function withFailingTranslations(run: () => Promise<void>) {
  await prisma.$executeRawUnsafe(
    `create function areas.${trigger}() returns trigger language plpgsql as $$
     begin
       if new.title = '${FAILING_TITLE}' then raise exception 'forced failure'; end if;
       return new;
     end $$`,
  )
  await prisma.$executeRawUnsafe(
    `create trigger ${trigger} before insert or update on areas.research_area_translations
     for each row execute function areas.${trigger}()`,
  )

  try {
    await run()
  } finally {
    await prisma.$executeRawUnsafe(
      `drop trigger if exists ${trigger} on areas.research_area_translations`,
    )
    await prisma.$executeRawUnsafe(`drop function if exists areas.${trigger}()`)
  }
}

describe('writing research areas against PostgreSQL', () => {
  test('creates an area and its translation together', async () => {
    const { area } = await createResearchArea(researchAreaCreateSchema.parse({ content, src: SRC }))

    await expect(getResearchAreaById(area.id, 'en')).resolves.toMatchObject({
      title: `Created ${RUN}`,
      contentLocale: 'en',
    })
  })

  test('rolls everything back when a translation write fails', async () => {
    const area = await createBilingual()
    const version = await editingVersion(area.id)

    await withFailingTranslations(async () => {
      await expect(
        updateResearchArea(
          area.id,
          researchAreaUpdateSchema.parse({
            version,
            content: {
              es: { title: `Cambiada ${RUN}`, description: 'Cambiada.' },
              en: { title: FAILING_TITLE, description: 'Changed.' },
            },
          }),
        ),
      ).rejects.toThrow()
    })

    const stored = await prisma.researchArea.findUniqueOrThrow({ where: { id: area.id } })
    expect(stored.title).toBe(`Área ${RUN}`)
    expect(stored.updatedAt).toEqual(area.updatedAt)
  })

  test('of four concurrent saves on one version, exactly one is stored', async () => {
    const area = await createBilingual()
    const version = await editingVersion(area.id)

    const results = await Promise.all(
      [1, 2, 3, 4].map((attempt) =>
        updateResearchArea(
          area.id,
          researchAreaUpdateSchema.parse({
            version,
            content: {
              es: { title: `Intento ${attempt} ${RUN}`, description: 'Descripción.' },
              en: { title: `Attempt ${attempt} ${RUN}`, description: 'Description.' },
            },
          }),
        ),
      ),
    )

    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(results.filter((result) => !result.ok && result.reason === 'conflict')).toHaveLength(3)

    // Both languages of the stored area come from the same save.
    const stored = await prisma.researchArea.findUniqueOrThrow({
      where: { id: area.id },
      include: { translations: true },
    })
    const attempt = /Intento (\d)/.exec(stored.title)?.[1]
    expect(stored.translations[0]?.title).toBe(`Attempt ${attempt} ${RUN}`)
  })

  test('refuses a save against a stale version', async () => {
    const area = await createBilingual()
    const version = await editingVersion(area.id)
    await updateResearchArea(area.id, researchAreaUpdateSchema.parse({ version, src: '/a.jpg' }))

    expect(
      await updateResearchArea(area.id, researchAreaUpdateSchema.parse({ version, src: '/b.jpg' })),
    ).toEqual({ ok: false, reason: 'conflict' })
  })

  test('changes the photo of a legacy area without translating it', async () => {
    const area = await createLegacy()
    const version = await editingVersion(area.id)

    const result = await updateResearchArea(
      area.id,
      researchAreaUpdateSchema.parse({ version, src: '/nueva.jpg' }),
    )

    expect(result.ok).toBe(true)
    const stored = await prisma.researchArea.findUniqueOrThrow({
      where: { id: area.id },
      include: { translations: true },
    })
    expect(stored.src).toBe('/nueva.jpg')
    expect(stored.translations).toEqual([])
  })

  test('of two concurrent deletes, one succeeds and the other finds nothing', async () => {
    const area = await createBilingual()

    const results = await Promise.all([deleteResearchArea(area.id), deleteResearchArea(area.id)])

    expect(results.sort()).toEqual([false, true])
  })
})
