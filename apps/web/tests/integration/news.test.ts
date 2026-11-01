import { randomUUID } from 'node:crypto'

import { prisma } from '@lasce/db'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import {
  createNews,
  deleteNews,
  getNews,
  getNewsPage,
  newsCreateSchema,
  newsUpdateSchema,
  updateNews,
  type NewsArticle,
  type NewsWriteResult,
} from '@/app/lib/news'

/**
 * The news service against a real PostgreSQL database. Every row these tests create is tagged with
 * `RUN` and deleted afterwards; nothing else is touched, so the database only has to be migrated,
 * not emptied. `tests/integration/setup.ts` has already refused anything but a disposable `*_test`
 * database.
 */

const RUN = `it${randomUUID().replaceAll('-', '').slice(0, 10)}`

const content = {
  es: { title: `Título ${RUN}`, abstract: 'Resumen.' },
  en: { title: `Title ${RUN}`, abstract: 'Abstract.' },
}

let links = 0

/** A link no other item uses: `external_url` is unique. */
function link() {
  links += 1
  return `https://example.org/${RUN}/${links}`
}

function create(overrides: Record<string, unknown> = {}) {
  return createNews(
    newsCreateSchema.parse({
      content,
      source: `Fuente ${RUN}`,
      authors: [`Autora ${RUN}`],
      publishedAt: '2026-05-06',
      externalUrl: link(),
      ...overrides,
    }),
    actor,
  )
}

function update(id: string, body: Record<string, unknown>) {
  return updateNews(id, newsUpdateSchema.parse(body), actor)
}

function stored(result: NewsWriteResult): NewsArticle & Required<Pick<NewsArticle, 'editing'>> {
  if (!result.ok) throw new Error(`Expected a stored news item, got ${JSON.stringify(result)}`)
  if (!result.article.editing) throw new Error('Expected editing data on a write result')
  return result.article as NewsArticle & Required<Pick<NewsArticle, 'editing'>>
}

async function row(id: string) {
  return prisma.news.findUniqueOrThrow({
    where: { id },
    include: {
      translations: { orderBy: { locale: 'asc' } },
      authors: { orderBy: { position: 'asc' } },
    },
  })
}

async function readAs(locale: 'es' | 'en', id: string) {
  const all = await getNews(locale, { includeEditingData: true })
  const found = all.find((article) => article.slug === id)
  if (!found) throw new Error(`News item ${id} not found`)
  return found
}

/** An item saved before translations existed: base text only, no translation row. */
async function createLegacy() {
  const source = await prisma.newsSource.upsert({
    where: { name: `Fuente ${RUN}` },
    update: {},
    create: { name: `Fuente ${RUN}` },
  })

  return prisma.news.create({
    data: {
      title: `Legacy ${RUN}`,
      abstract: 'Written before languages existed, in English.',
      publishedAt: new Date('2026-01-01'),
      sourceId: source.id,
      externalUrl: link(),
    },
  })
}

const FAILING_TITLE = `FAIL ${RUN}`
const trigger = `${RUN}_fail`

/** Makes PostgreSQL reject any translation row titled `FAILING_TITLE`, mid-transaction. */
async function withFailingTranslations(run: () => Promise<void>) {
  await prisma.$executeRawUnsafe(
    `create function news.${trigger}() returns trigger language plpgsql as $$
     begin
       if new.title = '${FAILING_TITLE}' then raise exception 'forced failure'; end if;
       return new;
     end $$`,
  )
  await prisma.$executeRawUnsafe(
    `create trigger ${trigger} before insert or update on news.news_record_translations
     for each row execute function news.${trigger}()`,
  )

  try {
    await run()
  } finally {
    await prisma.$executeRawUnsafe(
      `drop trigger if exists ${trigger} on news.news_record_translations`,
    )
    await prisma.$executeRawUnsafe(`drop function if exists news.${trigger}()`)
  }
}

beforeAll(async () => {
  const [migrated] = await prisma.$queryRaw<{ exists: boolean }[]>`
    select to_regclass('news.news_record_translations') is not null as exists`
  if (!migrated?.exists) {
    throw new Error(
      'The test database has no news.news_record_translations table. Apply the migrations first: DATABASE_URL=<test url> pnpm db:migrate:deploy',
    )
  }
})

afterAll(async () => {
  await prisma.news.deleteMany({ where: { externalUrl: { contains: RUN } } })
  await prisma.newsSource.deleteMany({ where: { name: { contains: RUN } } })
  await prisma.newsAuthor.deleteMany({ where: { name: { contains: RUN } } })
  await prisma.$disconnect()
})

const actor = { id: 'user-1' }

describe('creating', () => {
  test('stores both languages at once: Spanish on the record, English as a translation', async () => {
    const article = stored(await create())
    const record = await row(article.slug)

    expect(record).toMatchObject({ title: content.es.title, abstract: content.es.abstract })
    expect(record.translations).toMatchObject([{ locale: 'en', ...content.en }])
    expect(record.publishedAt?.toISOString().slice(0, 10)).toBe('2026-05-06')
    expect(record.authors).toHaveLength(1)
    expect(article.editing.isLegacy).toBe(false)
  })

  test('rejects a link another item uses, writing nothing', async () => {
    const used = link()
    stored(await create({ externalUrl: used }))
    const before = await prisma.news.count({ where: { externalUrl: { contains: RUN } } })

    expect(await create({ externalUrl: used })).toEqual({ ok: false, reason: 'duplicate-link' })
    expect(await prisma.news.count({ where: { externalUrl: { contains: RUN } } })).toBe(before)
  })

  test('rolls back completely when the translation cannot be written', async () => {
    const source = `Fuente nueva ${RUN}`
    const before = await prisma.news.count({ where: { externalUrl: { contains: RUN } } })

    await withFailingTranslations(async () => {
      await expect(
        create({
          source,
          authors: [`Autor nuevo ${RUN}`],
          content: { ...content, en: { title: FAILING_TITLE, abstract: 'x' } },
        }),
      ).rejects.toThrow()
    })

    expect(await prisma.news.count({ where: { externalUrl: { contains: RUN } } })).toBe(before)
    expect(await prisma.newsSource.findUnique({ where: { name: source } })).toBeNull()
    expect(await prisma.newsAuthor.findUnique({ where: { name: `Autor nuevo ${RUN}` } })).toBeNull()
  })
})

describe('updating', () => {
  test('a shared-field update leaves the translations untouched', async () => {
    const article = stored(await create())
    const before = await row(article.slug)

    const saved = stored(
      await update(article.slug, {
        version: article.editing.version,
        source: `Otra fuente ${RUN}`,
        publishedAt: null,
      }),
    )
    const after = await row(article.slug)

    expect(after.translations).toEqual(before.translations)
    expect({ title: after.title, abstract: after.abstract }).toEqual({
      title: before.title,
      abstract: before.abstract,
    })
    expect(after.publishedAt).toBeNull()
    expect(saved.source).toBe(`Otra fuente ${RUN}`)
    expect(new Date(saved.editing.version).getTime()).toBeGreaterThan(
      new Date(article.editing.version).getTime(),
    )
  })

  test('a one-sided change needs the other language reviewed, then saves both', async () => {
    const article = stored(await create())
    const changed = { es: content.es, en: { ...content.en, title: `New title ${RUN}` } }

    expect(
      await update(article.slug, { version: article.editing.version, content: changed }),
    ).toEqual({ ok: false, reason: 'review-required', pending: [{ locale: 'es', field: 'title' }] })

    stored(
      await update(article.slug, {
        version: article.editing.version,
        content: changed,
        confirmedUnchanged: [{ locale: 'es', field: 'title' }],
      }),
    )
    const record = await row(article.slug)
    expect(record.title).toBe(content.es.title)
    expect(record.translations).toMatchObject([{ locale: 'en', title: `New title ${RUN}` }])
  })

  test('rolls back the record, its version, source and authors when a translation fails', async () => {
    const article = stored(await create())
    const before = await row(article.slug)
    const source = `Fuente rollback ${RUN}`

    await withFailingTranslations(async () => {
      await expect(
        update(article.slug, {
          version: article.editing.version,
          source,
          authors: [`Autor rollback ${RUN}`],
          content: {
            es: { title: `Nuevo ${RUN}`, abstract: 'x' },
            en: { title: FAILING_TITLE, abstract: 'x' },
          },
        }),
      ).rejects.toThrow()
    })

    expect(await row(article.slug)).toEqual(before)
    expect(await prisma.newsSource.findUnique({ where: { name: source } })).toBeNull()
  })

  test('of several saves against the same version, exactly one wins and languages never mix', async () => {
    const article = stored(await create())

    const results = await Promise.all(
      [1, 2, 3, 4].map((attempt) =>
        update(article.slug, {
          version: article.editing.version,
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

    const record = await row(article.slug)
    const winner = record.title.split(' ')[1]
    expect(record.abstract).toBe(`ES ${winner}`)
    expect(record.translations).toMatchObject([
      { locale: 'en', title: `EN ${winner} ${RUN}`, abstract: `EN ${winner}` },
    ])
  })

  test('a stale version is refused and changes nothing', async () => {
    const article = stored(await create())
    stored(await update(article.slug, { version: article.editing.version, source: `V2 ${RUN}` }))
    const before = await row(article.slug)

    expect(
      await update(article.slug, { version: article.editing.version, source: `V3 ${RUN}` }),
    ).toEqual({ ok: false, reason: 'conflict' })
    expect(await row(article.slug)).toEqual(before)
  })

  test('an unknown id is not found', async () => {
    expect(
      await update(randomUUID(), { version: new Date().toISOString(), source: `V ${RUN}` }),
    ).toEqual({ ok: false, reason: 'not-found' })
  })
})

describe('legacy items', () => {
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
      await update(legacy.id, { version: editing!.version, authors: [`Autora ${RUN}`] }),
    )

    expect(saved.editing.isLegacy).toBe(true)
    expect((await row(legacy.id)).translations).toEqual([])
  })

  test('become complete once both languages are saved, after reviewing the base text', async () => {
    const legacy = await createLegacy()
    const { editing } = await readAs('es', legacy.id)
    const translated = {
      es: { title: `Nota antigua ${RUN}`, abstract: legacy.abstract },
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
      title: `Nota antigua ${RUN}`,
      contentLocale: 'es',
    })
  })
})

describe('reading', () => {
  test('shows each language of a complete item, and no editing data to visitors', async () => {
    const article = stored(await create())

    expect(await readAs('es', article.slug)).toMatchObject({
      title: content.es.title,
      abstract: content.es.abstract,
      date: '6 de mayo de 2026',
      contentLocale: 'es',
    })
    expect(await readAs('en', article.slug)).toMatchObject({
      title: content.en.title,
      abstract: content.en.abstract,
      date: 'May 6, 2026',
      contentLocale: 'en',
    })

    const visitor = (await getNews('en')).find((each) => each.slug === article.slug)
    expect(visitor?.editing).toBeUndefined()
  })

  test('orders items the same way in every language: newest first, undated last', async () => {
    const newer = stored(await create({ publishedAt: '2026-06-01' }))
    const older = stored(await create({ publishedAt: '2020-01-01' }))
    const undated = stored(await create({ publishedAt: null }))
    const ours = [newer.slug, older.slug, undated.slug]

    for (const locale of ['es', 'en'] as const) {
      const order = (await getNews(locale))
        .map((article) => article.slug)
        .filter((slug) => ours.includes(slug))
      expect(order).toEqual(ours)
    }
  })
})

describe('deleting and integrity', () => {
  test('deleting an item removes its translations with it', async () => {
    const article = stored(await create())

    expect(await deleteNews(article.slug, actor)).toBe(true)
    expect(await prisma.newsTranslation.count({ where: { newsId: article.slug } })).toBe(0)
    expect(await deleteNews(article.slug, actor)).toBe(false)
  })

  test('the database refuses an orphan translation and a second row for one locale', async () => {
    const article = stored(await create())

    await expect(
      prisma.newsTranslation.create({
        data: { newsId: randomUUID(), locale: 'en', title: 'x', abstract: 'x' },
      }),
    ).rejects.toThrow()
    await expect(
      prisma.newsTranslation.create({
        data: { newsId: article.slug, locale: 'en', title: 'x', abstract: 'x' },
      }),
    ).rejects.toThrow()
  })
})

describe('paginating and searching', () => {
  /** In the title of every item of the 23-item listing, and nowhere else. */
  const LISTING = `pg${RUN}`
  /** One item's Spanish abstract; its English abstract says something else. */
  const SPANISH_ONLY = `soloes${RUN}`
  /** The same item's English title; its Spanish title says something else. */
  const ENGLISH_ONLY = `onlyen${RUN}`
  /** The base title of an item with no translation. */
  const LEGACY_ONLY = `legado${RUN}`
  const SOURCE = `Medio ${RUN}`
  const AUTHOR = `Periodista ${RUN}`

  const dates = ['2026-03-01', '2026-02-01', '2026-02-01', '2026-02-01', '2026-01-01']

  function createListed(index: number, overrides: Record<string, unknown> = {}) {
    return create({
      content: {
        es: { title: `Noticia ${index} ${LISTING}`, abstract: 'Resumen.' },
        en: { title: `News ${index} ${LISTING}`, abstract: 'Abstract.' },
      },
      // Several items share each date, and two are undated, so ties decide most of the order.
      publishedAt: index < 2 ? null : (dates[index % dates.length] ?? null),
      ...overrides,
    })
  }

  async function allPages(query: string) {
    const first = await getNewsPage('es', { query })
    const pages = [first]
    for (let page = 2; page <= first.totalPages; page += 1) {
      pages.push(await getNewsPage('es', { query, page }))
    }
    return pages
  }

  beforeAll(async () => {
    // One at a time, so `created_at` follows the index.
    for (let index = 0; index < 23; index += 1) {
      // 12 of them share a source, to check the totals of a search.
      stored(await createListed(index, index < 12 ? { source: SOURCE } : {}))
    }

    stored(
      await create({
        content: {
          es: { title: `Tormenta solar ${RUN}`, abstract: `Resumen ${SPANISH_ONLY}.` },
          en: { title: `Solar storm ${ENGLISH_ONLY}`, abstract: 'An abstract.' },
        },
        authors: [`Otra autora ${RUN}`, AUTHOR],
      }),
    )

    const legacy = await createLegacy()
    await prisma.news.update({ where: { id: legacy.id }, data: { title: `${LEGACY_ONLY} ${RUN}` } })
  })

  test('splits 23 matching items into pages of 10, 10 and 3', async () => {
    const pages = await allPages(LISTING)

    expect(pages.map((page) => page.articles.length)).toEqual([10, 10, 3])
    expect(pages.map((page) => page.page)).toEqual([1, 2, 3])
    for (const page of pages) {
      expect(page).toMatchObject({ pageSize: 10, totalItems: 23, totalPages: 3 })
    }
  })

  test('shows every item exactly once across the pages, in the order of the full listing', async () => {
    const paged = (await allPages(LISTING)).flatMap((page) => page.articles.map((a) => a.slug))
    const listing = (await getNews('es'))
      .filter((article) => article.title.includes(LISTING))
      .map((article) => article.slug)

    expect(new Set(paged).size).toBe(23)
    expect(paged).toEqual(listing)
  })

  test('orders newest first, items sharing a date by creation, newest first, and undated last', async () => {
    const articles = (await allPages(LISTING)).flatMap((page) => page.articles)
    const index = (article: NewsArticle) => Number(article.title.split(' ')[1])

    const dated = articles.filter((article) => article.publishedAt !== null)
    const sorted = [...dated].sort(
      (a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || index(b) - index(a),
    )
    expect(dated.map(index)).toEqual(sorted.map(index))
    expect(articles.slice(-2).map(index)).toEqual([1, 0])
  })

  test('returns the same page every time while the collection does not change', async () => {
    const first = await getNewsPage('es', { query: LISTING, page: 2 })
    const second = await getNewsPage('es', { query: LISTING, page: 2 })

    expect(second.articles.map((a) => a.slug)).toEqual(first.articles.map((a) => a.slug))
  })

  test('shows the last page for a page past the end, and the first for one below it', async () => {
    const past = await getNewsPage('es', { query: LISTING, page: 99 })
    const below = await getNewsPage('es', { query: LISTING, page: 0 })

    expect(past.page).toBe(3)
    expect(past.articles).toHaveLength(3)
    expect(below.page).toBe(1)
    expect(below.articles).toHaveLength(10)
  })

  test('counts only the matching items in the totals', async () => {
    const page = await getNewsPage('es', { query: SOURCE })

    expect(page).toMatchObject({ totalItems: 12, totalPages: 2 })
    expect(page.articles).toHaveLength(10)
  })

  test('finds an item by its source and by any of its authors, ignoring case', async () => {
    for (const locale of ['es', 'en'] as const) {
      expect((await getNewsPage(locale, { query: SOURCE.toUpperCase() })).totalItems).toBe(12)
      expect((await getNewsPage(locale, { query: AUTHOR.toLowerCase() })).totalItems).toBe(1)
    }
  })

  test('searches the text shown in the language being read', async () => {
    expect((await getNewsPage('es', { query: SPANISH_ONLY })).totalItems).toBe(1)
    expect((await getNewsPage('en', { query: SPANISH_ONLY })).totalItems).toBe(0)

    expect((await getNewsPage('en', { query: ENGLISH_ONLY })).totalItems).toBe(1)
    expect((await getNewsPage('es', { query: ENGLISH_ONLY })).totalItems).toBe(0)
  })

  test('searches the base text of an item with no translation in every language', async () => {
    for (const locale of ['es', 'en'] as const) {
      const page = await getNewsPage(locale, { query: LEGACY_ONLY })

      expect(page.totalItems).toBe(1)
      expect(page.articles[0]).toMatchObject({ contentLocale: null })
    }
  })

  test('treats % and _ in the search as plain characters', async () => {
    expect((await getNewsPage('es', { query: `${LISTING}%` })).totalItems).toBe(0)
    expect((await getNewsPage('es', { query: `p_${RUN}` })).totalItems).toBe(0)
  })

  test('reports no pages for a search nothing matches', async () => {
    expect(await getNewsPage('es', { query: `nada ${RUN}` })).toMatchObject({
      page: 1,
      totalItems: 0,
      totalPages: 0,
      articles: [],
    })
  })

  test('sends no editing data unless asked for it', async () => {
    const visitor = await getNewsPage('es', { query: LISTING })
    const editor = await getNewsPage('es', { query: LISTING, includeEditingData: true })

    expect(visitor.articles.every((article) => article.editing === undefined)).toBe(true)
    expect(editor.articles.every((article) => article.editing !== undefined)).toBe(true)
  })
})
