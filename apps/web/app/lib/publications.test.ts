import { beforeEach, describe, expect, test, vi } from 'vitest'

const findMany = vi.fn()

vi.mock('@lasce/db', () => ({
  prisma: { research: { findMany } },
}))

const { getPublications } = await import('./publications')

function researchRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'research-1',
    title: 'A geometrical description for interplanetary propagation of Earth-directed CMEs',
    publicationDate: new Date('2021-06-15T00:00:00.000Z'),
    abstract: 'We present a 3D geometrical model...',
    externalUrl: 'https://doi.org/10.1093/mnras/stab1232',
    publisher: { name: 'Monthly Notices of the Royal Astronomical Society' },
    authors: [
      { researchAuthor: { name: 'C. Salas-Matamoros' } },
      { researchAuthor: { name: 'J. Sánchez-Guevara' } },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPublications', () => {
  test('maps a research record to the Publication shape, preserving author order', async () => {
    findMany.mockResolvedValue([researchRow()])

    const publications = await getPublications()

    expect(publications).toEqual([
      {
        slug: 'research-1',
        title: 'A geometrical description for interplanetary propagation of Earth-directed CMEs',
        authors: 'C. Salas-Matamoros, J. Sánchez-Guevara',
        venue: 'Monthly Notices of the Royal Astronomical Society',
        year: '2021',
        abstract: 'We present a 3D geometrical model...',
        href: 'https://doi.org/10.1093/mnras/stab1232',
      },
    ])
  })

  test('orders newest first and authors by citation position', async () => {
    findMany.mockResolvedValue([])

    await getPublications()

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { publicationDate: 'desc' },
      include: {
        publisher: true,
        authors: { orderBy: { position: 'asc' }, include: { researchAuthor: true } },
      },
    })
  })

  test('returns an empty list when there are no research records', async () => {
    findMany.mockResolvedValue([])

    expect(await getPublications()).toEqual([])
  })

  test('joins a single author without a trailing separator', async () => {
    findMany.mockResolvedValue([
      researchRow({ id: 'research-2', authors: [{ researchAuthor: { name: 'LASCE' } }] }),
    ])

    const [publication] = await getPublications()

    expect(publication?.authors).toBe('LASCE')
  })
})
