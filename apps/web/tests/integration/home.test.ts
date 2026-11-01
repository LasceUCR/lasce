import { randomUUID } from 'node:crypto'

import { prisma } from '@lasce/db'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'

import {
  getHomeContent,
  heroUpdateSchema,
  indicatorOrderSchema,
  indicatorUpdateSchema,
  reorderIndicators,
  updateHero,
  updateIndicator,
} from '@/app/lib/home'

/**
 * The home page service against a real PostgreSQL database. The banner and the indices are
 * seeded by their migration and cannot be created from the CMS, so these tests work on the seeded
 * rows: they are read once before the tests and written back, translations, order and versions
 * included, after each one. The only row created here is a temporary index for the cascade, and
 * it is deleted in the same test. `tests/integration/setup.ts` has already refused anything but a
 * disposable `*_test` database.
 */

const RUN = `it${randomUUID().replaceAll('-', '').slice(0, 10)}`

type Snapshot = Awaited<ReturnType<typeof snapshot>>

async function snapshot() {
  const [hero, indices] = await Promise.all([
    prisma.homeHero.findFirstOrThrow({
      orderBy: { createdAt: 'asc' },
      include: { translations: true },
    }),
    prisma.geomagneticIndex.findMany({
      orderBy: { position: 'asc' },
      include: { translations: true },
    }),
  ])
  return { hero, indices }
}

async function restore({ hero, indices }: Snapshot) {
  await prisma.$transaction(async (tx) => {
    await tx.homeHero.update({
      where: { id: hero.id },
      data: { title: hero.title, lead: hero.lead, updatedAt: hero.updatedAt },
    })
    await tx.homeHeroTranslation.deleteMany({ where: { homeHeroId: hero.id } })
    for (const { locale, title, lead } of hero.translations) {
      await tx.homeHeroTranslation.create({ data: { homeHeroId: hero.id, locale, title, lead } })
    }

    // Positions are unique: move every index aside first, so restoring one never takes the
    // position another still holds.
    for (const [aside, index] of indices.entries()) {
      await tx.geomagneticIndex.update({
        where: { id: index.id },
        data: { position: -(aside + 1) },
      })
    }
    for (const index of indices) {
      await tx.geomagneticIndex.update({
        where: { id: index.id },
        data: {
          value: index.value,
          description: index.description,
          position: index.position,
          source: index.source,
          observedAt: index.observedAt,
          updatedAt: index.updatedAt,
        },
      })
      await tx.geomagneticIndexTranslation.deleteMany({ where: { geomagneticIndexId: index.id } })
      for (const { locale, description } of index.translations) {
        await tx.geomagneticIndexTranslation.create({
          data: { geomagneticIndexId: index.id, locale, description },
        })
      }
    }
  })
}

let seeded: Snapshot

async function editing() {
  const content = await getHomeContent('es', { includeEditingData: true })
  if (!content.hero?.editing) throw new Error('Expected the seeded banner with editing data')
  return { hero: content.hero.editing, indicators: content.indicators }
}

const heroText = {
  es: { title: `Título ${RUN}`, lead: `Subtítulo ${RUN}` },
  en: { title: `Title ${RUN}`, lead: `Subtitle ${RUN}` },
}

const trigger = `${RUN}_fail`
const FAILING_LEAD = `FAIL ${RUN}`

/** Makes PostgreSQL reject any banner translation with `FAILING_LEAD`, mid-transaction. */
async function withFailingHeroTranslations(run: () => Promise<void>) {
  await prisma.$executeRawUnsafe(
    `create function public.${trigger}() returns trigger language plpgsql as $$
     begin
       if new.lead = '${FAILING_LEAD}' then raise exception 'forced failure'; end if;
       return new;
     end $$`,
  )
  await prisma.$executeRawUnsafe(
    `create trigger ${trigger} before insert or update on public.home_hero_translations
     for each row execute function public.${trigger}()`,
  )

  try {
    await run()
  } finally {
    await prisma.$executeRawUnsafe(
      `drop trigger if exists ${trigger} on public.home_hero_translations`,
    )
    await prisma.$executeRawUnsafe(`drop function if exists public.${trigger}()`)
  }
}

beforeAll(async () => {
  const [migration] = await prisma.$queryRaw<{ count: bigint }[]>`
    select count(*) as count from _prisma_migrations
    where migration_name like '%_add_home_content' and finished_at is not null`
  if (!migration || migration.count === 0n) {
    throw new Error('Apply the add_home_content migration to the test database first.')
  }

  seeded = await snapshot()
})

afterEach(async () => {
  await restore(seeded)
})

afterAll(async () => {
  await prisma.$disconnect()
})

const actor = { id: 'user-1' }

describe('home content against PostgreSQL', () => {
  test('reads the seeded banner and indices in both languages', async () => {
    const [es, en] = await Promise.all([getHomeContent('es'), getHomeContent('en')])

    expect(es.hero?.contentLocale).toBe('es')
    expect(en.hero?.contentLocale).toBe('en')
    expect(es.indicators.map((indicator) => indicator.code)).toEqual(['kp', 'dst', 'ae', 'ap'])
    expect(en.indicators.map((indicator) => indicator.description)).toEqual([
      'Quiet',
      'Stable',
      'Low activity',
      'Quiet',
    ])
  })

  test('saves the banner and its translation atomically and moves the version forward', async () => {
    const { hero } = await editing()

    const result = await updateHero(
      heroUpdateSchema.parse({ version: hero.version, content: heroText }),
      actor,
    )

    expect(result.ok).toBe(true)
    const en = await getHomeContent('en')
    expect(en.hero?.title).toBe(`Title ${RUN}`)
    const after = await editing()
    expect(after.hero.version > hero.version).toBe(true)
  })

  test('rolls everything back when a translation write fails', async () => {
    const { hero } = await editing()

    await withFailingHeroTranslations(async () => {
      await expect(
        updateHero(
          heroUpdateSchema.parse({
            version: hero.version,
            content: { es: heroText.es, en: { ...heroText.en, lead: FAILING_LEAD } },
          }),
          actor,
        ),
      ).rejects.toThrow()
    })

    const after = await prisma.homeHero.findUniqueOrThrow({ where: { id: seeded.hero.id } })
    expect(after.title).toBe(seeded.hero.title)
    expect(after.updatedAt).toEqual(seeded.hero.updatedAt)
  })

  test('of four concurrent saves on one version, exactly one is stored', async () => {
    const { hero } = await editing()

    const results = await Promise.all(
      [1, 2, 3, 4].map((attempt) =>
        updateHero(
          heroUpdateSchema.parse({
            version: hero.version,
            content: {
              es: { ...heroText.es, lead: `Intento ${attempt} ${RUN}` },
              en: { ...heroText.en, lead: `Attempt ${attempt} ${RUN}` },
            },
          }),
          actor,
        ),
      ),
    )

    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(results.filter((result) => !result.ok && result.reason === 'conflict')).toHaveLength(3)

    // The languages of the stored banner come from the same save.
    const stored = await prisma.homeHero.findUniqueOrThrow({
      where: { id: seeded.hero.id },
      include: { translations: true },
    })
    const attempt = /Intento (\d)/.exec(stored.lead)?.[1]
    expect(stored.translations[0]?.lead).toBe(`Attempt ${attempt} ${RUN}`)
  })

  test('refuses a save against a stale version', async () => {
    const { hero } = await editing()
    await updateHero(heroUpdateSchema.parse({ version: hero.version, content: heroText }), actor)

    expect(
      await updateHero(heroUpdateSchema.parse({ version: hero.version, content: heroText }), actor),
    ).toEqual({ ok: false, reason: 'conflict' })
  })

  test('saves a value-only edit of an index without its translation, leaving it untranslated', async () => {
    const dst = seeded.indices.find((index) => index.code === 'dst')
    if (!dst) throw new Error('Expected the seeded Dst index')
    await prisma.geomagneticIndexTranslation.deleteMany({ where: { geomagneticIndexId: dst.id } })
    const version = (await editing()).indicators.find((each) => each.id === dst.id)?.editing
      ?.version

    const result = await updateIndicator(
      dst.id,
      indicatorUpdateSchema.parse({ version, value: '-40 nT' }),
      actor,
    )

    expect(result.ok).toBe(true)
    const row = await prisma.geomagneticIndex.findUniqueOrThrow({
      where: { id: dst.id },
      include: { translations: true },
    })
    expect(row.value).toBe('-40 nT')
    expect(row.source).toBe('MANUAL')
    expect(row.translations).toEqual([])
    expect((await getHomeContent('en')).indicators[1]?.contentLocale).toBeNull()
  })

  test('refuses text longer than 15 characters in the columns themselves', async () => {
    await expect(
      prisma.geomagneticIndex.update({
        where: { id: seeded.indices[0]?.id },
        data: { value: '1234567890123456' },
      }),
    ).rejects.toThrow()
  })

  test('refuses two indices in the same position', async () => {
    const [first, second] = seeded.indices
    if (!first || !second) throw new Error('Expected the seeded indices')

    await expect(
      prisma.geomagneticIndex.update({
        where: { id: second.id },
        data: { position: first.position },
      }),
    ).rejects.toThrow()
  })

  test('gives an index inserted without a position the next number, after every stored one', async () => {
    const highest = Math.max(...seeded.indices.map((index) => index.position))
    const index = await prisma.geomagneticIndex.create({
      data: { code: RUN.slice(0, 8), value: '1', description: 'Prueba' },
    })

    try {
      expect(index.position).toBeGreaterThan(highest)
      expect(
        (await prisma.geomagneticIndex.findMany({ orderBy: { position: 'asc' } })).at(-1)?.id,
      ).toBe(index.id)
    } finally {
      await prisma.geomagneticIndex.delete({ where: { id: index.id } })
    }
  })

  test('writes a new order in one transaction and refuses an incomplete one', async () => {
    // Reversed, every index takes a position another one holds until the transaction ends.
    const ids = seeded.indices.map((index) => index.id).reverse()

    expect(await reorderIndicators(indicatorOrderSchema.parse({ ids }), actor)).toEqual({
      ok: true,
    })
    expect((await getHomeContent()).indicators.map((indicator) => indicator.id)).toEqual(ids)

    expect(
      await reorderIndicators(indicatorOrderSchema.parse({ ids: ids.slice(1) }), actor),
    ).toEqual({
      ok: false,
      reason: 'conflict',
    })
    expect((await getHomeContent()).indicators.map((indicator) => indicator.id)).toEqual(ids)
  })

  test('refuses a second translation per language and removes translations with their index', async () => {
    const index = await prisma.geomagneticIndex.create({
      data: {
        code: RUN.slice(0, 8),
        value: '1',
        description: 'Prueba',
        translations: { create: { locale: 'en', description: 'Test' } },
      },
    })

    try {
      await expect(
        prisma.geomagneticIndexTranslation.create({
          data: { geomagneticIndexId: index.id, locale: 'en', description: 'Twice' },
        }),
      ).rejects.toThrow()
    } finally {
      await prisma.geomagneticIndex.delete({ where: { id: index.id } })
    }

    expect(
      await prisma.geomagneticIndexTranslation.count({ where: { geomagneticIndexId: index.id } }),
    ).toBe(0)
  })
})
