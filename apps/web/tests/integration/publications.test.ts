import { randomUUID } from 'node:crypto'

import { prisma } from '@lasce/db'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import {
  createPublication,
  deletePublication,
  getPublications,
  publicationCreateSchema,
  publicationUpdateSchema,
  updatePublication,
  type Publication,
  type PublicationWriteResult,
} from '@/app/lib/publications'

/**
 * The publications service against a real PostgreSQL database. Every row these tests create is
 * tagged with `RUN` and deleted afterwards; nothing else is touched, so the database only has to
 * be migrated, not emptied. `tests/integration/setup.ts` has already refused anything but a
 * disposable `*_test` database.
 */

const RUN = `it${randomUUID().replaceAll('-', '').slice(0, 10)}`

const content = {
  es: { title: `Título ${RUN}`, abstract: 'Resumen.' },
  en: { title: `Title ${RUN}`, abstract: 'Abstract.' },
}

const shared = {
  authors: [`Autora ${RUN}`],
  researchGroup: 'LASCE',
  venue: `Revista ${RUN}`,
  date: '2026-05-06',
}

function create(overrides: Record<string, unknown> = {}) {
  return createPublication(publicationCreateSchema.parse({ content, ...shared, ...overrides }))
}

function update(id: string, body: Record<string, unknown>) {
  return updatePublication(id, publicationUpdateSchema.parse(body))
}

function stored(
  result: PublicationWriteResult,
): Publication & Required<Pick<Publication, 'editing'>> {
  if (!result.ok) throw new Error(`Expected a stored publication, got ${JSON.stringify(result)}`)
  if (!result.publication.editing) throw new Error('Expected editing data on a write result')
  return result.publication as Publication & Required<Pick<Publication, 'editing'>>
}

async function row(id: string) {
  return prisma.research.findUniqueOrThrow({
    where: { id },
    include: {
      translations: { orderBy: { locale: 'asc' } },
      authors: { orderBy: { position: 'asc' } },
    },
  })
}

async function readAs(locale: 'es' | 'en', id: string) {
  const all = await getPublications(locale, { includeEditingData: true })
  const found = all.find((publication) => publication.slug === id)
  if (!found) throw new Error(`Publication ${id} not found`)
  return found
}

/** A record saved before translations existed: base text only, no translation row. */
async function createLegacy() {
  const publisher = await prisma.publisher.upsert({
    where: { name: `Revista ${RUN}` },
    update: {},
    create: { name: `Revista ${RUN}` },
  })
  const author = await prisma.researchAuthor.upsert({
    where: { name: `Autora ${RUN}` },
    update: {},
    create: { name: `Autora ${RUN}` },
  })

  return prisma.research.create({
    data: {
      title: `Legacy ${RUN}`,
      abstract: 'Written before languages existed, in English.',
      publicationDate: new Date('2026-01-01'),
      publisherId: publisher.id,
      researchGroup: 'ROSAC',
      authors: { create: { position: 0, researchAuthorId: author.id } },
    },
  })
}

const FAILING_TITLE = `FAIL ${RUN}`
const trigger = `${RUN}_fail`

/** Makes PostgreSQL reject any translation row titled `FAILING_TITLE`, mid-transaction. */
async function withFailingTranslations(run: () => Promise<void>) {
  await prisma.$executeRawUnsafe(
    `create function research.${trigger}() returns trigger language plpgsql as $$
     begin
       if new.title = '${FAILING_TITLE}' then raise exception 'forced failure'; end if;
       return new;
     end $$`,
  )
  await prisma.$executeRawUnsafe(
    `create trigger ${trigger} before insert or update on research.research_record_translations
     for each row execute function research.${trigger}()`,
  )

  try {
    await run()
  } finally {
    await prisma.$executeRawUnsafe(
      `drop trigger if exists ${trigger} on research.research_record_translations`,
    )
    await prisma.$executeRawUnsafe(`drop function if exists research.${trigger}()`)
  }
}

beforeAll(async () => {
  const [migrated] = await prisma.$queryRaw<{ exists: boolean }[]>`
    select to_regclass('research.research_record_translations') is not null as exists`
  if (!migrated?.exists) {
    throw new Error(
      'The test database has no research.research_record_translations table. Apply the migrations first: DATABASE_URL=<test url> pnpm db:migrate:deploy',
    )
  }
})

afterAll(async () => {
  await prisma.research.deleteMany({ where: { title: { contains: RUN } } })
  await prisma.publisher.deleteMany({ where: { name: { contains: RUN } } })
  await prisma.researchAuthor.deleteMany({ where: { name: { contains: RUN } } })
  await prisma.$disconnect()
})

describe('creating', () => {
  test('stores both languages at once: Spanish on the record, English as a translation', async () => {
    const publication = stored(await create())
    const record = await row(publication.slug)

    expect(record).toMatchObject({ title: content.es.title, abstract: content.es.abstract })
    expect(record.translations).toMatchObject([{ locale: 'en', ...content.en }])
    expect(record.doi).toBeNull()
    expect(record.externalUrl).toBeNull()
    expect(record.publicationDate.toISOString().slice(0, 10)).toBe('2026-05-06')
    expect(record.authors).toHaveLength(1)
    expect(publication.editing.isLegacy).toBe(false)
  })

  test('rejects a duplicate DOI and a duplicate link separately, writing nothing', async () => {
    const doi = `10.4242/${RUN}-doi`
    const href = `https://example.org/${RUN}/link`
    stored(await create({ DOI: doi }))
    stored(await create({ href }))
    const before = await prisma.research.count({ where: { title: { contains: RUN } } })

    expect(await create({ DOI: doi })).toEqual({ ok: false, reason: 'duplicate', field: 'doi' })
    expect(await create({ href })).toEqual({
      ok: false,
      reason: 'duplicate',
      field: 'externalUrl',
    })
    expect(await prisma.research.count({ where: { title: { contains: RUN } } })).toBe(before)
  })

  test('rolls back completely when the translation cannot be written', async () => {
    const venue = `Revista nueva ${RUN}`
    const before = await prisma.research.count({ where: { title: { contains: RUN } } })

    await withFailingTranslations(async () => {
      await expect(
        create({
          venue,
          authors: [`Autor nuevo ${RUN}`],
          content: { ...content, en: { title: FAILING_TITLE, abstract: 'x' } },
        }),
      ).rejects.toThrow()
    })

    expect(await prisma.research.count({ where: { title: { contains: RUN } } })).toBe(before)
    expect(await prisma.publisher.findUnique({ where: { name: venue } })).toBeNull()
    expect(
      await prisma.researchAuthor.findUnique({ where: { name: `Autor nuevo ${RUN}` } }),
    ).toBeNull()
  })
})

describe('updating', () => {
  test('a shared-field update leaves the translations untouched', async () => {
    const publication = stored(
      await create({ DOI: `10.4242/${RUN}-shared`, href: `https://example.org/${RUN}/shared` }),
    )
    const before = await row(publication.slug)

    const saved = stored(
      await update(publication.slug, {
        version: publication.editing.version,
        venue: `Otra revista ${RUN}`,
        DOI: null,
      }),
    )
    const after = await row(publication.slug)

    expect(after.translations).toEqual(before.translations)
    expect({ title: after.title, abstract: after.abstract }).toEqual({
      title: before.title,
      abstract: before.abstract,
    })
    expect(after.doi).toBeNull()
    expect(after.externalUrl).toBe(`https://example.org/${RUN}/shared`)
    expect(new Date(saved.editing.version).getTime()).toBeGreaterThan(
      new Date(publication.editing.version).getTime(),
    )
  })

  test('a one-sided change needs the other language reviewed, then saves both', async () => {
    const publication = stored(await create())
    const changed = { es: content.es, en: { ...content.en, title: `New title ${RUN}` } }

    expect(
      await update(publication.slug, { version: publication.editing.version, content: changed }),
    ).toEqual({ ok: false, reason: 'review-required', pending: [{ locale: 'es', field: 'title' }] })

    stored(
      await update(publication.slug, {
        version: publication.editing.version,
        content: changed,
        confirmedUnchanged: [{ locale: 'es', field: 'title' }],
      }),
    )
    const record = await row(publication.slug)
    expect(record.title).toBe(content.es.title)
    expect(record.translations).toMatchObject([{ locale: 'en', title: `New title ${RUN}` }])
  })

  test('rolls back the record, its version, publisher and authors when a translation fails', async () => {
    const publication = stored(await create())
    const before = await row(publication.slug)
    const venue = `Revista rollback ${RUN}`

    await withFailingTranslations(async () => {
      await expect(
        update(publication.slug, {
          version: publication.editing.version,
          venue,
          authors: [`Autor rollback ${RUN}`],
          content: {
            es: { title: `Nuevo ${RUN}`, abstract: 'x' },
            en: { title: FAILING_TITLE, abstract: 'x' },
          },
        }),
      ).rejects.toThrow()
    })

    expect(await row(publication.slug)).toEqual(before)
    expect(await prisma.publisher.findUnique({ where: { name: venue } })).toBeNull()
  })

  test('of several saves against the same version, exactly one wins and languages never mix', async () => {
    const publication = stored(await create())

    const results = await Promise.all(
      [1, 2, 3, 4].map((attempt) =>
        update(publication.slug, {
          version: publication.editing.version,
          content: {
            es: { title: `ES ${attempt} ${RUN}`, abstract: `ES ${attempt}` },
            en: { title: `EN ${attempt} ${RUN}`, abstract: `EN ${attempt}` },
          },
        }),
      ),
    )

    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(results.filter((result) => !result.ok)).toEqual(
      Array(3).fill({ ok: false, reason: 'conflict' }),
    )

    const record = await row(publication.slug)
    const winner = record.title.split(' ')[1]
    expect(record.abstract).toBe(`ES ${winner}`)
    expect(record.translations).toMatchObject([
      { locale: 'en', title: `EN ${winner} ${RUN}`, abstract: `EN ${winner}` },
    ])
  })

  test('a stale version is refused and changes nothing', async () => {
    const publication = stored(await create())
    stored(
      await update(publication.slug, { version: publication.editing.version, venue: `V2 ${RUN}` }),
    )
    const before = await row(publication.slug)

    expect(
      await update(publication.slug, { version: publication.editing.version, venue: `V3 ${RUN}` }),
    ).toEqual({ ok: false, reason: 'conflict' })
    expect(await row(publication.slug)).toEqual(before)
  })

  test('an unknown id is not found', async () => {
    expect(
      await update(randomUUID(), { version: new Date().toISOString(), venue: `V ${RUN}` }),
    ).toEqual({ ok: false, reason: 'not-found' })
  })
})

describe('legacy records', () => {
  test('are shown as stored, in an unknown language, in every locale', async () => {
    const legacy = await createLegacy()

    for (const locale of ['es', 'en'] as const) {
      const shown = await readAs(locale, legacy.id)
      expect(shown).toMatchObject({ title: legacy.title, contentLocale: null })
      expect(shown.editing).toMatchObject({ isLegacy: true, content: { en: null } })
    }
  })

  test('stay legacy after a shared-field update: no translation is invented', async () => {
    const legacy = await createLegacy()
    const { editing } = await readAs('es', legacy.id)

    const saved = stored(
      await update(legacy.id, { version: editing!.version, researchGroup: 'LASCE' }),
    )

    expect(saved.editing.isLegacy).toBe(true)
    expect((await row(legacy.id)).translations).toEqual([])
  })

  test('become complete once both languages are saved, after reviewing the base text', async () => {
    const legacy = await createLegacy()
    const { editing } = await readAs('es', legacy.id)
    const translated = {
      es: { title: `Registro antiguo ${RUN}`, abstract: legacy.abstract },
      en: { title: legacy.title, abstract: legacy.abstract },
    }

    expect(await update(legacy.id, { version: editing!.version, content: translated })).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'es', field: 'abstract' }],
    })

    const saved = stored(
      await update(legacy.id, {
        version: editing!.version,
        content: translated,
        confirmedUnchanged: [{ locale: 'es', field: 'abstract' }],
      }),
    )

    expect(saved.editing.isLegacy).toBe(false)
    expect(await readAs('en', legacy.id)).toMatchObject({
      title: legacy.title,
      contentLocale: 'en',
    })
    expect(await readAs('es', legacy.id)).toMatchObject({
      title: `Registro antiguo ${RUN}`,
      contentLocale: 'es',
    })
  })
})

describe('reading', () => {
  test('shows each language of a complete record, and no editing data to visitors', async () => {
    const publication = stored(await create())

    expect(await readAs('es', publication.slug)).toMatchObject({
      title: content.es.title,
      abstract: content.es.abstract,
      contentLocale: 'es',
    })
    expect(await readAs('en', publication.slug)).toMatchObject({
      title: content.en.title,
      abstract: content.en.abstract,
      contentLocale: 'en',
    })

    const visitor = (await getPublications('en')).find((each) => each.slug === publication.slug)
    expect(visitor?.editing).toBeUndefined()
  })
})

describe('integrity', () => {
  test('the database refuses an orphan translation and a second row for one locale', async () => {
    const publication = stored(await create())

    await expect(
      prisma.researchTranslation.create({
        data: { researchId: randomUUID(), locale: 'en', title: 'x', abstract: 'x' },
      }),
    ).rejects.toThrow()
    await expect(
      prisma.researchTranslation.create({
        data: { researchId: publication.slug, locale: 'en', title: 'x', abstract: 'x' },
      }),
    ).rejects.toThrow()
  })

  test('deleting a publication removes its translations and author links, not its authors', async () => {
    const publication = stored(await create())

    expect(await deletePublication(publication.slug)).toBe(true)
    expect(
      await prisma.researchTranslation.count({ where: { researchId: publication.slug } }),
    ).toBe(0)
    expect(
      await prisma.researchCrossAuthor.count({ where: { researchId: publication.slug } }),
    ).toBe(0)
    expect(
      await prisma.researchAuthor.findUnique({ where: { name: `Autora ${RUN}` } }),
    ).not.toBeNull()
    expect(await deletePublication(publication.slug)).toBe(false)
  })
})
