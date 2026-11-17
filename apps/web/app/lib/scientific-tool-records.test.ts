import { beforeEach, describe, expect, test, vi } from 'vitest'

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))
vi.mock('@lasce/db', () => ({ prisma: { scientificTool: { findMany } } }))
import { getScientificToolRecords } from './scientific-tool-records'

const version = '2026-11-13T12:00:00.000Z'
const record = {
  id: 'swaat',
  name: 'SWAAT',
  description: 'Análisis de eventos solares.',
  accessUrl: 'https://swaat.example.com/',
  imageUrl: '/api/scientific-tools/images/38300000-0000-4000-8000-000000000001.webp',
  updatedAt: new Date(version),
  translations: [{ locale: 'en', description: 'Analysis of solar events.' }],
}

beforeEach(() => {
  findMany.mockReset()
  findMany.mockResolvedValue([record])
})

describe('scientific tool reads', () => {
  test('describes each tool in the requested language and keeps its name and link shared', async () => {
    expect(await getScientificToolRecords()).toEqual([
      {
        id: 'swaat',
        name: 'SWAAT',
        description: 'Análisis de eventos solares.',
        href: record.accessUrl,
        imageUrl: record.imageUrl,
        contentLocale: 'es',
      },
    ])
    expect((await getScientificToolRecords('en'))[0]).toMatchObject({
      name: 'SWAAT',
      description: 'Analysis of solar events.',
      href: record.accessUrl,
      contentLocale: 'en',
    })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ position: 'asc' }, { id: 'asc' }] }),
    )
  })

  test('sends every language and the version only when editing data is requested', async () => {
    expect((await getScientificToolRecords('en'))[0]).not.toHaveProperty('editing')
    expect(
      (await getScientificToolRecords('en', { includeEditingData: true }))[0]!.editing,
    ).toEqual({
      version,
      isLegacy: false,
      content: {
        es: { description: 'Análisis de eventos solares.' },
        en: { description: 'Analysis of solar events.' },
      },
    })
  })

  test('shows the original text with an unknown language when a tool has no translation', async () => {
    findMany.mockResolvedValue([{ ...record, translations: [], imageUrl: null }])
    expect((await getScientificToolRecords('en'))[0]).toMatchObject({
      description: 'Análisis de eventos solares.',
      contentLocale: null,
      imageUrl: null,
    })
  })

  test('returns no tools when none exist and lets database failures reach the caller', async () => {
    findMany.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('unavailable'))
    expect(await getScientificToolRecords()).toEqual([])
    await expect(getScientificToolRecords()).rejects.toThrow('unavailable')
  })
})
