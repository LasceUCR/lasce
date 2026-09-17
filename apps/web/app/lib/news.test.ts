import { beforeEach, describe, expect, test, vi } from 'vitest'

const findMany = vi.fn()
const findUnique = vi.fn()
const findUniqueOrThrow = vi.fn()
const create = vi.fn()
const update = vi.fn()
const deleteNews = vi.fn()
const sourceUpsert = vi.fn()
const authorUpsert = vi.fn()
const crossAuthorUpsert = vi.fn()
const crossAuthorDeleteMany = vi.fn()

vi.mock('@lasce/db', () => ({
  prisma: {
    news: { findMany, findUnique, findUniqueOrThrow, create, update, delete: deleteNews },
    newsSource: { upsert: sourceUpsert },
    newsAuthor: { upsert: authorUpsert },
    newsCrossAuthor: { upsert: crossAuthorUpsert, deleteMany: crossAuthorDeleteMany },
  },
}))

const {
  getNews,
  newsInputSchema,
  createNews,
  updateNews,
  deleteNews: deleteNewsArticle,
} = await import('./news')

function newsRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'news-1',
    title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
    publishedAt: new Date('2023-10-02T00:00:00.000Z'),
    abstract:
      'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas y generar datos para investigaciones científicas.',
    externalUrl:
      'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
    imageUrl: '/images/news/el-norte-hoy-1.png',
    imageAlt: 'Radiotelescopio ROSAC.',
    source: { name: 'El Norte Hoy' },
    authors: [{ newsAuthor: { name: 'Gerardo Quesada A.' } }],
    ...overrides,
  }
}

const validInput = {
  title: 'Nuevo artículo',
  source: 'La Nación',
  authors: ['Jorge Arturo Mora'],
  publishedAt: '2026-05-24',
  externalUrl: 'https://www.nacion.com/articulo',
  abstract: 'Resumen del artículo.',
  imageUrl: '/images/news/example.png',
  imageAlt: 'Descripción de la imagen.',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getNews', () => {
  test('maps a news record to the NewsArticle shape, preserving author order', async () => {
    findMany.mockResolvedValue([newsRow()])

    const news = await getNews()

    expect(news).toEqual([
      {
        slug: 'news-1',
        title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
        authors: 'Gerardo Quesada A.',
        source: 'El Norte Hoy',
        date: '2 de octubre de 2023',
        publishedAt: '2023-10-02',
        abstract:
          'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas y generar datos para investigaciones científicas.',
        href: 'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
        imageUrl: '/images/news/el-norte-hoy-1.png',
        imageAlt: 'Radiotelescopio ROSAC.',
      },
    ])
  })

  test('shows "Sin fecha" and a null publishedAt when a record has no published date', async () => {
    findMany.mockResolvedValue([newsRow({ publishedAt: null })])

    const [article] = await getNews()

    expect(article?.date).toBe('Sin fecha')
    expect(article?.publishedAt).toBeNull()
  })

  test('orders newest first with undated records last, and authors by citation position', async () => {
    findMany.mockResolvedValue([])

    await getNews()

    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        publishedAt: {
          sort: 'desc',
          nulls: 'last',
        },
      },
      include: {
        source: true,
        authors: {
          orderBy: { position: 'asc' },
          include: { newsAuthor: true },
        },
      },
    })
  })

  test('returns an empty list when there are no news records', async () => {
    findMany.mockResolvedValue([])

    expect(await getNews()).toEqual([])
  })

  test('joins a single author without a trailing separator', async () => {
    findMany.mockResolvedValue([
      newsRow({ id: 'news-2', authors: [{ newsAuthor: { name: 'LASCE' } }] }),
    ])

    const [article] = await getNews()

    expect(article?.authors).toBe('LASCE')
  })
})

describe('newsInputSchema', () => {
  test('accepts a well-formed submission', () => {
    expect(newsInputSchema.safeParse(validInput).success).toBe(true)
  })

  test('rejects an empty author list', () => {
    const result = newsInputSchema.safeParse({ ...validInput, authors: [] })
    expect(result.success).toBe(false)
  })

  test('rejects a non-URL external link', () => {
    const result = newsInputSchema.safeParse({ ...validInput, externalUrl: 'not a url' })
    expect(result.success).toBe(false)
  })

  test('allows a null published date', () => {
    expect(newsInputSchema.safeParse({ ...validInput, publishedAt: null }).success).toBe(true)
  })
})

describe('createNews', () => {
  test('upserts the source, creates the record, and links the authors in order', async () => {
    sourceUpsert.mockResolvedValue({ id: 'source-1' })
    create.mockResolvedValue({ id: 'news-1' })
    authorUpsert.mockResolvedValue({ id: 'author-1' })
    findUniqueOrThrow.mockResolvedValue(newsRow())

    const article = await createNews(validInput)

    expect(sourceUpsert).toHaveBeenCalledWith({
      where: { name: validInput.source },
      update: {},
      create: { name: validInput.source },
    })
    expect(create).toHaveBeenCalledWith({
      data: {
        title: validInput.title,
        publishedAt: validInput.publishedAt,
        sourceId: 'source-1',
        abstract: validInput.abstract,
        externalUrl: validInput.externalUrl,
        imageUrl: validInput.imageUrl,
        imageAlt: validInput.imageAlt,
      },
    })
    expect(crossAuthorUpsert).toHaveBeenCalledWith({
      where: { newsId_newsAuthorId: { newsId: 'news-1', newsAuthorId: 'author-1' } },
      update: { position: 0 },
      create: { newsId: 'news-1', newsAuthorId: 'author-1', position: 0 },
    })
    expect(article.slug).toBe('news-1')
  })
})

describe('updateNews', () => {
  test('returns null when the article does not exist', async () => {
    findUnique.mockResolvedValue(null)

    expect(await updateNews('missing', validInput)).toBeNull()
    expect(update).not.toHaveBeenCalled()
  })

  test('drops cross-author rows for authors no longer in the list', async () => {
    findUnique.mockResolvedValue({ id: 'news-1' })
    sourceUpsert.mockResolvedValue({ id: 'source-1' })
    authorUpsert.mockResolvedValue({ id: 'author-1' })
    findUniqueOrThrow.mockResolvedValue(newsRow())

    await updateNews('news-1', validInput)

    expect(crossAuthorDeleteMany).toHaveBeenCalledWith({
      where: { newsId: 'news-1', newsAuthorId: { notIn: ['author-1'] } },
    })
  })
})

describe('deleteNews', () => {
  test('returns false when the article does not exist', async () => {
    findUnique.mockResolvedValue(null)

    expect(await deleteNewsArticle('missing')).toBe(false)
    expect(deleteNews).not.toHaveBeenCalled()
  })

  test('deletes an existing article', async () => {
    findUnique.mockResolvedValue({ id: 'news-1' })

    expect(await deleteNewsArticle('news-1')).toBe(true)
    expect(deleteNews).toHaveBeenCalledWith({ where: { id: 'news-1' } })
  })
})
