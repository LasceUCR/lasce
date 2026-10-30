import { beforeEach, describe, expect, test, vi } from 'vitest'

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))
vi.mock('@lasce/db', () => ({ prisma: { collaboration: { findMany } } }))

import { getCollaborationRecords } from './collaboration-records'
import { collaborationContent } from './research-collaborations'

const organizations = [
  {
    id: 'tec',
    name: 'Instituto Tecnológico de Costa Rica',
    acronym: 'TEC',
    scope: 'NATIONAL',
    country: 'Costa Rica',
    translations: [{ locale: 'en', country: 'Costa Rica' }],
  },
  {
    id: 'ingv',
    name: 'Istituto Nazionale di Geofisica e Vulcanologia',
    acronym: 'INGV',
    scope: 'INTERNATIONAL',
    country: 'Italia',
    translations: [{ locale: 'en', country: 'Italy' }],
  },
]

beforeEach(() => {
  findMany.mockReset()
  findMany.mockResolvedValue(organizations)
})

describe('getCollaborationRecords', () => {
  test('shows the stored Spanish countries by default', async () => {
    expect(await getCollaborationRecords()).toEqual([
      {
        id: 'tec',
        name: organizations[0]!.name,
        acronym: 'TEC',
        scope: 'national',
        country: 'Costa Rica',
        countryLocale: 'es',
      },
      {
        id: 'ingv',
        name: organizations[1]!.name,
        acronym: 'INGV',
        scope: 'international',
        country: 'Italia',
        countryLocale: 'es',
      },
    ])
  })

  test('keeps each English translation attached to its organization and preserves shared fields', async () => {
    const spanish = await getCollaborationRecords('es')
    const english = await getCollaborationRecords('en')

    expect(english).toEqual(
      spanish.map((record) => ({
        ...record,
        country: record.id === 'ingv' ? 'Italy' : 'Costa Rica',
        countryLocale: 'en',
      })),
    )
  })

  test('reads new database content without requiring a country catalogue key', async () => {
    findMany.mockResolvedValue([
      {
        ...organizations[1],
        id: 'new-partner',
        country: 'Alemania',
        acronym: null,
        translations: [{ locale: 'en', country: 'Germany' }],
      },
    ])

    expect(await getCollaborationRecords('en')).toEqual([
      expect.objectContaining({ id: 'new-partner', country: 'Germany', acronym: undefined }),
    ])
  })

  test.each(['es', 'en'] as const)(
    'keeps a legacy country in %s with unknown content language',
    async (locale) => {
      findMany.mockResolvedValue([{ ...organizations[1], translations: [] }])

      expect(await getCollaborationRecords(locale)).toEqual([
        expect.objectContaining({ id: 'ingv', country: 'Italia', countryLocale: null }),
      ])
    },
  )

  test('ignores an unsupported translation and falls back to the stored base text', async () => {
    findMany.mockResolvedValue([
      { ...organizations[1], translations: [{ locale: 'fr', country: 'Italie' }] },
    ])

    expect(await getCollaborationRecords('en')).toEqual([
      expect.objectContaining({ country: 'Italia', countryLocale: null }),
    ])
  })

  test('requests stable display order and supported translations in one query', async () => {
    await getCollaborationRecords('en')

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        acronym: true,
        scope: true,
        country: true,
        websiteUrl: true,
        logoPath: true,
        updatedAt: true,
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, country: true },
        },
      },
    })
  })

  test('returns an empty directory when no organizations remain', async () => {
    findMany.mockResolvedValue([])
    expect(await getCollaborationRecords('en')).toEqual([])
  })

  test('keeps stored media attached to the record in both languages even after a name change', async () => {
    findMany.mockResolvedValue([
      {
        ...organizations[0],
        name: 'Updated official name',
        logoPath: '/brand/collaborations/tec.png',
        websiteUrl: 'https://www.tec.ac.cr/',
      },
      { ...organizations[1], logoPath: null, websiteUrl: null },
    ])
    for (const locale of ['es', 'en'] as const) {
      const records = await getCollaborationRecords(locale)
      expect(records[0]).toMatchObject({
        name: 'Updated official name',
        logoPath: '/brand/collaborations/tec.png',
        websiteUrl: 'https://www.tec.ac.cr/',
        scope: 'national',
      })
      expect(records[1]).not.toHaveProperty('logoPath')
      expect(records[1]).not.toHaveProperty('websiteUrl')
    }
  })

  test('does not replace a database failure with the static fixture directory', async () => {
    findMany.mockRejectedValue(new Error('Database unavailable'))
    await expect(getCollaborationRecords()).rejects.toThrow('Database unavailable')
  })
})

describe('collaboration content', () => {
  test('requires and trims a country in both languages', () => {
    expect(
      collaborationContent.schema.parse({
        es: { country: ' Italia ' },
        en: { country: ' Italy ' },
      }),
    ).toEqual({ es: { country: 'Italia' }, en: { country: 'Italy' } })
    expect(collaborationContent.schema.safeParse({ es: { country: 'Italia' } }).success).toBe(false)
    expect(
      collaborationContent.schema.safeParse({ es: { country: 'Italia' }, en: { country: ' ' } })
        .success,
    ).toBe(false)
  })
})

describe('collaboration editing metadata', () => {
  test('includes versions and all countries only for authorized editing reads', async () => {
    findMany.mockResolvedValue([
      {
        ...organizations[1],
        updatedAt: new Date('2026-10-14T12:00:00.000Z'),
        websiteUrl: 'https://example.com',
      },
    ])
    const publicRecords = await getCollaborationRecords('en')
    expect(publicRecords[0]).not.toHaveProperty('editing')
    expect(publicRecords[0]).toMatchObject({
      websiteUrl: 'https://example.com',
    })
    const editable = await getCollaborationRecords('en', { includeEditingData: true })
    expect(editable[0]?.editing).toEqual({
      content: { es: { country: 'Italia' }, en: { country: 'Italy' } },
      isLegacy: false,
      version: '2026-10-14T12:00:00.000Z',
    })
  })
})
