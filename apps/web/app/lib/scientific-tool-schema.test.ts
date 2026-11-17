import { describe, expect, test } from 'vitest'

import { issuesOf } from './cms/http'
import { scientificToolCreateSchema, scientificToolUpdateSchema } from './scientific-tool-schema'

const content = {
  es: { description: 'Análisis de eventos solares.' },
  en: { description: 'Analysis of solar events.' },
}
const valid = { name: 'SWAAT', accessUrl: 'https://swaat.example.com/', content }
const image = '/api/scientific-tools/images/38300000-0000-4000-8000-000000000001.png'
const version = '2026-11-13T12:00:00.000Z'

function pathsOf(input: unknown) {
  const result = scientificToolCreateSchema.safeParse(input)
  return result.success ? [] : issuesOf(result.error).map(({ path }) => path)
}

describe('scientific tool create schema', () => {
  test('accepts a complete tool, trims text and stores a missing image as null', () => {
    expect(
      scientificToolCreateSchema.parse({
        ...valid,
        name: '  SWAAT ',
        accessUrl: ' https://swaat.example.com/ ',
      }),
    ).toEqual({ ...valid, imageUrl: null })
    expect(scientificToolCreateSchema.parse({ ...valid, imageUrl: image }).imageUrl).toBe(image)
    expect(scientificToolCreateSchema.parse({ ...valid, imageUrl: '  ' }).imageUrl).toBeNull()
  })

  test('names the missing description by language', () => {
    expect(pathsOf({ ...valid, content: { es: content.es, en: { description: ' ' } } })).toEqual([
      'content.en.description',
    ])
    expect(pathsOf({ ...valid, content: { es: { description: '' }, en: content.en } })).toEqual([
      'content.es.description',
    ])
  })

  test('requires a name within its limit', () => {
    expect(pathsOf({ ...valid, name: '   ' })).toEqual(['name'])
    expect(pathsOf({ ...valid, name: 'x'.repeat(101) })).toEqual(['name'])
    expect(pathsOf({ ...valid, name: undefined })).toEqual(['name'])
  })

  test.each([
    'http://swaat.example.com/',
    'javascript:alert(1)',
    'https://user:secret@swaat.example.com/',
    'swaat.example.com',
    '',
    `https://example.com/${'a'.repeat(2048)}`,
  ])('rejects the access URL %s', (accessUrl) => {
    expect(pathsOf({ ...valid, accessUrl })).toEqual(['accessUrl'])
  })

  test.each([
    'https://evil.test/image.png',
    '/images/tools/SWAAT-sun.webp',
    '/api/initiatives/logos/38300000-0000-4000-8000-000000000001.png',
    '/api/scientific-tools/images/../secret.png',
  ])('accepts only uploaded images, not %s', (imageUrl) => {
    expect(pathsOf({ ...valid, imageUrl })).toEqual(['imageUrl'])
  })

  test('rejects unknown properties', () => {
    expect(pathsOf({ ...valid, position: 1 })).toEqual(['position'])
  })
})

describe('scientific tool update schema', () => {
  test('accepts a shared-field change with the version', () => {
    expect(
      scientificToolUpdateSchema.parse({ version, accessUrl: 'https://new.example.com' }),
    ).toEqual({ version, accessUrl: 'https://new.example.com' })
    expect(scientificToolUpdateSchema.parse({ version, imageUrl: '' })).toEqual({
      version,
      imageUrl: null,
    })
  })

  test('requires the version and at least one change', () => {
    expect(scientificToolUpdateSchema.safeParse({ name: 'SWAAT' }).success).toBe(false)
    expect(scientificToolUpdateSchema.safeParse({ version }).success).toBe(false)
  })

  test('only accepts translation confirmations together with content', () => {
    const confirmedUnchanged = [{ locale: 'en', field: 'description' }]
    expect(
      scientificToolUpdateSchema.safeParse({ version, name: 'SWAAT', confirmedUnchanged }).success,
    ).toBe(false)
    expect(
      scientificToolUpdateSchema.safeParse({ version, content, confirmedUnchanged }).success,
    ).toBe(true)
  })
})
