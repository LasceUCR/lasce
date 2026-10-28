import { beforeEach, describe, expect, test, vi } from 'vitest'

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))
vi.mock('@lasce/db', () => ({ prisma: { initiative: { findMany } } }))
import { getInitiativeRecords } from './initiative-records'

const version = '2026-10-27T12:00:00.000Z'
const record = {
  id: 'initiative',
  title: 'Título',
  description: 'Uno.\n\nDos.',
  websiteUrl: 'https://example.com',
  logoUrl: '/brand/logo-ISWI.png',
  updatedAt: new Date(version),
  translations: [{ locale: 'en', title: 'Title', description: 'One.\n\nTwo.' }],
}
beforeEach(() => {
  findMany.mockReset()
  findMany.mockResolvedValue([record])
})

describe('initiative reads', () => {
  test('resolves each language, paragraphs and shared fields without disclosing editing data', async () => {
    expect(await getInitiativeRecords()).toEqual([
      expect.objectContaining({
        title: 'Título',
        paragraphs: ['Uno.', 'Dos.'],
        contentLocale: 'es',
      }),
    ])
    const english = (await getInitiativeRecords('en'))[0]!
    expect(english).toMatchObject({
      title: 'Title',
      paragraphs: ['One.', 'Two.'],
      href: record.websiteUrl,
      logo: { src: record.logoUrl, alt: 'Title' },
      contentLocale: 'en',
    })
    expect(english).not.toHaveProperty('editing')
    expect(
      (await getInitiativeRecords('en', { includeEditingData: true }))[0]!.editing,
    ).toMatchObject({
      version,
      isLegacy: false,
      content: { es: { title: 'Título' }, en: { title: 'Title' } },
    })
  })
  test('preserves the original language and missing optional fields on legacy records', async () => {
    findMany.mockResolvedValue([{ ...record, translations: [], logoUrl: null, websiteUrl: null }])
    const legacy = (await getInitiativeRecords('en'))[0]!
    expect(legacy).toMatchObject({ title: 'Título', contentLocale: null })
    expect(legacy.logo).toBeUndefined()
    expect(legacy.href).toBeUndefined()
  })
  test('returns an empty list after deletion and propagates database failures without reviving fixtures', async () => {
    findMany.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('unavailable'))
    expect(await getInitiativeRecords()).toEqual([])
    await expect(getInitiativeRecords()).rejects.toThrow('unavailable')
  })
})
