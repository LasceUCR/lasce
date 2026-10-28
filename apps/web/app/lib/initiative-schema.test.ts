import { describe, expect, test } from 'vitest'
import { initiativeCreateSchema, initiativeUpdateSchema } from './initiative-schema'

const content = {
  es: { title: ' Iniciativa ', description: ' Descripción ' },
  en: { title: ' Initiative ', description: ' Description ' },
}
const version = '2026-10-27T12:00:00.000Z'

describe('initiative validation', () => {
  test('trims bilingual text and stores missing or blank optional fields as null', () => {
    expect(initiativeCreateSchema.parse({ content, logoUrl: ' ' })).toMatchObject({
      content: { es: { title: 'Iniciativa', description: 'Descripción' } },
      logoUrl: null,
      websiteUrl: null,
    })
  })
  test.each(['es', 'en'] as const)('requires both text fields in %s', (locale) => {
    for (const field of ['title', 'description']) {
      expect(
        initiativeCreateSchema.safeParse({
          content: { ...content, [locale]: { ...content[locale], [field]: ' ' } },
        }).success,
      ).toBe(false)
    }
    expect(
      initiativeCreateSchema.safeParse({ content: { [locale]: content[locale] } }).success,
    ).toBe(false)
  })
  test.each([
    'javascript:alert(1)',
    'data:image/png;base64,test',
    '//example.com',
    'not a URL',
    'https://user:pass@example.com',
    'ftp://example.com',
  ])('rejects unsafe addresses: %s', (value) => {
    for (const field of ['logoUrl', 'websiteUrl']) {
      expect(initiativeCreateSchema.safeParse({ content, [field]: value }).success).toBe(false)
    }
  })
  test('accepts bundled logos and HTTP(S) URLs and rejects traversal', () => {
    expect(
      initiativeCreateSchema.safeParse({
        content,
        logoUrl: '/brand/logo-ISWI.png',
        websiteUrl: 'https://example.com/path?q=1',
      }).success,
    ).toBe(true)
    expect(
      initiativeCreateSchema.safeParse({ content, logoUrl: '/brand/../secret.png' }).success,
    ).toBe(false)
  })
  test('enforces length limits, a version, known fields and meaningful patches', () => {
    expect(
      initiativeCreateSchema.safeParse({
        content: { ...content, es: { ...content.es, title: 'a'.repeat(301) } },
      }).success,
    ).toBe(false)
    expect(
      initiativeCreateSchema.safeParse({
        content: { ...content, en: { ...content.en, description: 'a'.repeat(20001) } },
      }).success,
    ).toBe(false)
    expect(initiativeUpdateSchema.safeParse({ websiteUrl: null }).success).toBe(false)
    expect(initiativeUpdateSchema.safeParse({ version }).success).toBe(false)
    expect(
      initiativeUpdateSchema.safeParse({ version, websiteUrl: '', unexpected: true }).success,
    ).toBe(false)
    expect(
      initiativeUpdateSchema.safeParse({ version, websiteUrl: '', confirmedUnchanged: [] }).success,
    ).toBe(false)
    expect(initiativeUpdateSchema.parse({ version, websiteUrl: '' })).toEqual({
      version,
      websiteUrl: null,
    })
  })
})
