import { beforeEach, describe, expect, test, vi } from 'vitest'

const findMany = vi.fn()

vi.mock('@lasce/db', () => ({
  prisma: { news: { findMany } },
}))

const { getNews } = await import('./news')

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
    source: { name: 'El Norte Hoy' },
    authors: [
      { newsAuthor: { name: 'Gerardo Quesada A.' } },
    ],
    ...overrides,
  }
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
        date: '2023',
        abstract:
          'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas y generar datos para investigaciones científicas.',
        href:
          'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
        imageUrl: '/images/news/el-norte-hoy-1.png',
      },
    ])
  })

  test('orders newest first and authors by citation position', async () => {
    findMany.mockResolvedValue([])

    await getNews()

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { publishedAt: 'desc' },
      include: {
        source: true,
        authors: { orderBy: { position: 'asc' }, include: { newsAuthor: true } },
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
