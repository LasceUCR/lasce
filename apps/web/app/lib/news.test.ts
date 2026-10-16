import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  /** Stands in for Prisma's error class, which the module checks with `instanceof`. */
  class PrismaClientKnownRequestError extends Error {
    readonly code: string
    readonly meta: unknown

    constructor(message: string, { code, meta }: { code: string; meta?: unknown }) {
      super(message)
      this.code = code
      this.meta = meta
    }
  }

  const tx = {
    newsSource: { upsert: vi.fn() },
    news: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    newsTranslation: { upsert: vi.fn() },
    newsAuthor: { upsert: vi.fn() },
    newsCrossAuthor: { deleteMany: vi.fn(), upsert: vi.fn() },
  }

  const prisma = {
    news: { findMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  }

  return { tx, prisma, PrismaClientKnownRequestError }
})

vi.mock('@lasce/db', () => ({
  prisma: mocks.prisma,
  Prisma: { PrismaClientKnownRequestError: mocks.PrismaClientKnownRequestError },
}))

const { createNews, deleteNews, getNews, newsCreateSchema, newsUpdateSchema, updateNews } =
  await import('./news')

const { tx, prisma } = mocks

const VERSION = '2026-09-01T10:00:00.000Z'

function newsRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'news-1',
    title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
    publishedAt: new Date('2023-10-02T00:00:00.000Z'),
    abstract: 'ROSAC permitirá monitorear la radiación solar durante las 24 horas.',
    externalUrl: 'https://elnortehoycr.com/2023/10/02/ucr-radiotelescopio/',
    updatedAt: new Date(VERSION),
    source: { name: 'El Norte Hoy' },
    authors: [{ newsAuthor: { name: 'Gerardo Quesada A.' } }, { newsAuthor: { name: 'Ana Mora' } }],
    translations: [],
    ...overrides,
  }
}

const bilingualRow = newsRow({
  translations: [
    {
      locale: 'en',
      title: 'UCR brings a radio telescope online to study the Sun',
      abstract: 'ROSAC will monitor solar radiation around the clock.',
    },
  ],
})

const createBody = {
  content: {
    es: { title: 'Título', abstract: 'Resumen' },
    en: { title: 'Title', abstract: 'Abstract' },
  },
  source: 'La Nación',
  authors: ['Juan Pérez', 'María Rodríguez'],
  publishedAt: '2026-01-01',
  externalUrl: 'https://example.com/nota',
}

function uniqueViolation(meta: unknown) {
  return new mocks.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    meta,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation((write: (client: typeof tx) => unknown) => write(tx))
  tx.newsSource.upsert.mockResolvedValue({ id: 'source-1' })
  tx.news.create.mockResolvedValue({ id: 'news-1' })
  tx.news.findUnique.mockResolvedValue({
    title: 'Título',
    abstract: 'Resumen',
    updatedAt: new Date(VERSION),
    translations: [{ locale: 'en', title: 'Title', abstract: 'Abstract' }],
  })
  tx.news.updateMany.mockResolvedValue({ count: 1 })
  tx.news.findUniqueOrThrow.mockResolvedValue(bilingualRow)
  tx.newsAuthor.upsert.mockImplementation(({ create }: { create: { name: string } }) =>
    Promise.resolve({ id: `author-${create.name}` }),
  )
})

describe('getNews', () => {
  test('maps a record to the shape the page renders, preserving author order', async () => {
    prisma.news.findMany.mockResolvedValue([newsRow()])

    const [article] = await getNews()

    expect(article).toEqual({
      slug: 'news-1',
      title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
      authors: 'Gerardo Quesada A., Ana Mora',
      source: 'El Norte Hoy',
      date: '2 de octubre de 2023',
      publishedAt: '2023-10-02',
      abstract: 'ROSAC permitirá monitorear la radiación solar durante las 24 horas.',
      href: 'https://elnortehoycr.com/2023/10/02/ucr-radiotelescopio/',
      contentLocale: null,
    })
  })

  test('orders newest first with undated items last, and loads the stored translations', async () => {
    prisma.news.findMany.mockResolvedValue([])

    await getNews('en')

    expect(prisma.news.findMany).toHaveBeenCalledWith({
      orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
      include: {
        source: true,
        authors: { orderBy: { position: 'asc' }, include: { newsAuthor: true } },
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, title: true, abstract: true },
        },
      },
    })
  })

  test('keeps the order the database returns in every language', async () => {
    const older = newsRow({ id: 'news-2', publishedAt: new Date('2017-06-05T00:00:00.000Z') })
    const undated = newsRow({ id: 'news-3', publishedAt: null })
    prisma.news.findMany.mockResolvedValue([bilingualRow, older, undated])

    const spanish = await getNews('es')
    const english = await getNews('en')

    expect(spanish.map((article) => article.slug)).toEqual(['news-1', 'news-2', 'news-3'])
    expect(english.map((article) => article.slug)).toEqual(['news-1', 'news-2', 'news-3'])
  })

  test('shows the English text of a translated item in English', async () => {
    prisma.news.findMany.mockResolvedValue([bilingualRow])

    const [article] = await getNews('en')

    expect(article).toMatchObject({
      title: 'UCR brings a radio telescope online to study the Sun',
      abstract: 'ROSAC will monitor solar radiation around the clock.',
      contentLocale: 'en',
    })
  })

  test('shows the Spanish text of a translated item in Spanish', async () => {
    prisma.news.findMany.mockResolvedValue([bilingualRow])

    const [article] = await getNews('es')

    expect(article).toMatchObject({
      title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
      contentLocale: 'es',
    })
  })

  test('falls back to the base text of an item with no translation, without claiming a language', async () => {
    prisma.news.findMany.mockResolvedValue([newsRow()])

    const [article] = await getNews('en')

    expect(article).toMatchObject({
      title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
      contentLocale: null,
    })
  })

  test('formats the date in the language asked for', async () => {
    prisma.news.findMany.mockResolvedValue([newsRow()])

    const [spanish] = await getNews('es')
    const [english] = await getNews('en')

    expect(spanish?.date).toBe('2 de octubre de 2023')
    expect(english?.date).toBe('October 2, 2023')
  })

  test('leaves the date empty for an undated item, for the card to say so in its language', async () => {
    prisma.news.findMany.mockResolvedValue([newsRow({ publishedAt: null })])

    const [article] = await getNews('en')

    expect(article).toMatchObject({ date: null, publishedAt: null })
  })

  test('leaves editing data out unless asked for it', async () => {
    prisma.news.findMany.mockResolvedValue([bilingualRow])

    const [article] = await getNews('es')

    expect(article).not.toHaveProperty('editing')
  })

  test('includes every language and the version when asked for editing data', async () => {
    prisma.news.findMany.mockResolvedValue([bilingualRow, newsRow({ id: 'news-2' })])

    const [complete, legacy] = await getNews('es', { includeEditingData: true })

    expect(complete?.editing).toEqual({
      content: {
        es: {
          title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
          abstract: 'ROSAC permitirá monitorear la radiación solar durante las 24 horas.',
        },
        en: {
          title: 'UCR brings a radio telescope online to study the Sun',
          abstract: 'ROSAC will monitor solar radiation around the clock.',
        },
      },
      isLegacy: false,
      version: VERSION,
    })
    expect(legacy?.editing).toMatchObject({ content: { en: null }, isLegacy: true })
  })
})

describe('createNews', () => {
  test('stores the Spanish text on the record and the English text as its translation', async () => {
    const result = await createNews(newsCreateSchema.parse(createBody))

    expect(tx.news.create).toHaveBeenCalledWith({
      data: {
        title: 'Título',
        abstract: 'Resumen',
        publishedAt: new Date('2026-01-01'),
        sourceId: 'source-1',
        externalUrl: 'https://example.com/nota',
        translations: { create: [{ locale: 'en', title: 'Title', abstract: 'Abstract' }] },
      },
    })
    expect(result).toMatchObject({
      ok: true,
      article: { slug: 'news-1', editing: { isLegacy: false, version: VERSION } },
    })
  })

  test('writes the source and the ordered authors inside one transaction', async () => {
    await createNews(newsCreateSchema.parse(createBody))

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.newsSource.upsert).toHaveBeenCalledWith({
      where: { name: 'La Nación' },
      update: {},
      create: { name: 'La Nación' },
    })
    expect(tx.newsCrossAuthor.upsert).toHaveBeenLastCalledWith({
      where: { newsId_newsAuthorId: { newsId: 'news-1', newsAuthorId: 'author-María Rodríguez' } },
      update: {},
      create: { newsId: 'news-1', newsAuthorId: 'author-María Rodríguez', position: 1 },
    })
  })

  test('stores an undated item with no date', async () => {
    await createNews(newsCreateSchema.parse({ ...createBody, publishedAt: null }))

    expect(tx.news.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ publishedAt: null }),
    })
  })

  test('reports a link another item already uses, as reported by the driver adapter', async () => {
    tx.news.create.mockRejectedValue(
      uniqueViolation({
        driverAdapterError: { cause: { constraint: { fields: ['external_url'] } } },
      }),
    )

    await expect(createNews(newsCreateSchema.parse(createBody))).resolves.toEqual({
      ok: false,
      reason: 'duplicate-link',
    })
  })

  test('rethrows a unique violation it cannot explain', async () => {
    const error = uniqueViolation({ target: ['name'] })
    tx.newsSource.upsert.mockRejectedValue(error)

    await expect(createNews(newsCreateSchema.parse(createBody))).rejects.toBe(error)
  })

  test('rethrows any other database error', async () => {
    const error = new Error('connection lost')
    tx.news.create.mockRejectedValue(error)

    await expect(createNews(newsCreateSchema.parse(createBody))).rejects.toBe(error)
  })
})

describe('updateNews', () => {
  const contentUpdate = {
    version: VERSION,
    content: {
      es: { title: 'Título nuevo', abstract: 'Resumen' },
      en: { title: 'New title', abstract: 'Abstract' },
    },
  }

  test('saves both languages, conditioned on the version the editor loaded', async () => {
    const result = await updateNews('news-1', newsUpdateSchema.parse(contentUpdate))

    expect(result.ok).toBe(true)
    expect(tx.news.updateMany).toHaveBeenCalledWith({
      where: { id: 'news-1', updatedAt: new Date(VERSION) },
      data: { title: 'Título nuevo', abstract: 'Resumen', updatedAt: expect.any(Date) },
    })
    expect(tx.newsTranslation.upsert).toHaveBeenCalledWith({
      where: { newsId_locale: { newsId: 'news-1', locale: 'en' } },
      create: { newsId: 'news-1', locale: 'en', title: 'New title', abstract: 'Abstract' },
      update: { title: 'New title', abstract: 'Abstract' },
    })
  })

  test('moves the version forward on every save', async () => {
    await updateNews('news-1', newsUpdateSchema.parse(contentUpdate))

    const [args] = tx.news.updateMany.mock.calls[0] ?? []
    expect(args.data.updatedAt.getTime()).toBeGreaterThan(new Date(VERSION).getTime())
  })

  test('writes only the shared fields sent, and leaves the translations alone', async () => {
    const result = await updateNews(
      'news-1',
      newsUpdateSchema.parse({ version: VERSION, source: 'Delfino.cr', publishedAt: null }),
    )

    expect(result.ok).toBe(true)
    expect(tx.news.updateMany).toHaveBeenCalledWith({
      where: { id: 'news-1', updatedAt: new Date(VERSION) },
      data: { publishedAt: null, sourceId: 'source-1', updatedAt: expect.any(Date) },
    })
    expect(tx.newsTranslation.upsert).not.toHaveBeenCalled()
    expect(tx.newsCrossAuthor.deleteMany).not.toHaveBeenCalled()
  })

  test('replaces the author links in the order given', async () => {
    await updateNews(
      'news-1',
      newsUpdateSchema.parse({ version: VERSION, authors: ['Juan Pérez', 'Ana Mora'] }),
    )

    expect(tx.newsCrossAuthor.deleteMany).toHaveBeenCalledWith({ where: { newsId: 'news-1' } })
    expect(tx.newsCrossAuthor.upsert).toHaveBeenNthCalledWith(1, {
      where: { newsId_newsAuthorId: { newsId: 'news-1', newsAuthorId: 'author-Juan Pérez' } },
      update: {},
      create: { newsId: 'news-1', newsAuthorId: 'author-Juan Pérez', position: 0 },
    })
  })

  test('updates a legacy item’s shared fields without asking for a translation', async () => {
    tx.news.findUnique.mockResolvedValue({
      title: 'Título',
      abstract: 'Resumen',
      updatedAt: new Date(VERSION),
      translations: [],
    })

    const result = await updateNews(
      'news-1',
      newsUpdateSchema.parse({ version: VERSION, externalUrl: 'https://example.com/otra' }),
    )

    expect(result.ok).toBe(true)
  })

  test('reports an item that does not exist', async () => {
    tx.news.findUnique.mockResolvedValue(null)

    await expect(updateNews('missing', newsUpdateSchema.parse(contentUpdate))).resolves.toEqual({
      ok: false,
      reason: 'not-found',
    })
    expect(tx.news.updateMany).not.toHaveBeenCalled()
  })

  test('reports a conflict when the item changed since the editor loaded it', async () => {
    const stale = { ...contentUpdate, version: '2026-08-01T00:00:00.000Z' }

    await expect(updateNews('news-1', newsUpdateSchema.parse(stale))).resolves.toEqual({
      ok: false,
      reason: 'conflict',
    })
    expect(tx.newsSource.upsert).not.toHaveBeenCalled()
  })

  test('reports a conflict when another save wins between the check and the write', async () => {
    tx.news.updateMany.mockResolvedValue({ count: 0 })

    await expect(updateNews('news-1', newsUpdateSchema.parse(contentUpdate))).resolves.toEqual({
      ok: false,
      reason: 'conflict',
    })
    expect(tx.newsTranslation.upsert).not.toHaveBeenCalled()
  })

  test('refuses a change in one language until the other is reviewed', async () => {
    const oneSided = {
      version: VERSION,
      content: {
        es: { title: 'Título nuevo', abstract: 'Resumen' },
        en: { title: 'Title', abstract: 'Abstract' },
      },
    }

    await expect(updateNews('news-1', newsUpdateSchema.parse(oneSided))).resolves.toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })
    expect(tx.news.updateMany).not.toHaveBeenCalled()
  })

  test('saves a change in one language once the other is confirmed', async () => {
    const confirmed = {
      version: VERSION,
      content: {
        es: { title: 'Título nuevo', abstract: 'Resumen' },
        en: { title: 'Title', abstract: 'Abstract' },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    }

    const result = await updateNews('news-1', newsUpdateSchema.parse(confirmed))

    expect(result.ok).toBe(true)
  })

  test('requires reviewing the base text when a legacy item gets its English text', async () => {
    tx.news.findUnique.mockResolvedValue({
      title: 'Título',
      abstract: 'Resumen',
      updatedAt: new Date(VERSION),
      translations: [],
    })
    const completed = {
      version: VERSION,
      content: {
        es: { title: 'Título', abstract: 'Resumen' },
        en: { title: 'Title', abstract: 'Abstract' },
      },
    }

    await expect(updateNews('news-1', newsUpdateSchema.parse(completed))).resolves.toEqual({
      ok: false,
      reason: 'review-required',
      pending: [
        { locale: 'es', field: 'title' },
        { locale: 'es', field: 'abstract' },
      ],
    })

    const reviewed = {
      ...completed,
      confirmedUnchanged: [
        { locale: 'es', field: 'title' },
        { locale: 'es', field: 'abstract' },
      ],
    }
    await expect(updateNews('news-1', newsUpdateSchema.parse(reviewed))).resolves.toMatchObject({
      ok: true,
    })
    expect(tx.newsTranslation.upsert).toHaveBeenCalledTimes(1)
  })

  test('reports a link another item already uses', async () => {
    tx.news.updateMany.mockRejectedValue(uniqueViolation({ target: ['external_url'] }))

    await expect(
      updateNews(
        'news-1',
        newsUpdateSchema.parse({ version: VERSION, externalUrl: 'https://example.com/otra' }),
      ),
    ).resolves.toEqual({ ok: false, reason: 'duplicate-link' })
  })
})

describe('deleteNews', () => {
  test('deletes the item, whose translations and author links cascade', async () => {
    prisma.news.deleteMany.mockResolvedValue({ count: 1 })

    await expect(deleteNews('news-1')).resolves.toBe(true)
    expect(prisma.news.deleteMany).toHaveBeenCalledWith({ where: { id: 'news-1' } })
  })

  test('reports an item that was already gone', async () => {
    prisma.news.deleteMany.mockResolvedValue({ count: 0 })

    await expect(deleteNews('missing')).resolves.toBe(false)
  })
})
